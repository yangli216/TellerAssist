import type { OcrResultItem, PaddleOCRCreateOptions } from '@paddleocr/paddleocr-js';
import ortWasmUrl from '@ort-wasm-jsep';
import type { FieldItem, SceneType } from '../types/business';
import type { OcrProgress, OcrResult } from './ocrTypes';
import type { ImageSize, OcrLine } from './businessRules';
import { getFieldDefinitions, parseBusinessFields, toPercentBBox } from './businessRules';
import { mergeRankedFieldCandidates, type FieldCandidate } from './fieldCandidates';
import { preprocessDocumentImage, rotateImageSource } from './imagePreprocessing';

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

interface FieldRoi extends CompanyNameRoi { fieldId: string; label: string; aliases: string[] }

const findFieldRoi = (
  fieldId: string,
  label: string,
  aliases: string[],
  lines: OcrLine[],
  imageSize: ImageSize,
): FieldRoi | null => {
  if (fieldId === 'companyName') {
    const companyRoi = findCompanyNameRoi(lines, imageSize);
    return companyRoi ? { ...companyRoi, fieldId, label, aliases } : null;
  }
  const aliasMatches = aliases
    .flatMap((alias) => lines
      .filter((line) => compactText(line.text).includes(compactText(alias)))
      .map((line) => ({ line, alias })))
    .sort((left, right) => compactText(right.alias).length - compactText(left.alias).length
      || left.line.bbox.y0 - right.line.bbox.y0);
  const splitMatch = aliases.map(compactText).filter((alias) => alias.length === 2).flatMap((alias) => {
    const first = lines.find((line) => compactText(line.text).replace(/[：:]/g, '') === alias[0]);
    if (!first) return [];
    const firstCenterY = (first.bbox.y0 + first.bbox.y1) / 2;
    const firstHeight = Math.max(1, first.bbox.y1 - first.bbox.y0);
    const second = lines.find((line) => line.bbox.x0 > first.bbox.x0
      && compactText(line.text).startsWith(alias[1])
      && Math.abs((line.bbox.y0 + line.bbox.y1) / 2 - firstCenterY) <= firstHeight);
    if (!second) return [];
    return [{
      alias,
      line: {
        text: `${alias[0]}${second.text}`,
        confidence: Math.min(first.confidence, second.confidence),
        bbox: {
          x0: first.bbox.x0,
          y0: Math.min(first.bbox.y0, second.bbox.y0),
          x1: second.bbox.x1,
          y1: Math.max(first.bbox.y1, second.bbox.y1),
        },
      } satisfies OcrLine,
    }];
  }).sort((left, right) => left.line.bbox.y0 - right.line.bbox.y0)[0];
  const match = aliasMatches[0] ?? splitMatch;
  if (!match) return null;
  const lineHeight = Math.max(1, match.line.bbox.y1 - match.line.bbox.y0);
  const text = compactText(match.line.text);
  const alias = compactText(match.alias);
  const aliasIndex = text.indexOf(alias);
  const hasInlineValue = text.slice(aliasIndex + alias.length).replace(/^[：:;；,，.。一—\-]+/, '').length > 0;
  const inlineStartRatio = (aliasIndex + alias.length) / Math.max(1, text.length);
  const proposedX = hasInlineValue
    ? match.line.bbox.x0 + (match.line.bbox.x1 - match.line.bbox.x0) * inlineStartRatio - lineHeight * 0.35
    : match.line.bbox.x1 - lineHeight * 0.2;
  const x = Math.max(0, Math.min(imageSize.width - 1, proposedX));
  const y = Math.max(0, match.line.bbox.y0 - lineHeight * 0.65);
  const rightMargin = Math.max(8, imageSize.width * 0.02);
  const width = Math.max(1, imageSize.width - x - rightMargin);
  const rowMultiplier = fieldId === 'address' ? 4.2 : 2.5;
  const height = Math.max(1, Math.min(imageSize.height - y, lineHeight * rowMultiplier));
  const scale = Math.max(2.2, Math.min(4, 68 / lineHeight));
  return width >= lineHeight * 2 && height >= lineHeight ? {
    fieldId, label, aliases, x, y, width, height, scale,
  } : null;
};

