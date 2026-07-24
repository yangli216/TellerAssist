import { createHash } from 'node:crypto';
import { cp, mkdir, copyFile, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'public/ocr');
const paddleOutputRoot = resolve(outputRoot, 'paddle');
const modelCacheRoot = resolve(projectRoot, '.cache/ocr-models');

const paddleModels = [
  {
    filename: 'PP-OCRv5_mobile_det_onnx_infer.tar',
    url: 'https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv5_mobile_det_onnx_infer.tar',
    sha256: '781056046c9ed77a15c94681605db6a0f62317c2e9cce6931c71da2478d4bc30',
  },
  {
    filename: 'PP-OCRv5_mobile_rec_onnx_infer.tar',
    url: 'https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv5_mobile_rec_onnx_infer.tar',
    sha256: 'f7e792bc836f36e7ef895ad47c426d75b0b75b1650caa6d63fe9418441ffba8c',
  },
];

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

const ensurePaddleModel = async ({ filename, url, sha256: expectedSha256 }) => {
  const cachedPath = resolve(modelCacheRoot, filename);
  try {
    if (await sha256(cachedPath) === expectedSha256) return cachedPath;
  } catch {
    // 缓存缺失或不可读时重新下载。
  }

  console.log(`Downloading pinned PaddleOCR model: ${filename}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${filename}: HTTP ${response.status}`);

  const temporaryPath = `${cachedPath}.download`;
  await writeFile(temporaryPath, new Uint8Array(await response.arrayBuffer()));
  const actualSha256 = await sha256(temporaryPath);
  if (actualSha256 !== expectedSha256) {
    await rm(temporaryPath, { force: true });
    throw new Error(`SHA-256 mismatch for ${filename}: ${actualSha256}`);
  }
  await rename(temporaryPath, cachedPath);
  return cachedPath;
};

await rm(outputRoot, { recursive: true, force: true });
await mkdir(resolve(outputRoot, 'core'), { recursive: true });
await mkdir(resolve(outputRoot, 'lang'), { recursive: true });
await mkdir(resolve(paddleOutputRoot, 'models'), { recursive: true });
await mkdir(modelCacheRoot, { recursive: true });

await copyFile(
  resolve(projectRoot, 'node_modules/tesseract.js/dist/worker.min.js'),
  resolve(outputRoot, 'worker.min.js'),
);

await cp(
  resolve(projectRoot, 'node_modules/tesseract.js-core'),
  resolve(outputRoot, 'core'),
  {
    recursive: true,
    filter: (source) => !source.endsWith('LICENSE') && !source.endsWith('README.md') && !source.endsWith('package.json'),
  },
);

await copyFile(
  resolve(projectRoot, 'node_modules/@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz'),
  resolve(outputRoot, 'lang/chi_sim.traineddata.gz'),
);

for (const model of paddleModels) {
  const cachedPath = await ensurePaddleModel(model);
  await copyFile(cachedPath, resolve(paddleOutputRoot, 'models', model.filename));
}

console.log('Prepared bundled Tesseract.js and PaddleOCR.js assets in public/ocr');
