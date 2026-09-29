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
  Pause,
  Play,
} from "lucide-react";
import {
  createBridgeStudy,
  ELEVATION,
  TILT_LIMIT,
  VIEW_ANGLE,
} from "./bridgeStudy";
import "./mock3d.css";
import { createInkFinish } from "./inkFinish";
import { SCROLL_STOPS, scrollPoint } from "./scrollLayout";

type StudyApi = {
  view: (angle: number) => void;
  travel: (s: number, overview?: boolean, depth?: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  painting: (enabled: boolean) => void;
  softness: (amount: number) => void;
};
export default function Mock3D() {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<StudyApi | null>(null);
  const originalDialog = useRef<HTMLDialogElement>(null),
    originalStrip = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [originalOpen, setOriginalOpen] = useState(false);
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
    const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 250);
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
    controls.minZoom = 0.5;
    controls.maxZoom = 2.5;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.target.copy(scrollPoint(0, 0));
    controls.target.y = 0.5;
    const position = (degrees: number) => {
      const azimuth =
        VIEW_ANGLE +
        THREE.MathUtils.degToRad(
          Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, degrees)),
        );
      const offset = new THREE.Vector3().setFromSphericalCoords(
        110,
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
      const span = Math.max(8.8, 23 / aspect);
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
      travel(s, overview = false, depth = 0) {
        controls.target.copy(scrollPoint(s, depth));
        controls.target.y = 0.5;
        camera.zoom = overview ? 1 : 1.8;
        camera.updateProjectionMatrix();
        position(0);
      },
      painting(enabled) {
        paintingEnabled = enabled;
        study.setPainting(enabled);
      },
      softness(amount) {
        inkSoftness = Math.max(0, Math.min(1, amount));
      },
      zoom(factor) {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.5, 2.5);
        camera.updateProjectionMatrix();
      },
      reset() {
        controls.target.copy(scrollPoint(0, 0));
        controls.target.y = 0.5;
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        position(0);
      },
    };
    let animationTime = 0;
    study.update(0);
    let frame = 0,
      last = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (document.hidden) {
        last = now;
        return;
      }
      if (now - last < 32) return;
      const delta = Math.min(0.08, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) animationTime += delta;
      controls.update();
      study.update(animationTime);
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
              "Rainbow Bridge and the riverbanks, studied from your selected passage.",
              "以所选画段为本，细看虹桥两岸。",
            )}
          </p>
        </div>
        <nav
          className="scroll-districts"
          aria-label={t("Explore the long scroll", "游览长卷")}
        >
          {SCROLL_STOPS.map((stop) => (
            <button
              key={stop.id}
              disabled={!ready}
              onClick={() => api.current?.travel(stop.s, false, stop.depth)}
            >
              {lang === "en" ? stop.en : stop.zh}
            </button>
          ))}
          <button
            disabled={!ready}
            onClick={() => api.current?.travel(0, true)}
          >
            {t("Whole passage", "全景")}
          </button>
          <button
            disabled={!ready}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused
              ? t("Resume life", "继续生息")
              : t("Pause life", "暂停生息")}
          </button>
          <button
            onClick={() => {
              setOriginalOpen(true);
              originalDialog.current?.showModal();
            }}
          >
            {t("Reference crop", "对照原作")}
          </button>
        </nav>
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
              "A modeled study of the selected passage: broad roofs, working boats, and small figures in yellowed-silk ink. Interpretive, not a traced replica.",
              "选段立体习作：宽阔屋顶、行舟与小人物，施以旧绢墨色。取意原作，并非逐笔复刻。",
            )}
          </p>
        </footer>
        <dialog
          ref={originalDialog}
          className="original-scroll-dialog"
          onClose={() => setOriginalOpen(false)}
        >
          <header>
            <h2>
              {t("Your selected passage · 2D reference", "所选画段 · 二维对照")}
            </h2>
            <button autoFocus onClick={() => originalDialog.current?.close()}>
              {t("Close", "关闭")}
            </button>
          </header>
          <p>
            {t(
              "This reproduction preserves the painting’s own perspective. Swipe horizontally or use the arrows to explore.",
              "此复制图保留原作自身的绘画视角。横向滑动或使用箭头游览。",
            )}
          </p>
          <div ref={originalStrip} className="original-strip">
            {originalOpen && (
              <img
                src={`${import.meta.env.BASE_URL}reference/selected-passage.webp`}
                alt={t(
                  "Selected Rainbow Bridge and riverbank passage",
                  "所选虹桥与河岸画段",
                )}
              />
            )}
          </div>
          <footer>
            <button
              aria-label={t("Original left", "原作向左")}
              onClick={() =>
                originalStrip.current?.scrollBy({
                  left: -600,
                  behavior: "smooth",
                })
              }
            >
              ←
            </button>
            <a
              href="https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg"
              target="_blank"
              rel="noreferrer"
            >
              {t(
                "Zhang Zeduan · Palace Museum · public-domain reproduction",
                "张择端 · 故宫博物院藏 · 公版复制图",
              )}
            </a>
            <button
              aria-label={t("Original right", "原作向右")}
              onClick={() =>
                originalStrip.current?.scrollBy({
                  left: 600,
                  behavior: "smooth",
                })
              }
            >
              →
            </button>
          </footer>
        </dialog>
      </main>
    </div>
  );
}
