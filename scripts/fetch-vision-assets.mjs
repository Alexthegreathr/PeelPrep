/**
 * Self-host the on-device vision assets for Video Delivery Analysis
 * (PHASE_14 §3c — real face/pose landmarks). Copies the MediaPipe WASM runtime
 * out of node_modules and downloads the face + pose landmark models into
 * public/mediapipe/, so the browser loads everything from the same origin and
 * NO user media — and no model request — ever leaves for a third-party CDN at
 * runtime. Assets are git-ignored (multi-MB binaries); run this after install:
 *
 *   node scripts/fetch-vision-assets.mjs
 */
import { cp, mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(
  fileURLToPath(new URL("../package.json", import.meta.url)),
);
const publicDir = path.join(root, "public", "mediapipe");
const wasmSrc = path.join(
  root,
  "node_modules",
  "@mediapipe",
  "tasks-vision",
  "wasm",
);
const wasmDest = path.join(publicDir, "wasm");
const modelsDest = path.join(publicDir, "models");

const MODELS = {
  "face_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  "pose_landmarker_lite.task":
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
};

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(modelsDest, { recursive: true });

  if (!(await exists(wasmSrc))) {
    console.error(
      "MediaPipe WASM not found — run `npm install @mediapipe/tasks-vision` first.",
    );
    process.exit(1);
  }
  await cp(wasmSrc, wasmDest, { recursive: true });
  console.log(`✓ WASM runtime → public/mediapipe/wasm`);

  for (const [name, url] of Object.entries(MODELS)) {
    const dest = path.join(modelsDest, name);
    if (await exists(dest)) {
      console.log(`• ${name} already present, skipping`);
      continue;
    }
    process.stdout.write(`… downloading ${name} `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log("done");
  }

  console.log("\n✅ Vision assets ready in public/mediapipe/ (git-ignored).");
}

main().catch((err) => {
  console.error("\nFailed to fetch vision assets:", err.message);
  process.exit(1);
});
