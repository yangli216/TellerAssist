import type { OcrResultItem, PaddleOCRCreateOptions } from '@paddleocr/paddleocr-js';
import ortWasmUrl from '@ort-wasm-jsep';
import type { FieldItem, SceneType } from '../types/business';
import type { OcrProgress, OcrResult } from './ocrTypes';
import type { ImageSize, OcrLine } from './businessRules';
import { parseBusinessFields } from './businessRules';

const PADDLE_DETECTION_MODEL = 'PP-OCRv5_mobile_det';
const PADDLE_RECOGNITION_MODEL = 'PP-OCRv5_mobile_rec';

const assetUrl = (path: string) => new URL(`ocr/paddle/${path}`, document.baseURI).href;

const paddleOptions = (): PaddleOCRCreateOptions => ({
  initialize: false,
  // PaddleOCR.js 0.4.x 的内置 module worker 在当前 Tauri/Vite 组合中无法稳定加载。
  // 先使用单线程 WASM 主产线；保留统一接口，待目标 Windows WebView 验证后再切换 worker。
  worker: false,
  textDetectionModelName: PADDLE_DETECTION_MODEL,
  textRecognitionModelName: PADDLE_RECOGNITION_MODEL,
  textDetectionModelAsset: { url: assetUrl('models/PP-OCRv5_mobile_det_onnx_infer.tar') },
  textRecognitionModelAsset: { url: assetUrl('models/PP-OCRv5_mobile_rec_onnx_infer.tar') },
  textDetectionBatchSize: 1,
  textRecognitionBatchSize: 6,
  ortOptions: {
    backend: 'wasm',
    // ONNX Runtime 支持只覆盖 WASM 文件路径；这样 JS 模块仍由 Vite 打包，
    // 避免 WebView 动态导入外置 .mjs 的兼容性问题。
    wasmPaths: {
      wasm: new URL(ortWasmUrl, document.baseURI).href,
    } as unknown as string,
    numThreads: 1,
    simd: true,
  },
});

type PaddleWorker = Awaited<ReturnType<typeof createPaddleWorker>>;
let paddleWorkerPromise: Promise<PaddleWorker> | null = null;

const createPaddleWorker = async () => {
  const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
  return PaddleOCR.create(paddleOptions());
};

const getPaddleWorker = async (onProgress?: (progress: OcrProgress) => void) => {
  if (!paddleWorkerPromise) {
    paddleWorkerPromise = (async () => {
      onProgress?.({ status: 'loading paddle runtime', progress: 0.05 });
      const worker = await createPaddleWorker();
      onProgress?.({ status: 'loading paddle models', progress: 0.12 });
      await worker.initialize();
      return worker;
    })().catch((error) => {
      paddleWorkerPromise = null;
      throw error;
    });
  }
  return paddleWorkerPromise;
};

const toBoundingBox = (item: OcrResultItem): OcrLine['bbox'] => {
  const xs = item.poly.map(([x]) => x);
  const ys = item.poly.map(([, y]) => y);
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
};

export const paddleItemsToLines = (items: OcrResultItem[]): OcrLine[] =>
  items
    .filter((item) => item.text.trim().length > 0 && item.poly.length > 0)
    .map((item) => ({
      text: item.text.trim(),
      confidence: Math.max(0, Math.min(100, item.score * 100)),
      bbox: toBoundingBox(item),
    }));

