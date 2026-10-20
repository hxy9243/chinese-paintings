import { chromium } from "../artworks/qingming/node_modules/playwright/index.mjs";
import fs from "node:fs";
import crypto from "node:crypto";
const out = process.env.REVIEW_DIR ?? "qa/assets-current";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=vulkan",
    "--disable-dev-shm-usage",
  ],
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5180/qingming/?capture=1");
  await page.waitForFunction(() => window.qingmingStudy, { timeout: 120000 });
  const measurements = {};
  for (const [name, target, angle, pitch] of [
    ["overview", [0, 0], 30, 0],
    ["houses", [-1, 10], 30, -12],
    ["tree", [6, 5], 30, -12],
    ["boats", [-14, -5], 30, -12],
  ]) {
    measurements[name] = await page.evaluate(
      ({ target, angle, pitch, zoom }) =>
        window.qingmingStudy.frame(8, { target, angle, pitch, zoom }),
      { target, angle, pitch, zoom: name === "overview" ? 1.25 : 4.5 },
    );
    await page
      .locator(".study-stage")
      .screenshot({ path: out + "/" + name + ".png" });
  }
  // Inspect the exact model factories independently of the scene's camera limit.
  await page.evaluate(async () => {
    const THREE =
      await import("/qingming/node_modules/three/build/three.module.js");
    const assets = await import("/qingming/src/referenceAssets.ts"),
      { hall } = await import("/qingming/src/bridgeStudy.ts");
    document.body.innerHTML = "";
    document.body.style.margin = "0";
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1600, 1000);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0xeee6ca);
    document.body.append(renderer.domElement);
    window.assetFrame = (kind, turn = 0) => {
      const scene = new THREE.Scene();
      let model;
      if (kind === "tree") {
        model = assets.buildReferenceTree("spreading", 6.1, 2, true);
      } else if (kind === "trees") {
        model = new THREE.Group();
        for (const [i, form] of ["spreading", "pollard", "sapling"].entries()) {
          const t = assets.buildReferenceTree(form, 6.1 + i, 2, i === 0);
          t.position.x = (i - 1) * 3;
          model.add(t);
        }
      } else if (kind === "house")
        model = hall(new THREE.Group(), 0, 0, 4, 3, 1.2, 0, "dwelling", true);
      else
        model = assets.buildReferenceBoat(
          5.4,
          1.1,
          kind.startsWith("freight") ? "freight" : "cabin",
          kind.endsWith("-low") ? 0 : 2,
        );
      scene.add(model);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const span = Math.max(size.x / 1.6, size.y, size.z * 0.7) * 1.45,
        camera = new THREE.OrthographicCamera(
          -span * 0.8,
          span * 0.8,
          span * 0.5,
          -span * 0.5,
          0.1,
          100,
        );
      const angle = 0.8 + turn;
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(Math.sin(angle) * 10, 6.5, Math.cos(angle) * 10),
        );
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      let triangles = 0;
      model.traverse((o) => {
        if (o.isMesh) {
          triangles +=
            (o.geometry.index?.count ?? o.geometry.attributes.position.count) /
            3;
        }
      });
      const result = {
        triangles,
        bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      };
      model.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      return result;
    };
  });
  for (const kind of ["tree", "trees", "house", "cabin", "freight", "freight-low"]) {
    measurements[kind + "-isolated"] = await page.evaluate(
      (kind) => window.assetFrame(kind),
      kind,
    );
    await page.screenshot({ path: out + "/" + kind + "-isolated.png" });
  }
  const sources = [
    "referenceAssets.ts",
    "Mock3D.tsx",
    "bridgeStudy.ts",
    "passageLayout.ts",
    "passageLife.ts",
    "paintMaterial.ts",
    "inkFinish.ts",
  ];
  const hashes = Object.fromEntries(
    sources.map((n) => [
      n,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync("artworks/qingming/src/" + n))
        .digest("hex"),
    ]),
  );
  fs.writeFileSync(
    out + "/review.json",
    JSON.stringify({ errors, measurements, sourceHashes: hashes }, null, 2) +
      "\n",
  );
  console.log(JSON.stringify({ out, errors }));
} finally {
  await browser.close();
}