const createFieldRoiCanvases = (image: HTMLImageElement, roi: FieldRoi) =>
  createCompanyNameRoiCanvases(image, roi);

const PARTIAL_LABEL_PATTERNS: Record<string, RegExp> = {
  uscc: /^(?:统一)?(?:社会)?(?:信用)?代码/,
  companyName: /^(?:企业)?名?称/,
  companyType: /^(?:市场主体|企业)?类?型/,
  legalPerson: /^(?:法定)?代?表?人|^法人/,
  regCapital: /^(?:原)?(?:注册)?资?本/,
  establishDate: /^(?:成立|设立)?日?期/,
  changeDate: /^(?:变更|申请)?日?期/,
  address: /^(?:注册)?住?所(?:地址)?/,
};

const stripFieldLabel = (fieldId: string, value: string, aliases: string[]) => {
  let cleaned = value.trim();
  for (const alias of [...aliases].sort((left, right) => right.length - left.length)) {
    cleaned = cleaned.replace(new RegExp(`^(?:${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})[：:;；,，.。一—\\-\\s]*`), '');
  }
  cleaned = cleaned.replace(PARTIAL_LABEL_PATTERNS[fieldId] ?? /$^/, '');
  return cleaned.replace(/^[：:;；,，.。一—\-\s]+/, '').replace(/[\s　]/g, '').trim();
};

