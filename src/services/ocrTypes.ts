import type { FieldItem } from '../types/business';

export type LocalOcrEngineId = 'PADDLEOCR_JS' | 'TESSERACT_JS';

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  fields: Record<string, FieldItem>;
  rawText: string;
  averageConfidence: number;
  engine: LocalOcrEngineId;
  fallbackReason?: string;
  supplementedFieldIds?: string[];
  refinedFieldIds?: string[];
  conflictedFieldIds?: string[];
}
