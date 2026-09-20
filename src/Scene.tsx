import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  ASSETS,
  BY_ID,
  SCENE,
  baseUrl,
  validatePlacement,
  type PlacedObject,
  type Point,
} from "./model";
export interface SceneHandle {
  fit: () => void;
  zoom: (delta: number) => void;
  capture: () => Promise<HTMLCanvasElement>;
}
interface Props {
  objects: PlacedObject[];
  selected: string | null;
  placing: string | null;
  moving: string | null;
  paused: boolean;
  reference: boolean;
  onPoint: (p: Point) => void;
  onSelect: (id: string | null) => void;
  onReady: () => void;
  onError: () => void;
}
interface Walker {
  node: Container;
  body: Graphics;
  legs: Graphics;
  t: number;
  dir: number;
  speed: number;
  pause: number;
  appearance: number;
  age: number;
}
const ink = 0x514a38;
function character(index: number): Walker {
  const node = new Container(),
    body = new Graphics(),
    legs = new Graphics();
  const robe = [0x738076, 0x9a8066, 0x72747b][index % 3];
  body
    .poly([-4, -15, 3, -15, 5, -4, -5, -4])
    .fill({ color: robe, alpha: 0.95 })
    .stroke({ color: ink, width: 0.65 });
  body.circle(0, -19, 2.9).fill(0xc4aa80).stroke({ color: ink, width: 0.65 });
  body.ellipse(-0.3, -21, 3.5, 1.3).fill(ink);
  body
    .moveTo(-4, -14)
    .lineTo(-6, -8)
    .moveTo(3, -13)
    .lineTo(6, -8)
    .stroke({ color: ink, width: 0.85 });
  node.addChild(legs, body);
  return {
    node,
    body,
    legs,
    t: index * 0.13,
    dir: index % 2 ? 1 : -1,
    speed: 19 + index * 1.7,
    pause: 0,
    appearance: index % 3,
    age: 0,
  };
}
export const ROUTE = [
  ...SCENE.reservedPaths[0],
  ...SCENE.bridgeRoute.slice(1),
  ...SCENE.reservedPaths[1].slice(1),
];
const lengths = ROUTE.slice(1).map((p, i) =>
  Math.hypot(p.x - ROUTE[i].x, p.y - ROUTE[i].y),
);
const total = lengths.reduce((a, b) => a + b, 0);
export function routePoint(t: number): Point {
  let distance = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) {
      const f = distance / lengths[i];
      return {
        x: ROUTE[i].x + (ROUTE[i + 1].x - ROUTE[i].x) * f,
        y: ROUTE[i].y + (ROUTE[i + 1].y - ROUTE[i].y) * f,
      };
    }
    distance -= lengths[i];
  }
  return ROUTE.at(-1)!;
}
export default forwardRef<SceneHandle, Props>(function Scene(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const controller = useRef<SceneHandle | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      fit: () => controller.current?.fit(),
      zoom: (d) => controller.current?.zoom(d),
      capture: async () => {
        if (!controller.current) throw new Error("Not ready");
        return controller.current.capture();
      },
    }),
    [],
  );
  useEffect(() => {
    const element = host.current!;
    const app = new Application();
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let cleanup = () => {};
    (async () => {
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(devicePixelRatio, 2),
        autoDensity: true,
        resizeTo: element,
        preference: "webgl",
        preserveDrawingBuffer: true,
      });
      if (disposed) {
        if (!app.stage?.destroyed) app.destroy(true);
        return;
      }
      element.appendChild(app.canvas);
      const textureList = await Promise.all(
        [SCENE.background, ...ASSETS.map((a) => a.texture)].map((p) =>
          Assets.load<Texture>(baseUrl(p)),
        ),
      );
      if (disposed) {
        if (!app.stage?.destroyed) app.destroy(true);
        return;
      }
      const world = new Container();
      world.sortableChildren = true;
      app.stage.addChild(world);
      const bg = new Sprite(textureList[0]);
      bg.width = SCENE.width;
      bg.height = SCENE.height;
      world.addChild(bg);
      const items = new Container();
      items.sortableChildren = true;
      items.zIndex = 1;
      world.addChild(items);
      const bridgePeople = new Container();
      bridgePeople.zIndex = 2;
      world.addChild(bridgePeople);
      // A second copy of the painting reveals the foreground rail over bridge walkers.
      const rail = new Sprite(textureList[0]);
      rail.width = 1600;
      rail.height = 800;
      rail.zIndex = 3;
      const railMask = new Graphics();
      railMask
        .poly([
          804, 552, 842, 468, 901, 378, 977, 294, 1050, 249, 1119, 224, 1190,
          223, 1258, 243, 1286, 225, 1292, 240, 1261, 259, 1187, 239, 1118, 240,
          1057, 267, 990, 311, 916, 391, 856, 480, 818, 565,
        ])
        .fill(0xffffff);
      rail.mask = railMask;
      world.addChild(rail, railMask);
      const markers = new Graphics();
      markers.zIndex = 4;
      world.addChild(markers);
      const ghost = new Sprite();
      ghost.zIndex = 5;
      ghost.alpha = 0.7;
      ghost.visible = false;
      world.addChild(ghost);
      const hints = new Graphics();
      hints.zIndex = 0.5;
      world.addChild(hints);
      const textures = Object.fromEntries(
        ASSETS.map((a, i) => [a.id, textureList[i + 1]]),
      );
      const objectNodes = new Map<string, Sprite>();
      const walkers: Walker[] = [];
      let prevObjects: PlacedObject[] | null = null,
        previousSelected: string | null = null,
        previousPlace: string | null = null;
      let pointer: Point | null = null,
        scale = 1,
        minScale = 1,
        elapsed = 0,
        spawnTime = 0;
      const clampCamera = () => {
        const w = element.clientWidth,
          h = element.clientHeight;
        world.x =
          1600 * scale < w
            ? (w - 1600 * scale) / 2
            : Math.max(w - 1600 * scale, Math.min(0, world.x));
        world.y =
          800 * scale < h
            ? (h - 800 * scale) / 2
            : Math.max(h - 800 * scale, Math.min(0, world.y));
      };
      const fit = () => {
        minScale = Math.min(
          element.clientWidth / 1600,
          element.clientHeight / 800,
        );
        scale = minScale;
        world.scale.set(scale);
        world.position.set(
          (element.clientWidth - 1600 * scale) / 2,
          (element.clientHeight - 800 * scale) / 2,
        );
      };
      const zoomAt = (
        factor: number,
        cx = element.clientWidth / 2,
        cy = element.clientHeight / 2,
      ) => {
        const old = scale;
        scale = Math.max(minScale, Math.min(minScale * 3.5, scale * factor));
        world.x = cx - ((cx - world.x) * scale) / old;
        world.y = cy - ((cy - world.y) * scale) / old;
        world.scale.set(scale);
        clampCamera();
      };
      controller.current = {
        fit,
        zoom: (d) => zoomAt(d > 0 ? 1.2 : 1 / 1.2),
        capture: async () => {
          const oldPos = { x: world.x, y: world.y },
            oldScale = scale;
          const states = [markers.visible, ghost.visible, hints.visible];
          markers.visible = ghost.visible = hints.visible = false;
          world.position.set(0, 0);
          world.scale.set(1);
          try {
            return app.renderer.extract.canvas({
              target: world,
              resolution: 1,
            }) as HTMLCanvasElement;
          } finally {
            world.position.set(oldPos.x, oldPos.y);
            world.scale.set(oldScale);
            [markers.visible, ghost.visible, hints.visible] = states;
          }
        },
      };
      const frameForViewport = () => {
        fit();
        if (element.clientWidth < 600) {
          zoomAt(element.clientHeight / (800 * minScale));
          world.x = element.clientWidth / 2 - 950 * scale;
          clampCamera();
        }
      };
      frameForViewport();
      observer = new ResizeObserver(frameForViewport);
      observer.observe(element);
      const position = (e: PointerEvent): Point => {
        const r = app.canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const toWorld = (p: Point) => ({
        x: (p.x - world.x) / scale,
        y: (p.y - world.y) / scale,
      });
      const points = new Map<number, Point>();
      let down: Point | null = null,
        last: Point | null = null,
        dragged = false,
        pinchDist = 0,
        pinchCenter: Point | null = null;
      const onDown = (e: PointerEvent) => {
        const p = position(e);
        points.set(e.pointerId, p);
        app.canvas.setPointerCapture(e.pointerId);
        down = p;
        last = p;
        dragged = false;
        if (points.size === 2) {
          const [a, b] = [...points.values()];
          pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          pinchCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          dragged = true;
        }
      };
      const onMove = (e: PointerEvent) => {
        const p = position(e);
        pointer = toWorld(p);
        if (!points.has(e.pointerId)) return;
        points.set(e.pointerId, p);
        if (points.size === 2) {
          const [a, b] = [...points.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          if (pinchDist) zoomAt(d / pinchDist, c.x, c.y);
          if (pinchCenter) {
            world.x += c.x - pinchCenter.x;
            world.y += c.y - pinchCenter.y;
            clampCamera();
          }
          pinchDist = d;
          pinchCenter = c;
          dragged = true;
          return;
        }
        if (down && Math.hypot(p.x - down.x, p.y - down.y) > 7) dragged = true;
        if (dragged && last) {
          world.x += p.x - last.x;
          world.y += p.y - last.y;
          clampCamera();
        }
        last = p;
      };
      const onUp = (e: PointerEvent) => {
        const p = toWorld(position(e));
        const wasMulti = points.size > 1;
        points.delete(e.pointerId);
        if (!dragged && !wasMulti) {
          const current = live.current;
          if (!current.reference) {
            if (current.placing || current.moving) current.onPoint(p);
            else {
              const hit = [...current.objects]
                .sort((a, b) => b.y - a.y)
                .find((o) => {
                  const a = BY_ID[o.assetId];
                  return (
                    p.x > o.x - a.width * 0.46 &&
                    p.x < o.x + a.width * 0.46 &&
                    p.y > o.y - a.height * 0.88 &&
                    p.y < o.y + a.height * 0.08
                  );
                });
              current.onSelect(hit?.id ?? null);
            }
          }
        }
        down = null;
        last = null;
        if (wasMulti) dragged = true;
      };
      const onCancel = (e: PointerEvent) => {
        points.delete(e.pointerId);
        down = last = null;
        dragged = true;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const r = app.canvas.getBoundingClientRect();
        zoomAt(
          Math.exp(-e.deltaY * 0.002),
          e.clientX - r.left,
          e.clientY - r.top,
        );
      };
      app.canvas.addEventListener("pointerdown", onDown);
      app.canvas.addEventListener("pointermove", onMove);
      app.canvas.addEventListener("pointerup", onUp);
      app.canvas.addEventListener("pointercancel", onCancel);
      app.canvas.addEventListener("wheel", onWheel, { passive: false });
      cleanup = () => {
        app.canvas.removeEventListener("pointerdown", onDown);
        app.canvas.removeEventListener("pointermove", onMove);
        app.canvas.removeEventListener("pointerup", onUp);
        app.canvas.removeEventListener("pointercancel", onCancel);
        app.canvas.removeEventListener("wheel", onWheel);
      };
      app.ticker.maxFPS = 45;
      app.ticker.add((ticker) => {
        const p = live.current,
          dt = Math.min(ticker.deltaMS / 1000, 0.05);
        elapsed += dt;
        const objectsChanged = prevObjects !== p.objects;
        if (objectsChanged) {
          for (const [id, node] of objectNodes) {
            if (!p.objects.some((o) => o.id === id)) {
              node.destroy();
              objectNodes.delete(id);
            }
          }
          for (const o of p.objects) {
            let s = objectNodes.get(o.id);
            const a = BY_ID[o.assetId];
            if (!s) {
              s = new Sprite(textures[a.id]);
              items.addChild(s);
              objectNodes.set(o.id, s);
            }
            s.texture = textures[a.id];
            s.blendMode = a.id === "shop" ? "normal" : "multiply";
            s.width = a.width;
            s.height = a.height;
            s.anchor.set(a.anchor.x, a.anchor.y);
            s.position.set(o.x, o.y);
            s.zIndex = o.y;
          }
          prevObjects = p.objects;
        }
        if (
          p.selected !== previousSelected ||
          p.placing !== previousPlace ||
          objectsChanged
        ) {
          markers.clear();
          const o = p.objects.find((o) => o.id === p.selected);
          if (o) {
            const a = BY_ID[o.assetId];
            markers
              .ellipse(
                o.x,
                o.y,
                a.footprint.width / 2 + 8,
                a.footprint.height / 2 + 8,
              )
              .stroke({ color: 0x8d4535, width: 2 });
          }
          previousSelected = p.selected;
          previousPlace = p.placing;
        }
        const movingObject = p.objects.find((o) => o.id === p.moving);
        const assetId = p.placing || movingObject?.assetId;
        ghost.visible = Boolean(assetId && pointer && !p.reference);
        hints.clear();
        if (assetId && !p.reference) {
          const water = BY_ID[assetId].surface === "water";
          const spots = water
            ? [
                { x: 430, y: 380 },
                { x: 1300, y: 450 },
              ]
            : [
                { x: 285, y: 620 },
                { x: 610, y: 765 },
                { x: 155, y: 110 },
              ];
          for (const spot of spots)
            hints
              .ellipse(spot.x, spot.y, 38, 15)
              .stroke({ color: 0x7b7b58, alpha: 0.5, width: 1.3 });
        }
        if (assetId && pointer) {
          const a = BY_ID[assetId];
          ghost.texture = textures[a.id];
          ghost.blendMode = a.id === "shop" ? "normal" : "multiply";
          ghost.width = a.width;
          ghost.height = a.height;
          ghost.anchor.set(a.anchor.x, a.anchor.y);
          ghost.position.set(pointer.x, pointer.y);
          ghost.tint = validatePlacement(
            a.id,
            pointer,
            p.objects,
            p.moving ?? undefined,
          )
            ? 0xc28776
            : 0xffffff;
        }
        const desired = p.reference
          ? 0
          : Math.min(
              8,
              p.objects.some((o) => BY_ID[o.assetId].category === "buildings")
                ? 2 + p.objects.length
                : 0,
            );
        spawnTime += dt;
        if (walkers.length < desired && spawnTime > 1.3) {
          const w = character(walkers.length);
          w.t = walkers.length === 0 ? 0.08 : walkers.length === 1 ? 0.58 : 0;
          items.addChild(w.node);
          walkers.push(w);
          spawnTime = 0;
        }
        while (walkers.length > desired)
          walkers.pop()!.node.destroy({ children: true });
        walkers.forEach((w, i) => {
          const pt = routePoint(w.t);
          if (!p.paused && !document.hidden) {
            const nearStand = p.objects.some(
              (o) =>
                BY_ID[o.assetId].interactionPoint &&
                Math.hypot(o.x - pt.x, o.y - pt.y) < 82,
            );
            w.age += dt;
            if (w.pause > 0)
              w.pause = nearStand ? Math.max(0, w.pause - dt) : 0;
            else if (nearStand && Math.sin(elapsed * 0.6 + i) > 0.9995)
              w.pause = 1.5 + (i % 3);
            else w.t += (w.dir * w.speed * dt) / total;
            if (w.t > 1) {
              w.t = 1;
              w.dir = -1;
            }
            if (w.t < 0) {
              w.t = 0;
              w.dir = 1;
            }
          }
          const point = routePoint(w.t),
            onBridge =
              point.x > SCENE.bridgeRoute[0].x &&
              point.x < SCENE.bridgeRoute.at(-1)!.x;
          const parent = onBridge ? bridgePeople : items;
          if (w.node.parent !== parent) parent.addChild(w.node);
          w.node.position.set(point.x, point.y);
          w.node.zIndex = point.y;
          w.node.alpha = Math.min(1, w.age / 0.8, w.t * 35, (1 - w.t) * 35);
          const stride =
            !p.paused && w.pause <= 0 ? Math.sin(elapsed * 7 + i) * 2 : 0;
          w.body.y = Math.abs(stride) * -0.25;
          w.legs
            .clear()
            .moveTo(-2, -5)
            .lineTo(-2 + stride, 0)
            .moveTo(2, -5)
            .lineTo(2 - stride, 0)
            .stroke({ color: ink, width: 1.2 });
        });
      });
      live.current.onReady();
    })().catch((e) => {
      console.error("Scene initialization failed", e);
      live.current.onError();
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      controller.current = null;
      cleanup();
      if (app.renderer && !app.stage.destroyed)
        app.destroy(true, { children: true, texture: false });
    };
  }, []);
  return (
    <div
      className="scene-canvas"
      ref={host}
      role="img"
      aria-label="Interactive painted scene around Rainbow Bridge"
    />
  );
});
