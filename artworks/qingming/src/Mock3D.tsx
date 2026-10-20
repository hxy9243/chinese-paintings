import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Minus,
  Plus,
  RotateCcw,
  Move,
  Rotate3D,
  Pause,
  Play,
  ChevronDown,
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
  view: (angle: number, pitch?: number) => void;
  roll: (angle: number) => void;
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
    [angle, setAngle] = useState(TILT_LIMIT),
    [pitch, setPitch] = useState(0),
    [roll, setRoll] = useState(0),
    [painted, setPainted] = useState(true),
    [softness, setSoftness] = useState(70),
    [scrollControlsOpen, setScrollControlsOpen] = useState(false),
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
    // Hulls enter through the two side edges, with recycling beyond the frame.
    const along = scrollPoint(1, 0).normalize();
    renderer.clippingPlanes = [
      new THREE.Plane(along, 22),
      new THREE.Plane(along.clone().negate(), 22),
    ];
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
    const capture=new URLSearchParams(location.search).has("capture");
    const study = createBridgeStudy(9243);
    scene.add(study.group);
    study.setPainting(true);
    const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 250);
    let needsRender=true;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.minAzimuthAngle =
      VIEW_ANGLE - THREE.MathUtils.degToRad(TILT_LIMIT);
    controls.maxAzimuthAngle =
      VIEW_ANGLE + THREE.MathUtils.degToRad(TILT_LIMIT);
    controls.minPolarAngle = ELEVATION - THREE.MathUtils.degToRad(TILT_LIMIT);
    controls.maxPolarAngle = ELEVATION + THREE.MathUtils.degToRad(TILT_LIMIT);
    controls.rotateSpeed = 0.45;
    controls.addEventListener("change", () => {
      needsRender=true;
      setAngle(
        Math.round(
          THREE.MathUtils.radToDeg(controls.getAzimuthalAngle() - VIEW_ANGLE),
        ),
      );
      setPitch(
        Math.round(
          THREE.MathUtils.radToDeg(ELEVATION - controls.getPolarAngle()),
        ),
      );
    });
    let rollAngle = 0;
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
    controls.target.y = 1.1;
    const position = (
      degrees: number,
      pitch = THREE.MathUtils.radToDeg(ELEVATION - controls.getPolarAngle()),
    ) => {
      const azimuth =
        VIEW_ANGLE +
        THREE.MathUtils.degToRad(
          Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, degrees)),
        );
      const offset = new THREE.Vector3().setFromSphericalCoords(
        110,
        ELEVATION -
          THREE.MathUtils.degToRad(
            THREE.MathUtils.clamp(pitch, -TILT_LIMIT, TILT_LIMIT),
          ),
        azimuth,
      );
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      controls.update();
    };
    const defaultAngle = TILT_LIMIT;
    const defaultZoom = 1.25;
    camera.zoom = defaultZoom;
    camera.updateProjectionMatrix();
    position(defaultAngle, 0);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      needsRender=true;
      renderer.setSize(w, h);
      finish.resize(w, h);
      const aspect = w / h;
      const span = Math.max(10, 26 / aspect);
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
      roll(degrees) {
        needsRender=true;
        rollAngle = THREE.MathUtils.degToRad(
          THREE.MathUtils.clamp(degrees, -TILT_LIMIT, TILT_LIMIT),
        );
      },
      travel(s, overview = false, depth = 0) {
        controls.target.copy(scrollPoint(s, depth));
        controls.target.y = 1.1;
        camera.zoom = overview ? 1 : 1.8;
        camera.updateProjectionMatrix();
        rollAngle = 0;
        setRoll(0);
        position(0, 0);
      },
      painting(enabled) {
        needsRender=true;
        paintingEnabled = enabled;
        study.setPainting(enabled);
      },
      softness(amount) {
        needsRender=true;
        inkSoftness = Math.max(0, Math.min(1, amount));
      },
      zoom(factor) {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.5, 2.5);
        camera.updateProjectionMatrix();
      },
      reset() {
        controls.target.copy(scrollPoint(0, 0));
        controls.target.y = 1.1;
        camera.zoom = defaultZoom;
        camera.updateProjectionMatrix();
        rollAngle = 0;
        setRoll(0);
        position(defaultAngle, 0);
      },
    };
    let animationTime = 0;
    study.update(0);
    let frame = 0,
      last = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (capture) return;
      if (document.hidden) {
        last = now;
        return;
      }
      if (now - last < 32) return;
      const delta = Math.min(0.08, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !capture) {animationTime += delta;needsRender=true;}
      controls.update();
      if(!needsRender)return;
      needsRender=false;
      camera.rotateZ(rollAngle);
      study.update(animationTime, camera, el.clientHeight);
      finish.render(scene, camera, paintingEnabled ? inkSoftness : 0);
    };
    frame = requestAnimationFrame(animate);
    const reviewApi={
      frame(seconds:number,options:{zoom?:number;angle?:number;pitch?:number;target?:[number,number]}={}){
        if(options.target){controls.target.copy(scrollPoint(...options.target));controls.target.y=1.1;}
        if(options.zoom!==undefined){camera.zoom=options.zoom;camera.updateProjectionMatrix();}
        position(options.angle??0,options.pitch??0);animationTime=seconds;
        study.update(seconds,camera,el.clientHeight);renderer.info.autoReset=false;renderer.info.reset();
        finish.render(scene,camera,paintingEnabled?inkSoftness:0);
        const stats={...study.metadata(),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};renderer.info.autoReset=true;return stats;
      },
      metadata:()=>study.metadata(),
    };
    if(capture)(window as unknown as {qingmingStudy:typeof reviewApi}).qingmingStudy=reviewApi;
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
      if(capture)delete (window as unknown as {qingmingStudy?:unknown}).qingmingStudy;
    };
  }, []);
  return (
    <div
      className="study-shell"
      data-painting={painted}
      data-softness={softness}
    >
      <header className="study-header">
        <div className="study-wordmark">
          <a href="/" aria-label="画中行 · Gallery">清明小景</a> <span> / {t("LIVING INK", "立体水墨")}</span>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          aria-label="Switch language / 切换语言"
        >
          {lang === "en" ? "中" : "EN"}
        </button>
      </header>
      <main className="study-main">
        <section className="scroll-explorer">
          <button
            className="scroll-explorer-toggle"
            aria-expanded={scrollControlsOpen}
            aria-controls="scroll-district-controls"
            onClick={() => setScrollControlsOpen((open) => !open)}
          >
            <span>{t("Explore the scroll", "游览长卷")}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <nav
            id="scroll-district-controls"
            className="scroll-districts"
            aria-label={t("Explore the long scroll", "游览长卷")}
            hidden={!scrollControlsOpen}
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
        </section>
        <div
          className="study-stage"
          data-ready={ready}
          data-angle={angle}
          data-pitch={pitch}
          data-roll={roll}
        >
          <div ref={host} className="study-canvas" />
          {painted && <div className="study-paper" aria-hidden="true" />}
          <div className="study-stamp">
            虹<br />桥<span>小景</span>
          </div>
          <div className="study-badge">
            <Rotate3D size={13} />
            {t("THREE AXES · ±30°", "三轴旋转 · ±30°")}
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
              <a href={import.meta.env.BASE_URL}>{t("Try again", "重试")}</a>
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
                setAngle(TILT_LIMIT);
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="study-gesture">
            <Move size={13} />
            {t(
              "Drag to turn & tilt · Z slider to roll · Wheel to zoom",
              "拖动旋转与俯仰 · Z 轴倾转 · 滚轮缩放",
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
                    ? t("Left −30°", "左侧 −30°")
                    : t("Right +30°", "右侧 +30°")}
              </button>
            ))}
          </div>
        </section>
        <section
          className="rotation-controls"
          aria-label={t("Three-axis rotation", "三轴旋转")}
        >
          {[
            { key: "yaw", label: t("Turn · Y", "转向 · Y"), value: angle },
            { key: "pitch", label: t("Tilt · X", "俯仰 · X"), value: pitch },
            { key: "roll", label: t("Roll · Z", "倾转 · Z"), value: roll },
          ].map(({ key, label, value }) => (
            <label className="angle-control" key={key}>
              <span>
                {label}
                <output>
                  {value > 0 ? "+" : ""}
                  {value}°
                </output>
              </span>
              <input
                type="range"
                min={-TILT_LIMIT}
                max={TILT_LIMIT}
                step="1"
                value={value}
                disabled={!ready}
                aria-label={label}
                onChange={(e) => {
                  const degrees = Number(e.target.value);
                  if (key === "roll") {
                    setRoll(degrees);
                    api.current?.roll(degrees);
                  } else if (key === "pitch") api.current?.view(angle, degrees);
                  else api.current?.view(degrees, pitch);
                }}
              />
              <span className="angle-extents">
                <span>−30°</span>
                <span>+30°</span>
              </span>
            </label>
          ))}
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
              {t("Explore from three angles.", "从三轴细看画卷。")}
            </strong>{" "}
            {t(
              "Turn, tilt, and roll up to 30° each way. Right-drag to pan; reset to return to the original composition.",
              "转向、俯仰、倾转各可调至正负30°。右键拖动平移，重置可返回初始构图。",
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