const linesToFieldCandidates = (
  roi: FieldRoi,
  variantLines: OcrLine[][],
  imageSize: ImageSize,
): Omit<FieldCandidate, 'score'>[] => {
  const allAliases = getFieldDefinitions('ACCOUNT_CANCEL').flatMap((definition) => definition.aliases);
  const boundaryLabels = [...allAliases, '经营范围', '营业期限', '登记机关', '发照日期', '登记状态'];
  const candidates: Omit<FieldCandidate, 'score'>[] = [];
  for (const lines of variantLines) {
    const ordered = [...lines].sort((left, right) => left.bbox.y0 - right.bbox.y0 || left.bbox.x0 - right.bbox.x0);
    const usable = ordered.filter((line) => {
      const text = compactText(line.text);
      if (roi.fieldId === 'address' && /日期|范围|资本|代表人|信用代码|名称/.test(text)) return false;
      return !boundaryLabels.some((alias) => !roi.aliases.includes(alias) && text.startsWith(compactText(alias)));
    });
    const firstLine = usable[0];
    const firstLineCenter = firstLine ? (firstLine.bbox.y0 + firstLine.bbox.y1) / 2 : 0;
    const firstLineHeight = firstLine ? Math.max(1, firstLine.bbox.y1 - firstLine.bbox.y0) : 1;
    const joinable = roi.fieldId === 'address'
      ? usable.slice(0, 2)
      : usable.filter((line) => Math.abs((line.bbox.y0 + line.bbox.y1) / 2 - firstLineCenter) <= firstLineHeight);
    const rawValues = [
      ...usable.map((line) => ({ value: stripFieldLabel(roi.fieldId, line.text, roi.aliases), lines: [line] })),
      ...(joinable.length > 1 ? [{
        value: stripFieldLabel(roi.fieldId, joinable.map((line) => line.text).join(''), roi.aliases),
        lines: joinable,
      }] : []),
    ];
    for (const raw of rawValues) {
      if (!raw.value) continue;
      const bbox = raw.lines.reduce((box, line) => ({
        x0: Math.min(box.x0, line.bbox.x0),
        y0: Math.min(box.y0, line.bbox.y0),
        x1: Math.max(box.x1, line.bbox.x1),
        y1: Math.max(box.y1, line.bbox.y1),
      }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
      const mappedBbox = {
        x0: roi.x + bbox.x0 / roi.scale,
        y0: roi.y + bbox.y0 / roi.scale,
        x1: roi.x + bbox.x1 / roi.scale,
        y1: roi.y + bbox.y1 / roi.scale,
      };
      candidates.push({
        value: raw.value,
        confidence: raw.lines.reduce((sum, line) => sum + line.confidence, 0) / raw.lines.length / 100,
        pass: 'ROI_RETRY',
        bbox: toPercentBBox(mappedBbox, imageSize),
      });
    }
  }
  return candidates;
};

const retryAllFieldsWithRoi = async (
  worker: PaddleWorker,
  image: HTMLImageElement,
  lines: OcrLine[],
  imageSize: ImageSize,
  sceneId: SceneType,
  fields: Record<string, FieldItem>,
  confidenceThreshold: number,
) => {
  const definitions = getFieldDefinitions(sceneId);
  const rois = definitions.map((definition) => findFieldRoi(
    definition.id,
    definition.label,
    definition.aliases,
    lines,
    imageSize,
  )).filter((roi): roi is FieldRoi => Boolean(roi));
  if (rois.length === 0) return { fields, refinedFieldIds: [] as string[], conflictedFieldIds: [] as string[] };
  const canvases = rois.flatMap((roi) => createFieldRoiCanvases(image, roi));
  const results = await worker.predict(canvases);
  const nextFields = { ...fields };
  const refinedFieldIds: string[] = [];
  const conflictedFieldIds: string[] = [];
  rois.forEach((roi, roiIndex) => {
    const variantLines = results.slice(roiIndex * 2, roiIndex * 2 + 2)
      .map((result) => paddleItemsToLines(result.items));
    const candidates = linesToFieldCandidates(roi, variantLines, imageSize);
    if (candidates.length === 0 || !nextFields[roi.fieldId]) return;
    const merged = mergeRankedFieldCandidates(
      sceneId,
      nextFields[roi.fieldId],
      candidates,
      confidenceThreshold,
    );
    nextFields[roi.fieldId] = merged;
    refinedFieldIds.push(roi.fieldId);
    if (merged.status === 'CONFLICT') conflictedFieldIds.push(roi.fieldId);
  });
  return { fields: nextFields, refinedFieldIds, conflictedFieldIds };
};

const pageResultScore = (
  sceneId: SceneType,
  lines: OcrLine[],
  fields: Record<string, FieldItem>,
) => {
  const filled = Object.values(fields).filter((field) => field.value.trim()).length;
  const valid = Object.values(fields).filter((field) => field.status !== 'MISSING' && field.status !== 'CONFLICT').length;
  const horizontalLines = lines.filter((line) => line.bbox.x1 - line.bbox.x0 >= line.bbox.y1 - line.bbox.y0).length;
  return filled * 100 + valid * 30 + Math.min(60, lines.length * 2)
    + horizontalLines * 2 + (filled / Math.max(1, getFieldDefinitions(sceneId).length)) * 80;
};

interface PredictedPage {
  imageSource: string;
  image: HTMLImageElement;
  lines: OcrLine[];
  imageSize: ImageSize;
  fields: Record<string, FieldItem>;
  rawText: string;
  rotation: 0 | 90 | 180 | 270;
}

const predictPage = async (
  worker: PaddleWorker,
  imageSource: string,
  sceneId: SceneType,
  confidenceThreshold: number,
  rotation: 0 | 90 | 180 | 270,
): Promise<PredictedPage> => {
  const rotatedSource = await rotateImageSource(imageSource, rotation);
  const image = new Image();
  image.src = rotatedSource;
  await image.decode();
  const [result] = await worker.predict(image);
  if (!result) throw new Error('本地智能识别未返回结果');
  const lines = paddleItemsToLines(result.items);
  const rawText = lines.map((line) => line.text).join('\n').trim();
  return {
    imageSource: rotatedSource,
    image,
    lines,
    imageSize: result.image,
    fields: parseBusinessFields(sceneId, lines, rawText, result.image, confidenceThreshold),
    rawText,
    rotation,
  };
};

export const processPaddleImageOcr = async (
  imageSource: string,
  sceneId: SceneType,
  confidenceThreshold = 0.85,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> => {
  try {
    const workerPromise = getPaddleWorker(onProgress);
    onProgress?.({ status: 'normalizing document image', progress: 0.16 });
    const preprocessed = await preprocessDocumentImage(imageSource);
    const worker = await workerPromise;

    onProgress?.({ status: 'running paddle ocr', progress: 0.4 });
    let page = await predictPage(worker, preprocessed.imageSource, sceneId, confidenceThreshold, 0);
    const expectedFieldCount = getFieldDefinitions(sceneId).length;
    const initialFilledCount = Object.values(page.fields).filter((field) => field.value.trim()).length;
    const initialHorizontalRatio = page.lines.length
      ? page.lines.filter((line) => line.bbox.x1 - line.bbox.x0 >= line.bbox.y1 - line.bbox.y0).length / page.lines.length
      : 0;
    if (initialFilledCount < Math.max(2, Math.ceil(expectedFieldCount * 0.75))
      || page.lines.length < 6 || initialHorizontalRatio < 0.65) {
      onProgress?.({ status: 'checking document orientation', progress: 0.56 });
      const orientationCandidates: PredictedPage[] = [];
      for (const rotation of [180, 90, 270] as const) {
        orientationCandidates.push(await predictPage(
          worker,
          preprocessed.imageSource,
          sceneId,
          confidenceThreshold,
          rotation,
        ));
      }
      page = [page, ...orientationCandidates].sort((left, right) =>
        pageResultScore(sceneId, right.lines, right.fields) - pageResultScore(sceneId, left.lines, left.fields))[0];
    }
    if (!page.rawText) throw new Error('图像中未识别到可用文字，请检查清晰度、方向和遮挡情况');
    onProgress?.({ status: 'retrying key field regions', progress: 0.78 });
    const refined = await retryAllFieldsWithRoi(
      worker,
      page.image,
      page.lines,
      page.imageSize,
      sceneId,
      page.fields,
      confidenceThreshold,
    );
    const averageConfidence = page.lines.length > 0
      ? page.lines.reduce((sum, line) => sum + line.confidence, 0) / page.lines.length / 100
      : 0;
    const qualityBlocksAutoPass = preprocessed.quality.issues.some((issue) =>
      issue === 'BLURRY' || issue === 'LOW_RESOLUTION');
    // 预留最后 10% 给路由层的跨引擎补缺/交叉核验。
    onProgress?.({ status: 'paddle ocr complete', progress: 0.9 });
    return {
      fields: Object.fromEntries(
        Object.entries(refined.fields).map(([id, field]) => [id, {
          ...field,
          ocrEngine: 'PADDLEOCR_JS' as const,
          ocrPass: field.ocrPass ?? 'FULL_PAGE' as const,
          ...(qualityBlocksAutoPass && field.status === 'PASSED' ? {
            status: 'REVIEW' as const,
            ruleMessage: `图片${preprocessed.quality.issues.includes('BLURRY') ? '清晰度' : '分辨率'}不足，已拦截自动通过，请对照原图确认`,
          } : {}),
        }]),
      ),
      rawText: page.rawText,
      averageConfidence,
      engine: 'PADDLEOCR_JS',
      refinedFieldIds: refined.refinedFieldIds,
      conflictedFieldIds: refined.conflictedFieldIds,
      processedImageSource: page.imageSource,
      imageQuality: preprocessed.quality,
      correctionSummary: [
        ...preprocessed.correctionSummary,
        ...(page.rotation ? [`已自动纠正 ${page.rotation}° 文档方向`] : []),
      ],
    };
  } catch (error) {
    paddleWorkerPromise = null;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`本地智能识别执行失败：${message}`);
  }
};
