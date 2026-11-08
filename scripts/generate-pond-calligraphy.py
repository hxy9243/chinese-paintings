"""Generate the pond's four-character Liu Gongquan Kai inscription.

Run with the calligraphy repository's Python environment. The existing engine
renders the finished writing; only its black-on-white coverage becomes alpha.
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
from calligraphy import SceneSpec, create_scene
from calligraphy.spec import Appearance

root = Path(__file__).resolve().parents[1]
out = root / "artworks/ink-pond/src/assets"
out.mkdir(parents=True, exist_ok=True)
font = engine / "data/fonts/ShuTiFangLiuGongQuanKai.ttf"
spec = SceneSpec(
    text="魚蝦清趣",
    style="shutifang-liugongquan-kai",
    layout={"width": 320, "height": 1480, "direction": "vertical-rl",
            "characters_per_line": 4, "margin": 8, "gap": .18},
    appearance=Appearance(paper_color=(255, 255, 255), ink_color=(0, 0, 0),
                          paper_style="plain", stamp_enabled=False),
)
scene = create_scene(spec, font_path=font, mode="static")
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
ink = ink.crop((max(0, box[0] - 5), max(0, box[1] - 5),
                min(ink.width, box[2] + 5), min(ink.height, box[3] + 5)))
asset = out / "yu-xia-qing-qu-liu.png"
ink.save(asset)
provenance = {
    "text": spec.text, "characters": list(spec.text),
    "style": spec.style, "renderer": "calligraphy StaticFontScene",
    "mode": "finished calligraphy still, no writing animation",
    "engineRepository": "https://github.com/hxy9243/calligraphy",
    "engineCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=engine, text=True).strip(),
    "fontName": "ShuTiFang Liu Gongquan Kai",
    "fontSha256": hashlib.sha256(font.read_bytes()).hexdigest(),
    "fontMetadata": (engine / "data/licenses/ShuTiFangLiuGongQuanKai.ttf.metadata.txt").read_text(),
    "scene": spec.to_dict(), "transparent": True, "stamp": False,
    "size": list(ink.size), "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
    "command": ".venv/bin/python /home/kevin/Workspace/chinese-paintings/scripts/generate-pond-calligraphy.py --calligraphy /home/kevin/Workspace/calligraphy",
}
(out / "yu-xia-qing-qu-liu.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"asset": str(asset), "text": spec.text, "size": list(ink.size), "transparent": True}, ensure_ascii=False))
