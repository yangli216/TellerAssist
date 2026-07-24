import type { OcrProvider } from '../config/appConfig';
import { FieldItem, SceneType } from '../types/business';
import { ImageSize, OcrLine, parseBusinessFields } from './businessRules';
import { processPaddleImageOcr } from './paddleOcrEngine';
import type { OcrProgress, OcrResult } from './ocrTypes';

export type { OcrProgress, OcrResult } from './ocrTypes';

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: OcrLine['bbox'];
}

interface TesseractBlock {
  paragraphs: Array<{ lines: TesseractLine[] }>;
}

let workerPromise: ReturnType<typeof createOfflineWorker> | null = null;
let tesseractProgressListener: ((progress: OcrProgress) => void) | undefined;

const getAssetBaseUrl = () => new URL('ocr/', document.baseURI).href.replace(/\/$/, '');

const createOfflineWorker = async () => {
  const { createWorker } = await import('tesseract.js');
  const assetBaseUrl = getAssetBaseUrl();
  return createWorker('chi_sim', 1, {
    workerPath: `${assetBaseUrl}/worker.min.js`,
    corePath: `${assetBaseUrl}/core`,
    langPath: `${assetBaseUrl}/lang`,
    cacheMethod: 'none',
    logger: (message) => tesseractProgressListener?.({ status: message.status, progress: message.progress }),
  });
};

const getWorker = (onProgress?: (progress: OcrProgress) => void) => {
  tesseractProgressListener = onProgress;
  if (!workerPromise) workerPromise = createOfflineWorker();
  return workerPromise;
};

const readImageSize = async (imageSource: string): Promise<ImageSize> => {
  const image = new Image();
  image.src = imageSource;
  await image.decode();
  return { width: image.naturalWidth, height: image.naturalHeight };
};

const flattenLines = (blocks: TesseractBlock[] | null): OcrLine[] =>
  (blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));

