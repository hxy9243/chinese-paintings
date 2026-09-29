import { describe, it, expect } from "vitest";
import {
  EMPTY,
  createStartingDocument,
  SCENE,
  ASSETS,
  parseDocument,
  validatePlacement,
  tutorialStep,
  loadDocument,
  advanceHistory,
} from "../src/model";
describe("placement protects the painting", () => {
  it("accepts every reference object in combination", () => {
    const placed = [];
    for (const o of SCENE.referenceArrangement) {
      expect(validatePlacement(o.assetId, o, placed), o.id).toBeNull();
      placed.push(o);
    }
  });
  it("keeps boats in the river and houses out of it", () => {
    expect(validatePlacement("shop", { x: 400, y: 350 }, [])).toBe("surface");
    expect(validatePlacement("skiff", { x: 300, y: 610 }, [])).toBe("surface");
    expect(validatePlacement("skiff", { x: 400, y: 350 }, [])).toBeNull();
  });
  it("rejects routes, object collisions, out of bounds, and the element limit", () => {
    expect(validatePlacement("table", { x: 270, y: 677 }, [])).toBe("path");
    expect(
      validatePlacement("shop", { x: 260, y: 610 }, [
        SCENE.referenceArrangement[0],
      ]),
    ).toBe("collision");
    expect(validatePlacement("shop", { x: 5, y: 650 }, [])).toBe("bounds");
    expect(
      validatePlacement(
        "table",
        { x: 400, y: 620 },
        Array.from({ length: 40 }, () => SCENE.referenceArrangement[0]),
      ),
    ).toBe("limit");
  });
  it("allows moving an object without colliding with itself", () => {
    const o = SCENE.referenceArrangement[0];
    expect(validatePlacement(o.assetId, o, [o], o.id)).toBeNull();
  });
  it("checks sloping banks against the entire footprint", () => {
    expect(validatePlacement("cargo", { x: 400, y: 480 }, [])).toBe("surface");
    expect(validatePlacement("bare-tree", { x: 1450, y: 690 }, [])).toBe(
      "surface",
    );
  });
});
describe("durable scenes", () => {
  it("starts with editable houses on both banks and round trips them", () => {
    const doc = loadDocument({ getItem: () => null }).doc;
    expect(
      doc.objects.filter((o) => o.assetId === "house").length,
    ).toBeGreaterThanOrEqual(3);
    expect(parseDocument(JSON.stringify(doc))).toEqual(doc);
    const next = createStartingDocument();
    doc.objects.pop();
    expect(next.objects).toHaveLength(5);
  });
  it("preserves saved empty scenes and existing player compositions", () => {
    for (const doc of [
      EMPTY,
      { ...EMPTY, objects: SCENE.referenceArrangement },
    ]) {
      expect(loadDocument({ getItem: () => JSON.stringify(doc) })).toEqual({
        doc,
        error: false,
      });
    }
  });
  it("round trips the authored composition", () => {
    const d = { ...EMPTY, objects: SCENE.referenceArrangement };
    expect(parseDocument(JSON.stringify(d))).toEqual(d);
  });
  it("rejects corrupt, duplicate, unknown, nonfinite and future-version content", () => {
    for (const raw of [
      "broken",
      JSON.stringify({ ...EMPTY, version: 2 }),
      JSON.stringify({
        ...EMPTY,
        objects: [{ id: "a", assetId: "unknown", x: 100, y: 100 }],
      }),
      JSON.stringify({
        ...EMPTY,
        objects: [SCENE.referenceArrangement[0], SCENE.referenceArrangement[0]],
      }),
      JSON.stringify({
        ...EMPTY,
        objects: [{ ...SCENE.referenceArrangement[0], x: null }],
      }),
    ])
      expect(() => parseDocument(raw)).toThrow();
  });
  it("does not mutate inaccessible or corrupt storage", () => {
    expect(loadDocument({ getItem: () => "{broken" })).toEqual({
      doc: EMPTY,
      error: true,
    });
    expect(
      loadDocument({
        getItem: () => {
          throw Error("blocked");
        },
      }).error,
    ).toBe(true);
  });
  it("advances the tutorial only when all categories are present", () => {
    expect(tutorialStep(EMPTY)).toBe(0);
    expect(
      tutorialStep({ ...EMPTY, objects: [SCENE.referenceArrangement[0]] }),
    ).toBe(1);
    expect(
      tutorialStep({
        ...EMPTY,
        objects: [SCENE.referenceArrangement[0], SCENE.referenceArrangement[6]],
      }),
    ).toBe(2);
    expect(
      tutorialStep({ ...EMPTY, objects: SCENE.referenceArrangement }),
    ).toBe(3);
  });
  it("records undoable independent snapshots", () => {
    const next = { ...EMPTY, objects: [SCENE.referenceArrangement[0]] };
    const h = advanceHistory([], EMPTY, next);
    expect(h.past[0].objects).toHaveLength(0);
    expect(h.current.objects).toHaveLength(1);
    expect(h.future).toEqual([]);
    expect(ASSETS).toHaveLength(8);
  });
});
