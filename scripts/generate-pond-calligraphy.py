"""Generate the pond's four-character Liu Gongquan Kai inscription.

Run with the calligraphy repository's Python environment. The existing engine
exports ordered font-preserving stroke alpha layers and brush progress fields,
plus the finished writing as transparent ink.
No font binary, paper, stamp, signature or additional character is exported.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--calligraphy", type=Path, required=True)
args = parser.parse_args()
engine = args.calligraphy.resolve()
sys.path.insert(0, str(engine))

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
from calligraphy import SceneSpec, create_scene
from calligraphy.spec import Appearance
from calligraphy.font_pipeline import load_bank

root = Path(__file__).resolve().parents[1]
out = root / "artworks/ink-pond/src/assets"
out.mkdir(parents=True, exist_ok=True)
font = engine / "data/fonts/ShuTiFangLiuGongQuanKai.ttf"
spec = SceneSpec(
    text="魚蝦清趣",
    style="shutifang-liugongquan-kai",
    layout={"width": 320, "height": 1480, "direction": "vertical-rl",
            "characters_per_line": 4, "margin": 8, "gap": .18},
    timing={"stroke_seconds": .18, "character_gap": .22, "intro": .5, "outro": 1},
    appearance=Appearance(paper_color=(255, 255, 255), ink_color=(0, 0, 0),
                          paper_style="plain", stamp_enabled=False),
)
scene = create_scene(spec, font_path=font, mode="font_layers")
assert [p["character"] for p in scene.plan.schedule] == list(spec.text)
frame = scene.frame(scene.duration).convert("RGB")
rgb = np.asarray(frame)
assert np.array_equal(rgb[:, :, 0], rgb[:, :, 1])
assert np.array_equal(rgb[:, :, 1], rgb[:, :, 2])
alpha = 255 - rgb[:, :, 0]
ink = Image.new("RGBA", frame.size, (40, 42, 35, 0))
ink.putalpha(Image.fromarray(alpha))
box = ink.getbbox()
assert box and box[3] - box[1] > 900
crop = (max(0, box[0] - 5), max(0, box[1] - 5), min(ink.width, box[2] + 5), min(ink.height, box[3] + 5))
ink = ink.crop(crop)
asset = out / "yu-xia-qing-qu-liu.png"
ink.save(asset)
provenance = {
    "text": spec.text, "characters": list(spec.text),
    "style": spec.style, "renderer": "calligraphy FontLayerScene",
    "mode": "ordered font-preserving stroke layers and brush progress fields",
    "engineRepository": "https://github.com/hxy9243/calligraphy",
    "engineCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=engine, text=True).strip(),
    "fontName": "ShuTiFang Liu Gongquan Kai",
    "fontSha256": hashlib.sha256(font.read_bytes()).hexdigest(),
    "fontMetadata": (engine / "data/licenses/ShuTiFangLiuGongQuanKai.ttf.metadata.txt").read_text(),
    "scene": spec.to_dict(), "transparent": True, "stamp": False,
    "size": list(ink.size), "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
    "command": ".venv/bin/python /home/kevin/Workspace/chinese-paintings/scripts/generate-pond-calligraphy.py --calligraphy /home/kevin/Workspace/calligraphy",
}
# Each tile retains this engine's stroke alpha and phase. Only the active
# stroke is evaluated in the browser; finished strokes keep their deposited ink.
atlas = Image.new("RGBA", (1024, 8192), (0, 0, 0, 255))
items = []
ax = ay = row_height = 0
for entry in scene.plan.schedule:
    data = scene.layer_store.get(entry["character"])
    size = round(entry["size"] * .92)
    px = round(entry["x"] + entry["size"] / 2 - size / 2) - crop[0]
    py = round(entry["y"] + entry["size"] / 2 - size / 2) - crop[1]
    for index, (layer, phase) in enumerate(zip(data["layers"], data["phases"])):
        valid = layer > 1 / 255
        assert valid.any(), (entry["character"], index)
        nearest = distance_transform_edt(~valid, return_distances=False, return_indices=True)
        extended = phase[tuple(nearest)]
        coverage = Image.fromarray(np.uint8(np.clip(layer, 0, 1) * 255)).resize((size, size), Image.Resampling.LANCZOS)
        local = coverage.getbbox()
        assert local
        phase_small = np.asarray(Image.fromarray(extended.astype(np.float32)).resize((size, size), Image.Resampling.BILINEAR))
        encoded = np.rint(np.clip(phase_small, 0, 1) * 65535).astype(np.uint16)
        rgba = np.stack([np.asarray(coverage), encoded >> 8, encoded & 255, np.full(encoded.shape, 255)], axis=-1).astype(np.uint8)
        tile = Image.fromarray(rgba).crop(local)
        if ax + tile.width > 1024:
            ax = 0; ay += row_height + 2; row_height = 0
        assert ay + tile.height <= atlas.height
        atlas.paste(tile, (ax, ay))
        items.append({"character": entry["character"], "stroke": index + 1,
                      "start": entry["start"] + index * scene.plan.stroke_seconds,
                      "end": entry["start"] + (index + 1) * scene.plan.stroke_seconds,
                      "x": px + local[0], "y": py + local[1],
                      "width": tile.width, "height": tile.height, "atlasX": ax, "atlasY": ay})
        ax += tile.width + 2; row_height = max(row_height, tile.height)
atlas = atlas.crop((0, 0, 1024, ay + row_height))
atlas_file = out / "yu-xia-qing-qu-liu-strokes.png"
atlas.save(atlas_file)
bank = load_bank(spec.style)
writing = {"text": spec.text, "width": ink.width, "height": ink.height,
           "duration": max(s["end"] for s in items), "strokeSeconds": scene.plan.stroke_seconds,
           "strokes": items, "guides": {c: bank["templates"][c] for c in spec.text},
           "interpretation": "Font-preserving masks with guide-inferred order and progress, not recovered historical pen motion"}
(out / "yu-xia-qing-qu-liu-strokes.json").write_text(json.dumps(writing, ensure_ascii=False, separators=(",", ":")) + "\n")
provenance["writing"] = {"strokes": len(items), "duration": writing["duration"],
                         "atlasSize": list(atlas.size), "atlasSha256": hashlib.sha256(atlas_file.read_bytes()).hexdigest()}
(out / "yu-xia-qing-qu-liu.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"asset": str(asset), "text": spec.text, "size": list(ink.size), "strokes": len(items), "duration": writing["duration"], "atlas": list(atlas.size)}, ensure_ascii=False))
