import { describe, expect, it } from 'vitest';
import type { FieldItem } from '../types/business';
import { mergeOcrFields } from './localOcrEngine';

const field = (
  value: string,
  confidence: number,
  engine: FieldItem['ocrEngine'],
): FieldItem => ({
  id: 'companyName',
  label: '企业名称',
  value,
  ocrValue: value,
  source: 'OCR',
  ocrEngine: engine,
  ocrPass: 'FULL_PAGE',
  confidence,
  bbox: { x: 10, y: 20, width: 30, height: 3 },
  status: 'REVIEW',
  ruleMessage: '请人工确认',
  userModified: false,
});

describe('mergeOcrFields', () => {
  it('Paddle 缺失且 Tesseract 低置信度时标记冲突', () => {
    const result = mergeOcrFields(
      { companyName: field('', 0, 'PADDLEOCR_JS') },
      { companyName: field('殿动科技有限公司', 0.73, 'TESSERACT_JS') },
      ['companyName'],
      0.85,
    );

    expect(result.fields.companyName.value).toBe('殿动科技有限公司');
    expect(result.fields.companyName.status).toBe('CONFLICT');
    expect(result.fields.companyName.ocrPass).toBe('SUPPLEMENT');
    expect(result.conflictedFieldIds).toEqual(['companyName']);
  });

  it('两引擎结果不一致时保留 Paddle 主值并记录候选', () => {
    const result = mergeOcrFields(
      { companyName: field('悦动科技有限公司', 0.92, 'PADDLEOCR_JS') },
      { companyName: field('殿动科技有限公司', 0.73, 'TESSERACT_JS') },
      ['companyName'],
      0.85,
    );

    expect(result.fields.companyName.value).toBe('悦动科技有限公司');
    expect(result.fields.companyName.status).toBe('CONFLICT');
    expect(result.fields.companyName.ocrAlternatives?.[0].value).toBe('殿动科技有限公司');
  });
});
