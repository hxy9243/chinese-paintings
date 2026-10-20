import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
const ids = [
  "shop",
  "house",
  "bare-tree",
  "leaf-tree",
  "skiff",
  "cargo",
  "table",
  "canopy",
];
await mkdir("public/art", { recursive: true });
for (const id of ids)
  await sharp(`art-sources/${id}.png`)
    .resize({ width: 512, withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(`public/art/${id}.webp`);
for (const id of ["landscape", "art-proof"])
  await sharp(`art-sources/${id}.png`)
    .webp({ quality: 90 })
    .toFile(`public/art/${id}.webp`);
let bytes = 0;
for (const id of [...ids, "landscape"])
  bytes += (await stat(`public/art/${id}.webp`)).size;
console.log(`Initial scene artwork: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