const processTesseractImageOcr = async (
  imageDataUrl: string,
  sceneId: SceneType,
  confidenceThreshold = 0.85,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> => {
  try {
    const [worker, imageSize] = await Promise.all([getWorker(onProgress), readImageSize(imageDataUrl)]);
    const { data } = await worker.recognize(imageDataUrl, {}, { text: true, blocks: true });
    const lines = flattenLines(data.blocks as TesseractBlock[] | null);
    const rawText = data.text.trim();

    if (!rawText) throw new Error('图像中未识别到可用文字，请检查清晰度、方向和遮挡情况');

    const fields = parseBusinessFields(sceneId, lines, rawText, imageSize, confidenceThreshold);
    return {
      fields: Object.fromEntries(
        Object.entries(fields).map(([id, field]) => [id, {
          ...field,
          ocrEngine: 'TESSERACT_JS' as const,
          ocrPass: 'FULL_PAGE' as const,
        }]),
      ),
      rawText,
      averageConfidence: Math.max(0, Math.min(1, data.confidence / 100)),
      engine: 'TESSERACT_JS',
    };
  } catch (error) {
    workerPromise = null;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Tesseract.js 执行失败：${message}`);
  }
};

const normalizedOcrValue = (value: string) => value.replace(/[\s　：:]/g, '').trim();

interface FieldMergeResult {
  fields: Record<string, FieldItem>;
  supplementedFieldIds: string[];
  conflictedFieldIds: string[];
}

export const mergeOcrFields = (
  paddleFields: Record<string, FieldItem>,
  tesseractFields: Record<string, FieldItem>,
  fieldIds: string[],
  confidenceThreshold: number,
): FieldMergeResult => {
  const fields = { ...paddleFields };
  const supplementedFieldIds: string[] = [];
  const conflictedFieldIds: string[] = [];

  for (const fieldId of fieldIds) {
    const paddleField = fields[fieldId];
    const tesseractField = tesseractFields[fieldId];
    if (!paddleField || !tesseractField) continue;

    const paddleValue = paddleField.value.trim();
    const tesseractValue = tesseractField.value.trim();
    if (!paddleValue && tesseractValue) {
      supplementedFieldIds.push(fieldId);
      const supplementedField: FieldItem = {
        ...tesseractField,
        ocrPass: 'SUPPLEMENT',
      };
      if (tesseractField.confidence < confidenceThreshold) {
        supplementedField.status = 'CONFLICT';
        supplementedField.ruleMessage = `智能识别未提取该字段；辅助复核结果置信度仅 ${Math.round(tesseractField.confidence * 100)}%，已拦截自动通过`;
        conflictedFieldIds.push(fieldId);
      }
      fields[fieldId] = supplementedField;
      continue;
    }

    if (paddleValue && !tesseractValue) {
      if (paddleField.confidence < confidenceThreshold) {
        fields[fieldId] = {
          ...paddleField,
          status: 'CONFLICT',
          ruleMessage: `辅助复核未提取该字段；智能识别结果置信度仅 ${Math.round(paddleField.confidence * 100)}%，已拦截自动通过`,
        };
        conflictedFieldIds.push(fieldId);
      }
      continue;
    }

    if (paddleValue && tesseractValue
      && normalizedOcrValue(paddleValue) !== normalizedOcrValue(tesseractValue)) {
      fields[fieldId] = {
        ...paddleField,
        status: 'CONFLICT',
        ruleMessage: `智能识别结果为“${paddleValue}”，辅助复核结果为“${tesseractValue}”，两次结果不一致，请对照原图确认`,
        ocrAlternatives: [
          ...(paddleField.ocrAlternatives ?? []),
          {
            engine: 'TESSERACT_JS',
            value: tesseractValue,
            confidence: tesseractField.confidence,
            pass: 'SUPPLEMENT',
          },
        ],
      };
      conflictedFieldIds.push(fieldId);
    }
  }

  return { fields, supplementedFieldIds, conflictedFieldIds };
};

export const processLocalImageOcr = async (
  imageDataUrl: string,
  sceneId: SceneType,
  confidenceThreshold = 0.85,
  onProgress?: (progress: OcrProgress) => void,
  provider: OcrProvider = 'PADDLEOCR_JS',
): Promise<OcrResult> => {
  if (provider === 'REMOTE_API') {
    throw new Error('行内识别服务尚未接入，请在设置中选择本地识别');
  }

  if (provider === 'TESSERACT_JS') {
    return processTesseractImageOcr(imageDataUrl, sceneId, confidenceThreshold, onProgress);
  }

  try {
    const paddleResult = await processPaddleImageOcr(
      imageDataUrl,
      sceneId,
      confidenceThreshold,
      onProgress,
    );
    const missingFieldIds = Object.values(paddleResult.fields)
      .filter((field) => !field.value.trim())
      .map((field) => field.id);
    const fieldsToCrossCheck = [...new Set([
      ...missingFieldIds,
      ...(paddleResult.refinedFieldIds ?? []),
    ])];
    if (fieldsToCrossCheck.length === 0) {
      onProgress?.({ status: 'ocr complete', progress: 1 });
      return paddleResult;
    }

    try {
      const tesseractResult = await processTesseractImageOcr(
        imageDataUrl,
        sceneId,
        confidenceThreshold,
        ({ status, progress }) => onProgress?.({
          status: `supplement ${status}`,
          progress: 0.92 + progress * 0.08,
        }),
      );
      const mergeResult = mergeOcrFields(
        paddleResult.fields,
        tesseractResult.fields,
        fieldsToCrossCheck,
        confidenceThreshold,
      );
      if (mergeResult.supplementedFieldIds.length === 0 && mergeResult.conflictedFieldIds.length === 0) {
        onProgress?.({ status: 'ocr complete', progress: 1 });
        return paddleResult;
      }

      onProgress?.({ status: 'ocr complete', progress: 1 });
      return {
        ...paddleResult,
        fields: mergeResult.fields,
        supplementedFieldIds: mergeResult.supplementedFieldIds,
        conflictedFieldIds: mergeResult.conflictedFieldIds,
      };
    } catch {
      // Paddle 已成功时，补缺引擎失败不应丢弃主识别结果。
      onProgress?.({ status: 'ocr complete', progress: 1 });
      return paddleResult;
    }
  } catch (paddleError) {
    const fallbackReason = paddleError instanceof Error ? paddleError.message : String(paddleError);
    onProgress?.({ status: 'falling back to tesseract', progress: 0.02 });
    try {
      const fallbackResult = await processTesseractImageOcr(
        imageDataUrl,
        sceneId,
        confidenceThreshold,
        onProgress,
      );
      return { ...fallbackResult, fallbackReason };
    } catch (tesseractError) {
      const secondaryReason = tesseractError instanceof Error ? tesseractError.message : String(tesseractError);
      throw new Error(`本地识别均执行失败。${fallbackReason}；${secondaryReason}`);
    }
  }
};
