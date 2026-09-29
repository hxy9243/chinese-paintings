export type Language = "en" | "zh";
export type Category = "buildings" | "trees" | "boats" | "stands";
export type Point = { x: number; y: number };
export interface AssetDefinition {
  id: string;
  category: Category;
  name: Record<Language, string>;
  texture: string;
  width: number;
  height: number;
  anchor: Point;
  footprint: { width: number; height: number };
  surface: "land" | "water";
  sourceDetail: Record<Language, string>;
  interactionPoint?: Point;
}
const asset = (
  id: string,
  category: Category,
  en: string,
  zh: string,
  width: number,
  height: number,
  fw: number,
  fh: number,
  detail: string,
  detailZh: string,
): AssetDefinition => ({
  id,
  category,
  name: { en, zh },
  texture: `art/${id}.webp`,
  width,
  height,
  anchor: {
    x: category === "trees" ? 0.27 : 0.5,
    y: category === "boats" ? 0.82 : 0.94,
  },
  footprint: { width: fw, height: fh },
  surface: category === "boats" ? "water" : "land",
  sourceDetail: { en: detail, zh: detailZh },
  ...(category === "stands" || category === "buildings"
    ? { interactionPoint: { x: 0, y: 12 } }
    : {}),
});
export const ASSETS: AssetDefinition[] = [
  asset(
    "shop",
    "buildings",
    "Riverside shop",
    "临河铺子",
    170,
    113,
    110,
    42,
    "Open-front timber shops beside the bridge approach.",
    "取意于桥头临街的木构铺面。",
  ),
  asset(
    "house",
    "buildings",
    "Tiled dwelling",
    "瓦舍",
    166,
    111,
    108,
    45,
    "Low tiled roofs and exposed timber in the foreground.",
    "取意于前景的低矮瓦顶与木构民居。",
  ),
  asset(
    "bare-tree",
    "trees",
    "Old river tree",
    "疏枝古木",
    150,
    137,
    25,
    18,
    "Fine, sparse branches along the riverbanks.",
    "取意于河岸细密疏朗的枝条。",
  ),
  asset(
    "leaf-tree",
    "trees",
    "Spring branches",
    "新绿疏林",
    155,
    133,
    28,
    20,
    "A lightly leafed variation of the bank-side tree form.",
    "河岸树形的淡叶变体，并非独立树种考证。",
  ),
  asset(
    "skiff",
    "boats",
    "River skiff",
    "小舟",
    172,
    87,
    111,
    27,
    "Low open hulls alongside larger river vessels.",
    "取意于大船旁的低矮敞口舟身。",
  ),
  asset(
    "cargo",
    "boats",
    "Covered boat",
    "篷船",
    226,
    109,
    151,
    38,
    "Arched woven covers on working boats near the bridge.",
    "取意于桥旁船只的拱形编织船篷。",
  ),
  asset(
    "table",
    "stands",
    "Market table",
    "货摊",
    66,
    44,
    58,
    24,
    "Goods and baskets displayed along the bridge approach.",
    "取意于桥头陈列货物、竹筐的摊位。",
  ),
  asset(
    "canopy",
    "stands",
    "Cloth canopy",
    "布棚",
    92,
    61,
    78,
    32,
    "Simple cloth awnings and roadside vendor shelters.",
    "取意于路旁商贩的简朴布棚。",
  ),
];
export const BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a]));
export interface PlacedObject extends Point {
  id: string;
  assetId: string;
}
export interface SceneDocument {
  version: 1;
  objects: PlacedObject[];
  tutorialSkipped: boolean;
}
export interface SceneDefinition {
  width: number;
  height: number;
  background: string;
  source: string;
  river: { farBank: Point[]; nearBank: Point[] };
  reservedPaths: Point[][];
  bridgeRoute: Point[];
  referenceArrangement: PlacedObject[];
}
export const SCENE: SceneDefinition = {
  width: 1600,
  height: 800,
  background: "art/landscape.webp",
  source: "reference/rainbow-bridge.jpg",
  river: {
    farBank: [
      { x: 0, y: 145 },
      { x: 500, y: 178 },
      { x: 920, y: 205 },
      { x: 1300, y: 270 },
      { x: 1600, y: 225 },
    ],
    nearBank: [
      { x: 0, y: 410 },
      { x: 400, y: 483 },
      { x: 680, y: 527 },
      { x: 760, y: 560 },
      { x: 1000, y: 625 },
      { x: 1300, y: 685 },
      { x: 1600, y: 725 },
    ],
  },
  reservedPaths: [
    [
      { x: 0, y: 640 },
      { x: 270, y: 677 },
      { x: 495, y: 705 },
      { x: 650, y: 635 },
      { x: 750, y: 550 },
    ],
    [
      { x: 1295, y: 210 },
      { x: 1380, y: 173 },
      { x: 1450, y: 122 },
      { x: 1600, y: 65 },
    ],
  ],
  bridgeRoute: [
    { x: 750, y: 550 },
    { x: 803, y: 437 },
    { x: 870, y: 342 },
    { x: 946, y: 264 },
    { x: 1025, y: 210 },
    { x: 1100, y: 184 },
    { x: 1170, y: 179 },
    { x: 1235, y: 195 },
    { x: 1295, y: 210 },
  ],
  referenceArrangement: [
    { id: "ref-1", assetId: "shop", x: 260, y: 610 },
    { id: "ref-2", assetId: "house", x: 650, y: 756 },
    { id: "ref-3", assetId: "bare-tree", x: 150, y: 115 },
    { id: "ref-4", assetId: "leaf-tree", x: 1450, y: 758 },
    { id: "ref-5", assetId: "skiff", x: 420, y: 395 },
    { id: "ref-6", assetId: "cargo", x: 1290, y: 448 },
    { id: "ref-7", assetId: "table", x: 495, y: 765 },
    { id: "ref-8", assetId: "canopy", x: 585, y: 582 },
  ],
};
export const EMPTY: SceneDocument = {
  version: 1,
  objects: [],
  tutorialSkipped: false,
};
// A new game begins with an editable riverfront, while an explicitly saved
// empty composition remains empty. Create fresh objects for every load.
export function createStartingDocument(): SceneDocument {
  return {
    version: 1,
    tutorialSkipped: false,
    objects: [
      { id: "start-house-west", assetId: "house", x: 350, y: 110 },
      { id: "start-shop-far", assetId: "shop", x: 560, y: 125 },
      { id: "start-house-far", assetId: "house", x: 790, y: 140 },
      { id: "start-shop-near", assetId: "shop", x: 260, y: 610 },
      { id: "start-house-near", assetId: "house", x: 650, y: 756 },
    ],
  };
}
export const STORAGE_KEY = "qingming-scene-v1";
export function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = dx * dx + dy * dy;
  const t = len
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len))
    : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function pathDistance(p: Point, path: Point[]): number {
  return Math.min(
    ...path.slice(1).map((b, i) => pointSegmentDistance(p, path[i], b)),
  );
}
export function bankY(x: number, points: Point[]): number {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    if (x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return points.at(-1)!.y;
}
export type PlacementError =
  "bounds" | "surface" | "path" | "collision" | "limit";
export function validatePlacement(
  assetId: string,
  p: Point,
  objects: PlacedObject[],
  ignoreId?: string,
): PlacementError | null {
  const a = BY_ID[assetId];
  if (!a) return "bounds";
  const hw = a.footprint.width / 2,
    hh = a.footprint.height / 2;
  if (p.x - hw < 15 || p.x + hw > 1585 || p.y - hh < 60 || p.y + hh > 785)
    return "bounds";
  if (!ignoreId && objects.length >= 40) return "limit";
  const corners = [
    { x: p.x - hw, y: p.y - hh },
    { x: p.x + hw, y: p.y - hh },
    { x: p.x - hw, y: p.y + hh },
    { x: p.x + hw, y: p.y + hh },
  ];
  const onWater = corners.every(
    (q) =>
      q.y > bankY(q.x, SCENE.river.farBank) + 12 &&
      q.y < bankY(q.x, SCENE.river.nearBank) - 12,
  );
  const onLand =
    corners.every((q) => q.y < bankY(q.x, SCENE.river.farBank) - 10) ||
    corners.every((q) => q.y > bankY(q.x, SCENE.river.nearBank) + 12);
  if (a.surface === "water" ? !onWater : !onLand) return "surface";
  // Sample the footprint edges too, so a large building cannot cover a route with its corner.
  const sample = [
    p,
    { x: p.x - hw, y: p.y - hh },
    { x: p.x + hw, y: p.y - hh },
    { x: p.x - hw, y: p.y + hh },
    { x: p.x + hw, y: p.y + hh },
  ];
  if (
    sample.some((q) =>
      [...SCENE.reservedPaths, SCENE.bridgeRoute].some(
        (path) => pathDistance(q, path) < 33,
      ),
    )
  )
    return "path";
  if (
    objects.some(
      (o) =>
        o.id !== ignoreId &&
        Math.abs(o.x - p.x) <
          (BY_ID[o.assetId].footprint.width + a.footprint.width) / 2 + 8 &&
        Math.abs(o.y - p.y) <
          (BY_ID[o.assetId].footprint.height + a.footprint.height) / 2 + 7,
    )
  )
    return "collision";
  return null;
}
export function tutorialStep(doc: SceneDocument): number {
  const has = (c: Category) =>
    doc.objects.some((o) => BY_ID[o.assetId].category === c);
  if (!has("buildings")) return 0;
  if (!has("stands")) return 1;
  if (!has("boats") || !has("trees")) return 2;
  return 3;
}
export function parseDocument(raw: string): SceneDocument {
  const d = JSON.parse(raw);
  if (
    d?.version !== 1 ||
    !Array.isArray(d.objects) ||
    d.objects.length > 40 ||
    typeof d.tutorialSkipped !== "boolean"
  )
    throw new Error("Invalid scene");
  const ids = new Set<string>();
  const accepted: PlacedObject[] = [];
  for (const o of d.objects) {
    if (
      !o ||
      typeof o.id !== "string" ||
      ids.has(o.id) ||
      !BY_ID[o.assetId] ||
      !Number.isFinite(o.x) ||
      !Number.isFinite(o.y) ||
      validatePlacement(o.assetId, o, accepted)
    )
      throw new Error("Invalid object");
    ids.add(o.id);
    accepted.push({ id: o.id, assetId: o.assetId, x: o.x, y: o.y });
  }
  return { version: 1, objects: accepted, tutorialSkipped: d.tutorialSkipped };
}
export function loadDocument(storage: Pick<Storage, "getItem">): {
  doc: SceneDocument;
  error: boolean;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return {
      doc: raw ? parseDocument(raw) : createStartingDocument(),
      error: false,
    };
  } catch {
    return { doc: EMPTY, error: true };
  }
}
export function advanceHistory(
  past: SceneDocument[],
  current: SceneDocument,
  next: SceneDocument,
) {
  return {
    past: [...past.slice(-49), current],
    current: next,
    future: [] as SceneDocument[],
  };
}
export const baseUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
