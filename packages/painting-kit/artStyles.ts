export type ArtStyleId =
  | "jiehua-ink"
  | "anamorphic-scroll"
  | "baimiao-mineral"
  | "river-mist-cinema"
  | "xieyi-poetic";

export interface ArtStyleSpec {
  id: ArtStyleId;
  en: string;
  zh: string;
  subtitleEn: string;
  subtitleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  /** Post-process margin paper hex color */
  paper: number;
  /** Shader substrate RGB vector (matches palettePaper scale [0.78, 0.68, 0.46]) */
  paperVec: [number, number, number];
  /** Primary ink RGB vector */
  inkVec: [number, number, number];
  /** Primary ink hex color */
  ink: number;
  /** Road earth wash hex color */
  road: number;
  /** Shader vector4: [aoStrength, tileDetail, mineralSaturation, shadowContrast] */
  surfaceParams: [number, number, number, number];
  /** Shader vector4: [contourStrength, mistDensity, washBleed, silkGrain] */
  finishParams: [number, number, number, number];
  /** Dry ink line opacity multiplier */
  lineWeight: number;
}

export const ART_STYLES: Record<ArtStyleId, ArtStyleSpec> = {
  "jiehua-ink": {
    id: "jiehua-ink",
    en: "Jiehua & Five-Tone Ink",
    zh: "界画五色",
    subtitleEn: "Ruled architectural linework & Mo Fen Wu Se ink AO",
    subtitleZh: "宋代界画准绳 · 墨分五色深浅晕染",
    descriptionEn:
      "Crisp variable-weight architectural linework with deep soot-ink ambient occlusion under eaves, open shop interiors, and bridge arches.",
    descriptionZh:
      "以界画笔法刻画屋宇舟车，借焦、浓、重、淡、清五色墨韵拉开檐下暗部、敞轩纵深与虹桥木拱层次。",
    paper: 0xeee5cb,
    paperVec: [0.78, 0.68, 0.46],
    inkVec: [0.095, 0.077, 0.05],
    ink: 0x18130d,
    road: 0x927a52,
    surfaceParams: [1.0, 1.0, 0.12, 0.85],
    finishParams: [0.95, 0.14, 0.28, 0.78],
    lineWeight: 1.2,
  },
  "anamorphic-scroll": {
    id: "anamorphic-scroll",
    en: "Palace Scroll Relief",
    zh: "古卷浮雕",
    subtitleEn: "Warm aged museum silk patina & bas-relief carving",
    subtitleZh: "故宫藏本古绢包浆 · 散点透视浅浮雕",
    descriptionEn:
      "Recreates the warm amber-aged silk patina of the Palace Museum original with dense tile hatching, bas-relief shading, and pronounced woven silk threads.",
    descriptionZh:
      "还原故宫藏本温润古旧绢本包浆，强化瓦垄与木构浅浮雕明暗肌理，凸显经纬丝绸纹路。",
    paper: 0xd8c08e,
    paperVec: [0.70, 0.54, 0.31],
    inkVec: [0.16, 0.095, 0.04],
    ink: 0x2a1c10,
    road: 0x7d623b,
    surfaceParams: [1.05, 1.35, 0.0, 1.25],
    finishParams: [0.85, 0.15, 0.58, 1.55],
    lineWeight: 1.08,
  },
  "baimiao-mineral": {
    id: "baimiao-mineral",
    en: "Baimiao & Mineral Glaze",
    zh: "白描青绿",
    subtitleEn: "Iron-wire Baimiao ink on bright silk with Song mineral glazes",
    subtitleZh: "铁线白描 · 石绿花青赭石设色",
    descriptionEn:
      "Luminous raw silk with razor-sharp Baimiao ink lines, accented by translucent Song mineral glazes: celadon jade water, malachite buds, indigo cloth, and warm ochre timber.",
    descriptionZh:
      "高明度生绢衬托精细铁线白描，辅以宋画经典石绿、花青、赭石与朱砂矿物微彩点染，清雅隽永。",
    paper: 0xf6efe2,
    paperVec: [0.89, 0.85, 0.74],
    inkVec: [0.08, 0.12, 0.13],
    ink: 0x162022,
    road: 0xa68d63,
    surfaceParams: [0.55, 0.95, 1.0, 0.45],
    finishParams: [1.3, 0.05, 0.08, 0.42],
    lineWeight: 1.35,
  },
  "river-mist-cinema": {
    id: "river-mist-cinema",
    en: "Bian River Morning Mist",
    zh: "烟雨汴河",
    subtitleEn: "Raking morning light, water reflections & layered river haze",
    subtitleZh: "晨光斜影 · 汴水倒影与远岸烟岚",
    descriptionEn:
      "Cinematic spring morning atmosphere with raking directional shadows, shimmering jade-celadon water reflections, and layered mist veiling the far bank.",
    descriptionZh:
      "营造清明春晓烟雨意境：斜阳投下修长水墨投影，汴河水波映出虹桥虚影，远岸屋舍隐入氤氲水汽。",
    paper: 0xdce4dd,
    paperVec: [0.73, 0.79, 0.74],
    inkVec: [0.075, 0.125, 0.155],
    ink: 0x1b2428,
    road: 0x877b62,
    surfaceParams: [1.2, 0.82, 0.72, 1.4],
    finishParams: [0.68, 1.55, 0.65, 0.55],
    lineWeight: 0.92,
  },
  "xieyi-poetic": {
    id: "xieyi-poetic",
    en: "Xieyi Splash-Ink",
    zh: "写意泼墨",
    subtitleEn: "Expressive Shuimo ink-wash blooms, dry-brush feibai & bold massing",
    subtitleZh: "破墨水渍 · 飞白皴擦与水墨写意",
    descriptionEn:
      "Bold expressive Shuimo brushwork pulling colors into five-tone pine-soot ink washes, with strong wet-edge pigment rings, dry-brush feibai gaps, and dramatic pooled shadows.",
    descriptionZh:
      "化设色为纯正五色水墨，融汇破墨渗化（水渍）、枯笔飞白皴擦与浓墨块面对比，气韵生动。",
    paper: 0xefe8d6,
    paperVec: [0.85, 0.81, 0.70],
    inkVec: [0.035, 0.03, 0.025],
    ink: 0x0d0b08,
    road: 0x78684e,
    surfaceParams: [1.4, 0.75, -0.82, 1.45],
    finishParams: [1.42, 0.42, 1.5, 1.2],
    lineWeight: 1.48,
  },
};

export const ART_STYLE_LIST: ArtStyleSpec[] = Object.values(ART_STYLES);
