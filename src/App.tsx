import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Copy,
  Eye,
  Flower2,
  House,
  Info,
  Maximize,
  Minus,
  Move,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Sailboat,
  Share2,
  ShoppingBasket,
  Sprout,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import Scene, { type SceneHandle } from "./Scene";
import {
  ASSETS,
  BY_ID,
  EMPTY,
  SCENE,
  STORAGE_KEY,
  advanceHistory,
  baseUrl,
  loadDocument,
  tutorialStep,
  validatePlacement,
  type Category,
  type Language,
  type Point,
  type SceneDocument,
} from "./model";
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close / 关闭"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const [initial] = useState(() => {
    try {
      return loadDocument(localStorage);
    } catch {
      return { doc: EMPTY, error: true };
    }
  });
  const [history, setHistory] = useState({
    past: [] as SceneDocument[],
    current: initial.doc,
    future: [] as SceneDocument[],
  });
  const doc = history.current;
  const [lang, setLang] = useState<Language>("en");
  const t = (en: string, zh: string) => (lang === "en" ? en : zh);
  const [saved, setSaved] = useState(!initial.error);
  const [saveBlocked, setSaveBlocked] = useState(initial.error);
  const [category, setCategory] = useState<Category>("buildings");
  const [placing, setPlacing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [pending, setPending] = useState<Point | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reference, setReference] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState<
    "reference" | "about" | "share" | "catalog" | null
  >(null);
  const [toast, setToast] = useState("");
  const [shareCanvas, setShareCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [shareUrl, setShareUrl] = useState("");
  const [crop, setCrop] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [busy, setBusy] = useState(false);
  const scene = useRef<SceneHandle>(null);
  const step = tutorialStep(doc);
  const chosen = doc.objects.find((o) => o.id === selected);
  const lastCommitted = useRef(doc);
  const clear = () => {
    setPlacing(null);
    setMoving(null);
    setPending(null);
    setSelected(null);
  };
  const commit = (next: SceneDocument) => {
    setHistory((h) => advanceHistory(h.past, h.current, next));
    setPending(null);
  };
  const undo = useCallback(() => {
    setHistory((h) =>
      h.past.length
        ? {
            past: h.past.slice(0, -1),
            current: h.past.at(-1)!,
            future: [h.current, ...h.future],
          }
        : h,
    );
    clear();
  }, []);
  const redo = useCallback(() => {
    setHistory((h) =>
      h.future.length
        ? {
            past: [...h.past, h.current],
            current: h.future[0],
            future: h.future.slice(1),
          }
        : h,
    );
    clear();
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hans";
  }, [lang]);
  useEffect(() => {
    if (lastCommitted.current === doc) return;
    lastCommitted.current = doc;
    if (saveBlocked) {
      setSaved(false);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [doc, saveBlocked]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches("input,textarea") ||
        document.querySelector("dialog[open]")
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [undo, redo]);
  const errorText = (error: string) =>
    ({
      bounds: t(
        "Keep this element inside the painting.",
        "请将元素放在画面内。",
      ),
      surface: t(
        "Boats belong on water; other elements belong on the banks.",
        "舟船放在水面，其余元素放在岸上。",
      ),
      path: t(
        "Leave the bridge and walking lanes open.",
        "请为桥面和行人留出通道。",
      ),
      collision: t(
        "Give this element a little more room.",
        "请与其他元素稍留间隔。",
      ),
      limit: t(
        "Your painting has reached 40 elements.",
        "画中最多可放置40个元素。",
      ),
    })[error] || error;
  const onPoint = (p: Point) => {
    const id = placing || doc.objects.find((o) => o.id === moving)?.assetId;
    if (!id) return;
    const error = validatePlacement(id, p, doc.objects, moving ?? undefined);
    if (error) {
      setToast(errorText(error));
      setPending(null);
      return;
    }
    setPending(p);
  };
  const confirm = () => {
    if (!pending) return;
    const id = placing || chosen?.assetId;
    if (!id) return;
    const error = validatePlacement(
      id,
      pending,
      doc.objects,
      moving ?? undefined,
    );
    if (error) {
      setToast(errorText(error));
      return;
    }
    if (moving) {
      commit({
        ...doc,
        objects: doc.objects.map((o) =>
          o.id === moving ? { ...o, ...pending } : o,
        ),
      });
    } else {
      commit({
        ...doc,
        objects: [
          ...doc.objects,
          { id: crypto.randomUUID(), assetId: id, ...pending },
        ],
      });
    }
    clear();
  };
  const chooseAsset = (id: string) => {
    setPlacing(id);
    setSelected(null);
    setMoving(null);
    setPending(null);
    setReference(false);
    document
      .querySelector(".painting-section")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const replace = () => {
    if (!chosen) return;
    const a = BY_ID[chosen.assetId];
    const other = ASSETS.find(
      (x) => x.category === a.category && x.id !== a.id,
    )!;
    const error = validatePlacement(other.id, chosen, doc.objects, chosen.id);
    if (error) {
      setToast(errorText(error));
      return;
    }
    commit({
      ...doc,
      objects: doc.objects.map((o) =>
        o.id === chosen.id ? { ...o, assetId: other.id } : o,
      ),
    });
  };
  const openShare = async () => {
    setBusy(true);
    try {
      setReference(false);
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      setShareCanvas(await scene.current!.capture());
      setCrop(1);
      setCropX(50);
      setModal("share");
    } catch {
      setToast(
        t(
          "The image could not be prepared. Please try again.",
          "暂时无法生成图片，请重试。",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!shareCanvas) return;
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#eee5d2";
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.strokeStyle = "#b5a88b";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, 984, 1824);
    ctx.fillStyle = "#393c30";
    ctx.textAlign = "center";
    ctx.font = "72px serif";
    ctx.fillText("清 明 小 景", 540, 245);
    ctx.font = "20px serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("A LITTLE LIFE ALONG THE RIVER", 540, 305);
    ctx.letterSpacing = "0px";
    const area = { x: 70, y: 440, w: 940, h: 930 };
    const drawW = area.w * crop,
      drawH = drawW * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    ctx.drawImage(
      shareCanvas,
      area.x - ((drawW - area.w) * cropX) / 100,
      area.y + (area.h - drawH) / 2,
      drawW,
      drawH,
    );
    ctx.restore();
    ctx.fillStyle = "#934b3c";
    ctx.fillRect(500, 1435, 80, 88);
    ctx.fillStyle = "#eee5d2";
    ctx.font = "27px serif";
    ctx.fillText("入画", 540, 1489);
    ctx.fillStyle = "#625e50";
    ctx.font = "24px serif";
    ctx.fillText(
      t(
        "A moment of my own, beside Rainbow Bridge.",
        "虹桥边，自有一方小天地。",
      ),
      540,
      1620,
    );
    ctx.font = "18px serif";
    ctx.fillText(
      "Inspired by Zhang Zeduan · A simplified interpretation",
      540,
      1670,
    );
    ctx.font = "16px sans-serif";
    ctx.fillText(location.host + location.pathname, 540, 1780);
    setShareUrl(c.toDataURL("image/png"));
  }, [shareCanvas, crop, cropX, lang]);
  const download = () => {
    const a = document.createElement("a");
    a.href = shareUrl;
    a.download = "qingming-rainbow-bridge.png";
    a.click();
  };
  const shareFile = async () => {
    try {
      const blob = await (await fetch(shareUrl)).blob();
      const file = new File([blob], "qingming-rainbow-bridge.png", {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "清明小景" });
      } else {
        download();
        setToast(
          t(
            "Image downloaded. You can also hold the preview to save it.",
            "图片已下载，也可长按预览保存。",
          ),
        );
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setToast(
          t(
            "Sharing is unavailable here. Use Save image below.",
            "此浏览器暂不支持分享，请保存图片。",
          ),
        );
    }
  };
  const categories: {
    id: Category;
    en: string;
    zh: string;
    icon: typeof House;
  }[] = [
    { id: "buildings", en: "Buildings", zh: "屋舍", icon: House },
    { id: "trees", en: "Trees", zh: "树木", icon: Sprout },
    { id: "boats", en: "Boats", zh: "舟船", icon: Sailboat },
    { id: "stands", en: "Market stands", zh: "摊棚", icon: ShoppingBasket },
  ];
  const progressTitles = [
    t("Begin with a little shop", "先落一间铺子"),
    t("Make room for a market", "再添一处市集"),
    t("Let the riverbank bloom", "点染两岸风物"),
    t("A little world, made by you", "一方天地，由你入画"),
  ];
  const progressDescriptions = [
    t(
      "Choose a building below, then tap an open patch of riverbank.",
      "在下方选择屋舍，轻点河岸空地。",
    ),
    t(
      "Place a stand beside the lane. Someone will stop to browse.",
      "沿路添一处摊棚，行人便会驻足。",
    ),
    t(
      "Add a boat on the water and a tree on the bank.",
      "水上泊一舟，岸边植一木。",
    ),
    t(
      "Keep composing, or carry your little scene into the world.",
      "继续经营画中小景，或将它分享出去。",
    ),
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="清明小景 home"
        >
          <span className="brand-seal">
            清<br />明
          </span>
          <div>
            <strong>清明小景</strong>
            <span>THE LIVING HANDSCROLL</span>
          </div>
        </a>
        <nav>
          <a className="study-link" href="?view=3d">
            {t("3D study", "立体小样")}
          </a>
          <button
            aria-label={t("The original", "原作")}
            onClick={() => setModal("reference")}
          >
            <Eye size={16} />
            <span>{t("The original", "原作")}</span>
          </button>
          <button className="about-button" onClick={() => setModal("about")}>
            <Info size={16} />
            <span>{t("The story", "画中故事")}</span>
          </button>
          <span className="nav-divider" />
          <button
            className="language"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            aria-label="Switch language / 切换语言"
          >
            {lang === "en" ? "中" : "EN"}
          </button>
          <button
            className="primary share-top"
            aria-label={t("Share your scene", "分享小景")}
            onClick={openShare}
            disabled={!ready || busy}
          >
            <Share2 size={16} />
            <span>{t("Share your scene", "分享小景")}</span>
          </button>
        </nav>
      </header>
      <main>
        <section className="chapter-heading">
          <div>
            <div className="eyebrow">
              <span />
              {t("CHAPTER ONE · RAINBOW BRIDGE", "第一卷 · 虹桥烟火")}
            </div>
            <h1>
              {t("A little life along the river.", "一桥烟火，半卷人间。")}
            </h1>
            <p>
              {t(
                "A shop, a tree, a passing soul. Make this corner of the scroll your own.",
                "一间铺子，一株疏木，几个过客。让千年画卷，生出你的小天地。",
              )}
            </p>
          </div>
          <div className="chapter-mark">
            <span>虹桥</span>
            <small>汴河 · 北宋</small>
          </div>
        </section>
        <section
          className="painting-section"
          aria-label={t("Your painting", "你的画卷")}
        >
          <div className="painting-topline">
            <span>
              <i className={paused ? "status-dot paused" : "status-dot"} />
              {reference
                ? t("REFERENCE COMPOSITION", "参考布局")
                : paused
                  ? t("A QUIET MOMENT", "片刻静好")
                  : t("THE SCROLL IS ALIVE", "画卷徐徐生息")}
            </span>
            <button
              className={reference ? "active text-btn" : "text-btn"}
              disabled={!ready}
              onClick={() => {
                clear();
                setReference(!reference);
              }}
            >
              <Eye size={14} />
              {reference
                ? t("Return to my scene", "返回我的画卷")
                : t("Peek at a composition", "看一眼参考布局")}
            </button>
          </div>
          <div
            className={"painting-frame " + (placing || moving ? "placing" : "")}
          >
            <Scene
              ref={scene}
              objects={
                reference
                  ? SCENE.referenceArrangement
                  : pending
                    ? moving
                      ? doc.objects.map((o) =>
                          o.id === moving ? { ...o, ...pending } : o,
                        )
                      : [
                          ...doc.objects,
                          { id: "preview", assetId: placing!, ...pending },
                        ]
                    : doc.objects
              }
              selected={selected}
              placing={pending ? null : placing}
              moving={pending ? null : moving}
              paused={paused || Boolean(modal)}
              reference={reference}
              onPoint={onPoint}
              onSelect={(id) => {
                setSelected(id);
                setPlacing(null);
                setMoving(null);
                setPending(null);
              }}
              onReady={() => setReady(true)}
              onError={() => setFailed(true)}
            />
            {!ready && (
              <div className="loading-state">
                <Flower2 size={30} />
                <p>
                  {failed
                    ? t("The painting could not load.", "画卷暂未展开。")
                    : t("Unrolling the painting…", "正在展开画卷……")}
                </p>
                {failed && (
                  <button onClick={() => location.reload()}>
                    {t("Try again", "重试")}
                  </button>
                )}
              </div>
            )}
            {reference && (
              <div className="reference-badge">
                {t(
                  "An interpretation, not an exact reconstruction",
                  "简化演绎，非原作精确复原",
                )}
              </div>
            )}
            <div className="canvas-tools">
              <button
                className="icon-btn"
                title={t("Zoom in", "放大")}
                aria-label="Zoom in"
                onClick={() => scene.current?.zoom(1)}
              >
                <Plus size={18} />
              </button>
              <button
                className="icon-btn"
                title={t("Zoom out", "缩小")}
                aria-label="Zoom out"
                onClick={() => scene.current?.zoom(-1)}
              >
                <Minus size={18} />
              </button>
              <span />
              <button
                className="icon-btn"
                title={t("Fit painting", "全卷适配")}
                aria-label="Fit painting"
                onClick={() => scene.current?.fit()}
              >
                <Maximize size={17} />
              </button>
              <button
                className="icon-btn"
                title={
                  paused
                    ? t("Resume life", "继续生息")
                    : t("Pause life", "暂停生息")
                }
                aria-label={paused ? "Resume life" : "Pause life"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </div>
            {chosen && !placing && !moving && !reference && (
              <div className="selection-toolbar">
                <span>{BY_ID[chosen.assetId].name[lang]}</span>
                <button
                  onClick={() => {
                    setMoving(chosen.id);
                    setPending(null);
                  }}
                >
                  <Move size={16} />
                  {t("Move", "移动")}
                </button>
                <button onClick={replace}>
                  <RotateCcw size={16} />
                  {t("Variation", "换一种")}
                </button>
                <button
                  onClick={() => {
                    commit({
                      ...doc,
                      objects: doc.objects.filter((o) => o.id !== chosen.id),
                    });
                    clear();
                  }}
                  aria-label="Delete element"
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={clear} aria-label="Deselect">
                  <X size={16} />
                </button>
              </div>
            )}
            {(placing || moving) && (
              <div className="placement-toolbar">
                <span>
                  {pending
                    ? t("A good spot. Set it down?", "此处正好，落笔于此？")
                    : t("Tap an open spot in the painting", "轻点画中空地")}
                </span>
                {pending && (
                  <button className="primary" onClick={confirm}>
                    <Check size={16} />
                    {t("Place here", "放在这里")}
                  </button>
                )}
                <button onClick={clear} aria-label="Cancel placement">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
          <div className="painting-caption">
            <span>
              {t(
                "Inspired by Zhang Zeduan’s Qingming handscroll · a simplified interpretation",
                "取意于张择端《清明上河图》· 简化演绎",
              )}
            </span>
            <span className="gesture-hint">
              {t(
                "Drag to wander · Pinch or scroll to look closer",
                "拖动画卷 · 双指缩放",
              )}
            </span>
          </div>
        </section>
        <section className="workbench">
          {!doc.tutorialSkipped && (
            <div className="guidance">
              <div className={"step-number " + (step === 3 ? "complete" : "")}>
                {step === 3 ? (
                  <Check size={18} />
                ) : (
                  String(step + 1).padStart(2, "0")
                )}
              </div>
              <div>
                <h2>{progressTitles[step]}</h2>
                <p>{progressDescriptions[step]}</p>
              </div>
              <div className="step-dots">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i <= step ? "filled" : ""} />
                ))}
              </div>
              <button
                className="text-btn skip"
                onClick={() => commit({ ...doc, tutorialSkipped: true })}
              >
                {t("Free play", "自由入画")}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="palette-heading">
            <div className="category-tabs" role="tablist" aria-label="Elements">
              {categories.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={category === c.id}
                  className={category === c.id ? "selected" : ""}
                  onClick={() => {
                    setCategory(c.id);
                    setCollapsed(false);
                  }}
                >
                  <c.icon size={17} />
                  <span>{lang === "en" ? c.en : c.zh}</span>
                </button>
              ))}
            </div>
            <div className="history-tools">
              <button
                className="icon-btn"
                disabled={!history.past.length}
                onClick={undo}
                title={t("Undo", "撤销")}
                aria-label="Undo"
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-btn"
                disabled={!history.future.length}
                onClick={redo}
                title={t("Redo", "重做")}
                aria-label="Redo"
              >
                <Redo2 size={17} />
              </button>
              <span />
              <button
                className="icon-btn"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand elements" : "Collapse elements"}
              >
                {collapsed ? (
                  <ChevronUp size={17} />
                ) : (
                  <ChevronDown size={17} />
                )}
              </button>
            </div>
          </div>
          {!collapsed && (
            <div className="palette-body">
              <div className="asset-cards">
                {ASSETS.filter((a) => a.category === category).map((a) => (
                  <button
                    className={
                      "asset-card " + (placing === a.id ? "picked" : "")
                    }
                    key={a.id}
                    onClick={() => chooseAsset(a.id)}
                    disabled={!ready || doc.objects.length >= 40}
                    aria-label={a.name[lang]}
                  >
                    <div className="asset-image">
                      <img src={baseUrl(a.texture)} alt="" />
                      <span className="add-asset">
                        {placing === a.id ? (
                          <Check size={15} />
                        ) : (
                          <Plus size={15} />
                        )}
                      </span>
                    </div>
                    <div className="asset-name">
                      <span>{a.name[lang]}</span>
                      <small>{a.name[lang === "en" ? "zh" : "en"]}</small>
                    </div>
                  </button>
                ))}
              </div>
              <aside className="palette-note">
                <span className="little-seal">拾景</span>
                <div>
                  <h3>
                    {t(
                      "Small details. Endless stories.",
                      "拾得小景，绘尽人间。",
                    )}
                  </h3>
                  <p>
                    {t(
                      "Each element takes its cue from the original scroll. Place a piece, and let a story unfold.",
                      "从原卷中拾取风物，轻落一笔，便有故事缓缓展开。",
                    )}
                  </p>
                  <button
                    className="text-btn"
                    onClick={() => setModal("catalog")}
                  >
                    {t("Explore the element collection", "翻阅风物图录")}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
      <footer>
        <span>
          {saved ? (
            <>
              <Check size={12} />
              {t("Your scene is saved on this device", "小景已保存在此设备")}
            </>
          ) : (
            <>
              <CircleHelp size={13} />
              {t(
                "Not saved — device storage is unavailable",
                "未保存 · 设备存储暂不可用",
              )}
            </>
          )}
        </span>
        <span>
          {doc.objects.length} / 40 {t("elements", "处风物")}
          <span className="footer-flower">✳</span>
          {t("Take your time. The river will wait.", "慢慢来，汴河会等你。")}
        </span>
      </footer>
      {saveBlocked && (
        <div className="storage-warning">
          {t(
            "An earlier save could not be read. It has been preserved; new edits are not saved.",
            "旧存档无法读取，已保留原始内容；新修改暂未保存。",
          )}
          <button
            onClick={() => {
              try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw)
                  localStorage.setItem(
                    `${STORAGE_KEY}-backup-${Date.now()}`,
                    raw,
                  );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
                setSaveBlocked(false);
                setSaved(true);
              } catch {
                setToast(
                  t(
                    "Storage is still unavailable. Export an image to keep your scene.",
                    "存储仍不可用，请导出图片保留小景。",
                  ),
                );
              }
            }}
          >
            {t("Back up & save new scene", "备份并保存新画卷")}
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === "reference" && (
        <Modal
          title={t(
            "A thousand years, a single moment.",
            "一瞬烟火，千年长卷。",
          )}
          onClose={() => setModal(null)}
        >
          <p>
            {t(
              "Rainbow Bridge, from Zhang Zeduan’s Northern Song handscroll. This 2:1 detail is the reference for our small, simplified world.",
              "北宋张择端笔下的虹桥。这幅2:1的原作局部，是我们简化小景的参照。",
            )}
          </p>
          <img
            className="source-image"
            src={baseUrl(SCENE.source)}
            alt="Original Rainbow Bridge passage by Zhang Zeduan"
          />
          <div className="source-credit">
            {t(
              "Zhang Zeduan · Palace Museum, Beijing · Public-domain reproduction",
              "张择端 · 北京故宫博物院藏 · 公有领域复制图像",
            )}
          </div>
          <a
            href="https://commons.wikimedia.org/wiki/File:Along_the_River_During_the_Qingming_Festival_(detail_of_original).jpg"
            target="_blank"
            rel="noreferrer"
          >
            {t("View source and attribution ↗", "查看来源与署名 ↗")}
          </a>
          <button
            className="primary modal-action"
            onClick={() => {
              setModal(null);
              setReference(true);
              clear();
            }}
          >
            {t("See our reference composition", "查看参考布局")}
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal === "about" && (
        <Modal
          title={t("Step into the handscroll.", "走进画卷。")}
          onClose={() => setModal(null)}
        >
          <div className="about-art">
            <img
              src={baseUrl("art/art-proof.webp")}
              alt="Initial painted art proof"
            />
          </div>
          <p>
            {t(
              "清明小景 is a quiet building toy inspired by life around Rainbow Bridge in Along the River During the Qingming Festival. Build a small place, watch its people wander, and make a moment your own.",
              "清明小景是一款取意于《清明上河图》虹桥生活的闲适造景玩具。造一方天地，看行人往来，绘自己的片刻。",
            )}
          </p>
          <p>
            {t(
              "The scenery and objects are AI-assisted interpretations, not extracted museum assets or exact historical reconstructions. The original remains our visual reference.",
              "场景与风物采用AI辅助绘制，并非博物馆原作素材或精确历史复原。原画始终是我们的视觉参照。",
            )}
          </p>
          <p>
            {t(
              "Choose an element, tap a spot, and confirm. Tap a placed element to move, vary, or remove it. Undo is always close by.",
              "选取风物，轻点空地，再确认放置。轻点已有风物，可移动、替换或移除，也可随时撤销。",
            )}
          </p>
          <button
            className="text-btn"
            onClick={() => {
              commit({ ...doc, tutorialSkipped: false });
              setModal(null);
            }}
          >
            <RotateCcw size={15} />
            {t("Show the gentle guide again", "重新显示入画指引")}
          </button>
        </Modal>
      )}
      {modal === "catalog" && (
        <Modal
          title={t("The element collection", "风物图录")}
          onClose={() => setModal(null)}
        >
          <p>
            {t(
              "Eight studies from one small corner of the scroll. Each has one painted facing and a fixed scale.",
              "从画中一隅拾取八种风物，均采用固定视角与比例。",
            )}
          </p>
          <div className="catalog-grid">
            {ASSETS.map((a) => (
              <article key={a.id}>
                <img src={baseUrl(a.texture)} alt={a.name[lang]} />
                <h3>{a.name[lang]}</h3>
                <p>{a.sourceDetail[lang]}</p>
                <small>
                  {t("One facing", "单一朝向")} · {a.width} × {a.height} ·{" "}
                  {t("Footprint", "占地")} {a.footprint.width} ×{" "}
                  {a.footprint.height}
                </small>
                <button
                  className="text-btn"
                  onClick={() => {
                    setModal(null);
                    setCategory(a.category);
                    chooseAsset(a.id);
                  }}
                >
                  {t("Add to my scene", "收入画中")}
                  <Plus size={14} />
                </button>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {modal === "share" && (
        <Modal
          title={t("A little scene, worth keeping.", "留住这一卷小景。")}
          onClose={() => setModal(null)}
        >
          <div className="share-layout">
            <img
              className="share-preview"
              src={shareUrl || undefined}
              alt="Your 1080 by 1920 sharing card"
            />
            <div className="share-settings">
              <p>
                {t(
                  "Your painting, on a silk-toned keepsake. Save it or send it to someone who needs a quiet moment.",
                  "将你的小景装裱成笺，留作纪念，或寄给需要片刻安静的人。",
                )}
              </p>
              <label>
                {t("Look closer", "近观")}
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={crop}
                  onChange={(e) => setCrop(Number(e.target.value))}
                />
              </label>
              {crop > 1 && (
                <label>
                  {t("Frame left / right", "左右取景")}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                  />
                </label>
              )}
              <button className="primary" onClick={shareFile}>
                <Share2 size={16} />
                {t("Share image", "分享图片")}
              </button>
              <button className="secondary" onClick={download}>
                <ArrowDownToLine size={16} />
                {t("Save image", "保存图片")}
              </button>
              <div className="share-link">
                <label htmlFor="play-link">
                  {t("Invite someone to make their own", "邀人来绘自己的小景")}
                </label>
                <input
                  id="play-link"
                  readOnly
                  value={location.origin + location.pathname}
                />
                <button
                  className="text-btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        location.origin + location.pathname,
                      );
                      setToast(t("Play link copied.", "游玩链接已复制。"));
                    } catch {
                      setToast(
                        t(
                          "Select the link above to copy it.",
                          "请选取上方链接手动复制。",
                        ),
                      );
                    }
                  }}
                >
                  <Copy size={14} />
                  {t("Copy play link", "复制游玩链接")}
                </button>
              </div>
              <small>
                {t(
                  "The link opens a fresh scene, not a copy of yours.",
                  "链接打开新的画卷，并非你的存档。",
                )}
              </small>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