export interface CompanyNameRoi {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

const compactText = (value: string) => value.replace(/[\s　]/g, '');

export const findCompanyNameRoi = (
  lines: OcrLine[],
  imageSize: ImageSize,
): CompanyNameRoi | null => {
  const intactLabelLine = lines
    .filter((line) => /(?:企业)?名[^\u4e00-\u9fff]{0,2}称/.test(line.text) || compactText(line.text).includes('名称'))
    .sort((left, right) => left.bbox.y0 - right.bbox.y0)[0];
  const splitNameLabel = lines
    .filter((line) => compactText(line.text).replace(/[：:]/g, '') === '名')
    .map((nameLine) => {
      const nameCenterY = (nameLine.bbox.y0 + nameLine.bbox.y1) / 2;
      const nameHeight = Math.max(1, nameLine.bbox.y1 - nameLine.bbox.y0);
      const designationLine = lines.find((line) => {
        if (compactText(line.text).replace(/[：:]/g, '') !== '称') return false;
        const centerY = (line.bbox.y0 + line.bbox.y1) / 2;
        return line.bbox.x0 > nameLine.bbox.x0 && Math.abs(centerY - nameCenterY) <= nameHeight;
      });
      if (!designationLine) return null;
      return {
        text: '名称',
        confidence: Math.min(nameLine.confidence, designationLine.confidence),
        bbox: {
          x0: nameLine.bbox.x0,
          y0: Math.min(nameLine.bbox.y0, designationLine.bbox.y0),
          x1: designationLine.bbox.x1,
          y1: Math.max(nameLine.bbox.y1, designationLine.bbox.y1),
        },
      } satisfies OcrLine;
    })
    .filter((line): line is OcrLine => Boolean(line))
    .sort((left, right) => left.bbox.y0 - right.bbox.y0)[0];
  const labelLine = intactLabelLine ?? splitNameLabel;
  const creditCodeLine = lines
    .filter((line) => compactText(line.text).includes('信用代码'))
    .sort((left, right) => left.bbox.y0 - right.bbox.y0)[0];
  const anchorLine = labelLine ?? creditCodeLine;
  if (!anchorLine) return null;

  const labelHeight = Math.max(1, anchorLine.bbox.y1 - anchorLine.bbox.y0);
  // 新版营业执照常把“名”“称”拆为独立检测框，甚至不返回标签框。此时使用上一行
  // 信用代码作为模板锚点并保留整条名称行，依靠候选规则排除短标签，避免裁掉企业名称首字。
  const x = labelLine
    ? labelLine.bbox.x1 + labelHeight * 0.15
    : anchorLine.bbox.x0 - labelHeight * 0.5;
  const y = labelLine
    ? labelLine.bbox.y0 - labelHeight * 0.7
    : anchorLine.bbox.y1 + labelHeight * 0.2;
  const boundedX = Math.max(0, Math.min(imageSize.width - 1, x));
  const boundedY = Math.max(0, Math.min(imageSize.height - 1, y));
  const rightMargin = Math.max(8, imageSize.width * 0.025);
  const width = Math.max(1, imageSize.width - boundedX - rightMargin);
  const height = Math.max(1, Math.min(imageSize.height - boundedY, labelHeight * 2.5));
  const scale = Math.max(3, Math.min(4, 72 / labelHeight));

  if (width < labelHeight * 3 || height < labelHeight) return null;
  return { x: boundedX, y: boundedY, width, height, scale };
};

const createCompanyNameRoiCanvases = (image: HTMLImageElement, roi: CompanyNameRoi) => {
  const width = Math.max(1, Math.round(roi.width * roi.scale));
  const height = Math.max(1, Math.round(roi.height * roi.scale));
  const createCanvas = (filter: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('无法创建企业名称增强识别画布');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.filter = filter;
    context.drawImage(image, roi.x, roi.y, roi.width, roi.height, 0, 0, width, height);
    context.filter = 'none';
    return canvas;
  };

  return [createCanvas('none'), createCanvas('grayscale(1) contrast(1.45)')];
};

const cleanCompanyNameCandidate = (value: string) => value
  .replace(/^(?:(?:企业)?名称|称)[：:;；,，.。一—\-\s]*/, '')
  .replace(/[\s　]/g, '')
  .replace(/^[：:;；,，.。一—\-]+/, '')
  .trim();

const isPlausibleCompanyName = (value: string) => {
  const chineseCharacters = value.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return value.length >= 4 && value.length <= 48 && chineseCharacters >= 4;
};

interface CompanyNameCandidate {
  value: string;
  confidence: number;
  line: OcrLine;
}

export const chooseCompanyNameCandidate = (variantLines: OcrLine[][]): CompanyNameCandidate | null => {
  const candidates = variantLines.flatMap((lines) => lines.map((line) => ({
    value: cleanCompanyNameCandidate(line.text),
    confidence: line.confidence,
    line,
  }))).filter((candidate) => isPlausibleCompanyName(candidate.value));

  return candidates.sort((left, right) => {
    const leftSuffixBonus = /(?:公司|集团|企业|中心|合伙|事务所|研究院)$/.test(left.value) ? 8 : 0;
    const rightSuffixBonus = /(?:公司|集团|企业|中心|合伙|事务所|研究院)$/.test(right.value) ? 8 : 0;
    return right.confidence + rightSuffixBonus - left.confidence - leftSuffixBonus;
  })[0] ?? null;
};

const retryCompanyNameWithRoi = async (
  worker: PaddleWorker,
  image: HTMLImageElement,
  lines: OcrLine[],
  imageSize: ImageSize,
  sceneId: SceneType,
  confidenceThreshold: number,
): Promise<FieldItem | null> => {
  const roi = findCompanyNameRoi(lines, imageSize);
  if (!roi) return null;

  const canvases = createCompanyNameRoiCanvases(image, roi);
  const results = await worker.predict(canvases);
  const candidate = chooseCompanyNameCandidate(results.map((result) => paddleItemsToLines(result.items)));
  if (!candidate) return null;

  const mappedLine: OcrLine = {
    ...candidate.line,
    text: `名称：${candidate.value}`,
    bbox: {
      x0: roi.x + candidate.line.bbox.x0 / roi.scale,
      y0: roi.y + candidate.line.bbox.y0 / roi.scale,
      x1: roi.x + candidate.line.bbox.x1 / roi.scale,
      y1: roi.y + candidate.line.bbox.y1 / roi.scale,
    },
  };
  const parsed = parseBusinessFields(
    sceneId,
    [mappedLine],
    mappedLine.text,
    imageSize,
    confidenceThreshold,
  ).companyName;
  return parsed?.value ? { ...parsed, ocrEngine: 'PADDLEOCR_JS', ocrPass: 'ROI_RETRY' } : null;
};

export const processPaddleImageOcr = async (
  imageSource: string,
  sceneId: SceneType,
  confidenceThreshold = 0.85,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> => {
  try {
    const image = new Image();
    image.src = imageSource;
    const workerPromise = getPaddleWorker(onProgress);
    await image.decode();
    const worker = await workerPromise;

    onProgress?.({ status: 'running paddle ocr', progress: 0.4 });
    const [result] = await worker.predict(image);
    onProgress?.({ status: 'parsing paddle result', progress: 0.82 });

    if (!result) throw new Error('PaddleOCR.js 未返回识别结果');
    const lines = paddleItemsToLines(result.items);
    const rawText = lines.map((line) => line.text).join('\n').trim();
    if (!rawText) throw new Error('图像中未识别到可用文字，请检查清晰度、方向和遮挡情况');

    const averageConfidence = lines.length > 0
      ? lines.reduce((sum, line) => sum + line.confidence, 0) / lines.length / 100
      : 0;

    const fields = parseBusinessFields(sceneId, lines, rawText, result.image, confidenceThreshold);
    let refinedFieldIds: string[] | undefined;
    const companyNameNeedsRefinement = !fields.companyName?.value.trim()
      || fields.companyName.bbox.height < 3.5;
    if (companyNameNeedsRefinement) {
      onProgress?.({ status: 'retrying company name region', progress: 0.86 });
      const refinedCompanyName = await retryCompanyNameWithRoi(
        worker,
        image,
        lines,
        result.image,
        sceneId,
        confidenceThreshold,
      );
      if (refinedCompanyName) {
        const fullPageCompanyName = fields.companyName;
        const normalizedFullPageValue = compactText(fullPageCompanyName?.value ?? '');
        const normalizedRefinedValue = compactText(refinedCompanyName.value);
        if (normalizedFullPageValue && normalizedFullPageValue !== normalizedRefinedValue) {
          const preferRefined = refinedCompanyName.confidence >= fullPageCompanyName.confidence;
          const primary = preferRefined ? refinedCompanyName : fullPageCompanyName;
          const alternative = preferRefined ? fullPageCompanyName : refinedCompanyName;
          fields.companyName = {
            ...primary,
            status: 'CONFLICT',
            ruleMessage: `全图识别结果为“${fullPageCompanyName.value}”，名称区域增强结果为“${refinedCompanyName.value}”，请对照原图确认`,
            ocrAlternatives: [{
              engine: 'PADDLEOCR_JS',
              value: alternative.value,
              confidence: alternative.confidence,
              pass: alternative.ocrPass ?? 'FULL_PAGE',
            }],
          };
        } else {
          fields.companyName = refinedCompanyName;
        }
        refinedFieldIds = ['companyName'];
      }
    }
    // 预留最后 10% 给路由层的跨引擎补缺/交叉核验。
    onProgress?.({ status: 'paddle ocr complete', progress: 0.9 });
    return {
      fields: Object.fromEntries(
        Object.entries(fields).map(([id, field]) => [id, {
          ...field,
          ocrEngine: 'PADDLEOCR_JS' as const,
          ocrPass: field.ocrPass ?? 'FULL_PAGE' as const,
        }]),
      ),
      rawText,
      averageConfidence,
      engine: 'PADDLEOCR_JS',
      refinedFieldIds,
    };
  } catch (error) {
    paddleWorkerPromise = null;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`PaddleOCR.js 执行失败：${message}`);
  }
};
