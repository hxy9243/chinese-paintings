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
  CAMERA_LIMITS,
  DEFAULT_VIEW_ANGLE,
  VIEW_ANGLE,
} from "./bridgeStudy";
import "./mock3d.css";
import { RenderDemand } from "./renderDemand";
import { createInkFinish } from "./inkFinish";
import { advanceSceneTime } from "./peopleMotion";
import { PALETTES,type ScenePalette } from "./scenePalette";
import { boatPose } from "./passageLife";
import { BOATS } from "./passageLayout";
import { REFERENCE_AZIMUTH, SCROLL_STOPS, scrollPoint } from "./scrollLayout";

type StudyApi = {
  invalidate:()=>void;
  view: (angle: number, pitch?: number) => void;
  roll: (angle: number) => void;
  travel: (s: number, overview?: boolean, depth?: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  painting: (enabled: boolean) => void;
  softness: (amount: number) => void;
  palette: (value:ScenePalette) => void;
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
  const [referenceArea,setReferenceArea]=useState<"bridge"|"bend"|"crossroads">("bridge");
  const [lang, setLang] = useState<"en" | "zh">("en"),
    [angle, setAngle] = useState(DEFAULT_VIEW_ANGLE),
    [pitch, setPitch] = useState(0),
    [roll, setRoll] = useState(0),
    [painted, setPainted] = useState(true),
    [palette,setPalette]=useState<ScenePalette>(()=>{try{return localStorage.getItem('qingming.palette')==='indigo-amber'?'indigo-amber':'silk';}catch{return 'silk';}}),
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
      new THREE.Plane(along, 49),
      new THREE.Plane(along.clone().negate(), 32),
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
    study.setPalette(palette);finish.setPaper(PALETTES[palette].paper);
    const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 250);
    const demand=new RenderDemand();
    let frame=0,timer:ReturnType<typeof setTimeout>|null=null,last=performance.now(),pending=false,previewResolution=false,draws=0;
    const fullRatio=Math.min(window.devicePixelRatio,2);
    function schedule(delay=0){
      if(capture||frame||timer!==null||document.hidden)return;
      if(delay>0)timer=setTimeout(()=>{timer=null;schedule();},delay);
      else frame=requestAnimationFrame(animate);
    }
    function invalidate(preview=false){
      demand.invalidate(performance.now(),preview);
      if(timer!==null){clearTimeout(timer);timer=null;}
      schedule();
    }
    demand.invalidate(performance.now(),true);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.minAzimuthAngle =
      VIEW_ANGLE - THREE.MathUtils.degToRad(CAMERA_LIMITS.yaw);
    controls.maxAzimuthAngle =
      VIEW_ANGLE + THREE.MathUtils.degToRad(CAMERA_LIMITS.yaw);
    controls.minPolarAngle = ELEVATION - THREE.MathUtils.degToRad(CAMERA_LIMITS.pitchMax);
    controls.maxPolarAngle = ELEVATION - THREE.MathUtils.degToRad(CAMERA_LIMITS.pitchMin);
    controls.rotateSpeed = 0.45;
    controls.addEventListener("change", () => {
      invalidate(true);
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
    controls.addEventListener("start",()=>{demand.interaction(true,performance.now());invalidate();});
    controls.addEventListener("end",()=>{demand.interaction(false,performance.now());invalidate();});
    let rollAngle = 0;
    controls.enableDamping = false;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;
    controls.minZoom = 0.3;
    controls.maxZoom = 4.5;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.target.copy(scrollPoint(-10, -1));
    controls.target.y = 1.1;
    const position = (
      degrees: number,
      pitch = THREE.MathUtils.radToDeg(ELEVATION - controls.getPolarAngle()),
    ) => {
      const azimuth =
        VIEW_ANGLE +
        THREE.MathUtils.degToRad(
          THREE.MathUtils.clamp(degrees, -CAMERA_LIMITS.yaw, CAMERA_LIMITS.yaw),
        );
      const offset = new THREE.Vector3().setFromSphericalCoords(
        110,
        ELEVATION -
          THREE.MathUtils.degToRad(
            THREE.MathUtils.clamp(pitch, CAMERA_LIMITS.pitchMin, CAMERA_LIMITS.pitchMax),
          ),
        azimuth,
      );
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      controls.update();
    };
    const defaultAngle = DEFAULT_VIEW_ANGLE;
    const defaultZoom = .63;
    camera.zoom = defaultZoom;
    camera.updateProjectionMatrix();
    position(defaultAngle, 0);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      invalidate();
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
      invalidate:()=>{last=performance.now();invalidate();},
      view: position,
      roll(degrees) {
        invalidate();
        rollAngle = THREE.MathUtils.degToRad(
          THREE.MathUtils.clamp(degrees, -CAMERA_LIMITS.roll, CAMERA_LIMITS.roll),
        );
      },
      travel(s, overview = false, depth = 0) {
        controls.target.copy(scrollPoint(overview?-10:s, overview?-1:depth));
        controls.target.y = 1.1;
        camera.zoom = overview ? defaultZoom : 1.8;
        camera.updateProjectionMatrix();
        rollAngle = 0;
        setRoll(0);
        position(0, 0);
      },
      painting(enabled) {
        invalidate();
        paintingEnabled = enabled;
        study.setPainting(enabled);
      },
      palette(value){invalidate();study.setPalette(value);finish.setPaper(PALETTES[value].paper);},
      softness(amount) {
        invalidate();
        inkSoftness = Math.max(0, Math.min(1, amount));
      },
      zoom(factor) {
        invalidate(true);
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.3, 4.5);
        camera.updateProjectionMatrix();
      },
      reset() {
        controls.target.copy(scrollPoint(-10, -1));
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
    const resetFrameClock=()=>{last=performance.now();if(!document.hidden)invalidate();};
    document.addEventListener('visibilitychange',resetFrameClock);
    function animate(now:number){
      frame=0;
      if(capture||document.hidden)return;
      const delta=(now-last)/1000;last=now;
      animationTime=advanceSceneTime(animationTime,delta,pausedRef.current);
      controls.update();
      const plan=demand.takeFrame(now,!pausedRef.current,pending);
      if(plan.draw){
        if(previewResolution!==plan.preview){
          previewResolution=plan.preview;
          renderer.setPixelRatio(plan.preview?.65:fullRatio);
          renderer.setSize(el.clientWidth,el.clientHeight);
          finish.resize(el.clientWidth,el.clientHeight);
        }
        camera.rotateZ(rollAngle);
        study.update(animationTime,camera,el.clientHeight,plan.preview);
        pending=false;
        finish.render(scene,camera,paintingEnabled?inkSoftness:0);
        renderer.domElement.dataset.quality=plan.preview?"preview":"refined";
        renderer.domElement.dataset.frames=String(++draws);
      }
      const delay=demand.nextDelay(now,!pausedRef.current,pending);
      if(delay!==null)schedule(delay);
    }
    schedule();
    const reviewApi={
      frame(seconds:number,options:{zoom?:number;angle?:number;pitch?:number;target?:[number,number];palette?:ScenePalette;eye?:[number,number,number];look?:[number,number,number];fov?:number;aboard?:number}={}){
        if(options.palette){study.setPalette(options.palette);finish.setPaper(PALETTES[options.palette].paper);setPalette(options.palette);}
        if(options.target){controls.target.copy(scrollPoint(...options.target));controls.target.y=1.1;}
        if(options.zoom!==undefined){camera.zoom=options.zoom;camera.updateProjectionMatrix();}
        position(options.angle??0,options.pitch??0);animationTime=seconds;
        let view:THREE.Camera=camera;
        if((options.eye || options.aboard!==undefined) && options.look){
          const immersive=new THREE.PerspectiveCamera(options.fov??55,el.clientWidth/el.clientHeight,.035,250);
          const [s,y,d]=options.eye??[0,0,0], [ts,ty,td]=options.look;
          immersive.position.copy(scrollPoint(s,d));immersive.position.y=y;
          if(options.aboard!==undefined){
            const index=options.aboard,pose=boatPose(index,seconds);
            // Follow the actual vessel transform, including its bob, pitch and roll.
            const offset=new THREE.Vector3(BOATS[index].width*.25,1.12,BOATS[index].length*.28);
            offset.applyEuler(new THREE.Euler(pose.pitch,REFERENCE_AZIMUTH+Math.PI/2-pose.angle,pose.roll));
            immersive.position.copy(scrollPoint(pose.s,pose.d)).add(offset);
            immersive.position.y+=pose.y;
          }
          const aim=scrollPoint(ts,td);aim.y=ty;immersive.lookAt(aim);
          immersive.updateMatrixWorld();view=immersive;
        }
        renderer.setPixelRatio(fullRatio);renderer.setSize(el.clientWidth,el.clientHeight);finish.resize(el.clientWidth,el.clientHeight);
        study.update(seconds,view,el.clientHeight,false);renderer.info.autoReset=false;renderer.info.reset();
        finish.render(scene,view,paintingEnabled?inkSoftness:0);
        const stats={...study.metadata(),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};renderer.info.autoReset=true;return stats;
      },
      metadata:()=>study.metadata(),
    };
    if(capture)(window as unknown as {qingmingStudy:typeof reviewApi}).qingmingStudy=reviewApi;
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      if(timer!==null)clearTimeout(timer);
      document.removeEventListener("visibilitychange",resetFrameClock);
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
  useEffect(()=>{api.current?.invalidate();},[paused]);
  return (
    <div
      className="study-shell"
      data-palette={palette}
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
                onClick={() => {api.current?.travel(stop.s, false, stop.depth);setReferenceArea(stop.id==="crossroads"?"crossroads":stop.id==="bend"?"bend":"bridge");}}
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
            {t("TURN ±85° · TILT 8–80°", "转向 ±85° · 俯视 8–80°")}
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
              className="study-play"
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
                setAngle(DEFAULT_VIEW_ANGLE);
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
            {[-75, 0, 75].map((a) => (
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
                    ? t("Left −75°", "左侧 −75°")
                    : t("Right +75°", "右侧 +75°")}
              </button>
            ))}
          </div>
        </section>
        <section
          className="rotation-controls"
          aria-label={t("Three-axis rotation", "三轴旋转")}
        >
          {[
            { key: "yaw", label: t("Turn · Y", "转向 · Y"), value: angle, min: -CAMERA_LIMITS.yaw, max: CAMERA_LIMITS.yaw },
            { key: "pitch", label: t("Tilt · X", "俯仰 · X"), value: pitch, min: CAMERA_LIMITS.pitchMin, max: CAMERA_LIMITS.pitchMax },
            { key: "roll", label: t("Roll · Z", "倾转 · Z"), value: roll, min: -CAMERA_LIMITS.roll, max: CAMERA_LIMITS.roll },
          ].map(({ key, label, value, min, max }) => (
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
                min={min}
                max={max}
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
                <span>{min}°</span>
                <span>+{max}°</span>
              </span>
            </label>
          ))}
        </section>
        <section
          className="painting-controls"
          aria-label={t("Painting controls", "绘画设置")}
        >
          <label className="palette-control">
            <span>{t('Color palette','设色')}</span>
            <select aria-label={t('Color palette','设色')} value={palette} disabled={!ready}
              onChange={e=>{const value=e.target.value as ScenePalette;setPalette(value);api.current?.palette(value);try{localStorage.setItem('qingming.palette',value);}catch{}}}>
              <option value="silk">{t('Original silk','原作绢色')}</option>
              <option value="indigo-amber">{t('River & ochre','碧水赭彩')}</option>
            </select>
          </label>
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
              "Turn up to 85° each way, view from 8° to 80° above the river, and roll up to 45°. Right-drag to pan; reset to return to the original composition.",
              "转向可调至正负85°，俯视高度8°至80°，倾转正负45°。右键拖动平移，重置可返回初始构图。",
            )}
          </p>
          <p>
            {t(
              "A modeled study of the selected passage: broad roofs, working boats, and small figures in yellowed-silk ink. Interpretive, not a traced replica.",
              "选段立体习作：宽阔屋顶、行舟与小人物，施以旧绢墨色。取意原作，并非逐笔复刻。",
            )}
          </p>
          <p><a href="./figure-study.html">{t("Look closely at the people →", "放大细看人物 →")}</a></p>
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
          <label>{t("Reference passage", "对照画段")} {" "}
            <select aria-label={t("Reference passage", "对照画段")} value={referenceArea} onChange={e=>setReferenceArea(e.target.value as "bridge"|"bend"|"crossroads")}>
              <option value="bridge">{t("Rainbow Bridge", "虹桥")}</option>
              <option value="bend">{t("River bend and landings", "河湾与码头")}</option>
              <option value="crossroads">{t("Western crossroads", "西街十字路口")}</option>
            </select>
          </label>
          <div ref={originalStrip} className="original-strip">
            {originalOpen && (
              <img
                src={`${import.meta.env.BASE_URL}reference/${referenceArea==="crossroads"?"chicago-crossroads.png":referenceArea==="bend"?"chicago-river-bend.png":"chicago-rainbow-bridge.png"}`}
                alt={t(
                  referenceArea==="crossroads"?"Supplied western crossroads and joined house wings":referenceArea==="bend"?"Selected river bend and cargo landings":"Selected Rainbow Bridge and riverbank passage",
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
