import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  ArrowLeft,
  Minus,
  Plus,
  RotateCcw,
  Move,
  LockKeyhole,
} from "lucide-react";
import {
  createBridgeStudy,
  ELEVATION,
  TILT_LIMIT,
  VIEW_ANGLE,
} from "./bridgeStudy";
import "./mock3d.css";
import { createInkFinish } from "./inkFinish";

type StudyApi = {
  view: (angle: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  painting: (enabled: boolean) => void;
  softness: (amount: number) => void;
};
export default function Mock3D() {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<StudyApi | null>(null);
  const [lang, setLang] = useState<"en" | "zh">("en"),
    [angle, setAngle] = useState(0),
    [painted, setPainted] = useState(true),
    [softness, setSoftness] = useState(70),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  const t = (en: string, zh: string) => (lang === "en" ? en : zh);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const finish = createInkFinish(renderer);
    let paintingEnabled = true,
      inkSoftness = 0.7;
    renderer.domElement.setAttribute(
      "aria-label",
      "Rainbow Bridge constrained 3D study",
    );
    renderer.domElement.setAttribute("role", "img");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff8e5, 0x888c79, 2.4));
    const sunlight = new THREE.DirectionalLight(0xfff0d3, 2);
    sunlight.position.set(-5, 12, 8);
    scene.add(sunlight);
    const study = createBridgeStudy();
    scene.add(study.group);
    study.setPainting(true);
    const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.minAzimuthAngle =
      VIEW_ANGLE - THREE.MathUtils.degToRad(TILT_LIMIT);
    controls.maxAzimuthAngle =
      VIEW_ANGLE + THREE.MathUtils.degToRad(TILT_LIMIT);
    controls.minPolarAngle = ELEVATION;
    controls.maxPolarAngle = ELEVATION;
    controls.rotateSpeed = 0.45;
    controls.addEventListener("change", () =>
      setAngle(
        Math.round(
          THREE.MathUtils.radToDeg(controls.getAzimuthalAngle() - VIEW_ANGLE),
        ),
      ),
    );
    controls.enableDamping = false;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;
    controls.minZoom = 0.65;
    controls.maxZoom = 2.5;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.target.set(0, 0.5, 0);
    const position = (degrees: number) => {
      const azimuth =
        VIEW_ANGLE +
        THREE.MathUtils.degToRad(
          Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, degrees)),
        );
      const offset = new THREE.Vector3().setFromSphericalCoords(
        25,
        ELEVATION,
        azimuth,
      );
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      controls.update();
    };
    position(0);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      finish.resize(w, h);
      const aspect = w / h;
      const span = Math.max(8.8, 11.4 / aspect);
      camera.left = -span * aspect;
      camera.right = span * aspect;
      camera.top = span;
      camera.bottom = -span;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    api.current = {
      view: position,
      painting(enabled) {
        paintingEnabled = enabled;
        study.setPainting(enabled);
      },
      softness(amount) {
        inkSoftness = Math.max(0, Math.min(1, amount));
      },
      zoom(factor) {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.65, 2.5);
        camera.updateProjectionMatrix();
      },
      reset() {
        controls.target.set(0, 0.5, 0);
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        position(0);
      },
    };
    const clock = new THREE.Clock();
    let frame = 0,
      last = 0;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (document.hidden || now - last < 32) return;
      last = now;
      controls.update();
      study.update(clock.getElapsedTime());
      finish.render(scene, camera, paintingEnabled ? inkSoftness : 0);
    };
    frame = requestAnimationFrame(animate);
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          materials.forEach((m) => m.dispose());
        }
      });
      finish.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []);
  return (
    <div
      className="study-shell"
      data-painting={painted}
      data-softness={softness}
    >
      <header className="study-header">
        <a href={import.meta.env.BASE_URL} className="study-back">
          <ArrowLeft size={17} />
          <span>{t("Back to the painting", "返回画卷")}</span>
        </a>
        <div className="study-wordmark">
          清明小景 <span> / {t("LIVING INK", "立体水墨")}</span>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          aria-label="Switch language / 切换语言"
        >
          {lang === "en" ? "中" : "EN"}
        </button>
      </header>
      <main className="study-main">
        <div className="study-title">
          <div className="eyebrow">
            {t("RAINBOW BRIDGE · INK IN MOTION", "虹桥 · 墨韵流转")}
          </div>
          <h1>{t("A painting, gently turning.", "轻转画卷，墨色生息。")}</h1>
          <p>
            {t(
              "Weathered silk, broken ink, and a gently turning scene.",
              "旧绢淡彩，枯笔微晕，轻转一方烟火。",
            )}
          </p>
        </div>
        <div className="study-stage" data-ready={ready} data-angle={angle}>
          <div ref={host} className="study-canvas" />
          {painted && <div className="study-paper" aria-hidden="true" />}
          <div className="study-stamp">
            虹<br />桥<span>小景</span>
          </div>
          <div className="study-badge">
            <LockKeyhole size={13} />
            {t("FIXED ELEVATION · LIMITED ANGLES", "固定俯角 · 限定视角")}
          </div>
          {!ready && !error && (
            <div className="study-loading">
              {t("Unfolding the landscape…", "展开小景…")}
            </div>
          )}
          {error && (
            <div className="study-loading">
              {t(
                "This browser could not open the 3D view.",
                "此浏览器暂时无法显示立体小景。",
              )}{" "}
              <a href={import.meta.env.BASE_URL}>
                {t("Return to the painting", "返回画卷")}
              </a>
            </div>
          )}
          <div className="study-zoom">
            <button
              aria-label={t("Zoom in", "放大")}
              disabled={!ready}
              onClick={() => api.current?.zoom(1.2)}
            >
              <Plus size={17} />
            </button>
            <button
              aria-label={t("Zoom out", "缩小")}
              disabled={!ready}
              onClick={() => api.current?.zoom(1 / 1.2)}
            >
              <Minus size={17} />
            </button>
            <button
              aria-label={t("Reset view", "重置视角")}
              disabled={!ready}
              onClick={() => {
                api.current?.reset();
                setAngle(0);
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="study-gesture">
            <Move size={13} />
            {t(
              "Drag to turn · Right-drag to pan · Pinch / wheel to zoom",
              "拖动旋转 · 右键平移 · 双指或滚轮缩放",
            )}
          </div>
        </div>
        <section
          className="study-controls"
          aria-label={t("Camera views", "相机视角")}
        >
          <div>
            <span className="study-label">{t("THE CAMERA", "观看角度")}</span>
            <p>
              {t(
                "Turn gently. Stay within the scroll.",
                "轻转视角，不离画意。",
              )}
            </p>
          </div>
          <div className="study-views">
            {[-TILT_LIMIT, 0, TILT_LIMIT].map((a) => (
              <button
                key={a}
                aria-pressed={angle === a}
                disabled={!ready}
                onClick={() => {
                  api.current?.view(a);
                  setAngle(a);
                }}
              >
                {a === 0
                  ? t("Scroll view", "画卷视角")
                  : a < 0
                    ? t("Left −12°", "左侧 −12°")
                    : t("Right +12°", "右侧 +12°")}
              </button>
            ))}
          </div>
        </section>
        <section
          className="painting-controls"
          aria-label={t("Painting controls", "绘画设置")}
        >
          <label className="angle-control softness-control">
            <span>
              {t("Ink softness", "墨色晕染")} <output>{softness}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={softness}
              disabled={!ready || !painted}
              aria-label={t("Ink softness", "墨色晕染")}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSoftness(value);
                api.current?.softness(value / 100);
              }}
            />
            <span className="angle-extents">
              <span>{t("Crisp", "清晰")}</span>
              <span>{t("Diffuse", "晕开")}</span>
            </span>
          </label>
          <div
            className="paint-switch"
            role="group"
            aria-label={t("Rendering style", "渲染风格")}
          >
            {[true, false].map((value) => (
              <button
                key={String(value)}
                disabled={!ready}
                aria-pressed={painted === value}
                onClick={() => {
                  setPainted(value);
                  api.current?.painting(value);
                }}
              >
                {value
                  ? t("Ink & wash", "水墨淡彩")
                  : t("Plain model", "素模对比")}
              </button>
            ))}
          </div>
        </section>
        <footer className="study-notes">
          <p>
            <strong>
              {t("Built for a limited view.", "为有限视角而建。")}
            </strong>{" "}
            {t(
              "Detail belongs on roofs, front façades, and visible sides. Hidden surfaces can stay simple. No full orbit is needed.",
              "细节集中于屋顶、正面与可见侧面；隐藏部分从简，无须全角度环绕。",
            )}
          </p>
          <p>
            {t(
              "Painting MVP · procedural pigment and layered foliage. Inspired by the scroll; detailed historical artwork is still to come.",
              "绘画小样 · 程序化墨色与层叠树叶。取意原作，历史细节仍待精绘。",
            )}
          </p>
        </footer>
      </main>
    </div>
  );
}
