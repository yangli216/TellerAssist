import { describe, expect, it } from 'vitest';
import type { FieldItem } from '../types/business';
import { mergeRankedFieldCandidates, rankFieldCandidates } from './fieldCandidates';

const companyNameField: FieldItem = {
  id: 'companyName',
  label: '企业名称',
  value: '殿动科技有限公司',
  ocrValue: '殿动科技有限公司',
  source: 'OCR',
  ocrEngine: 'PADDLEOCR_JS',
  ocrPass: 'FULL_PAGE',
  confidence: 0.73,
  bbox: { x: 10, y: 20, width: 30, height: 3 },
  status: 'REVIEW',
  userModified: false,
};

describe('字段候选评分与融合', () => {
  it('多次一致的区域候选获得一致性加权', () => {
    const candidates = rankFieldCandidates('ACCOUNT_CANCEL', 'companyName', [
      { value: '悦动科技有限公司', confidence: 0.82, pass: 'ROI_RETRY' },
      { value: '悦动科技有限公司', confidence: 0.84, pass: 'ROI_RETRY' },
      { value: '殿动科技有限公司', confidence: 0.86, pass: 'FULL_PAGE' },
    ]);
    expect(candidates[0].value).toBe('悦动科技有限公司');
    expect(candidates[0].confidence).toBeGreaterThan(0.84);
  });

  it('不同候选分数接近时保留主值并标记人工冲突', () => {
    const merged = mergeRankedFieldCandidates('ACCOUNT_CANCEL', companyNameField, [
      { value: '悦动科技有限公司', confidence: 0.78, pass: 'ROI_RETRY' },
    ], 0.85);
    expect(merged.status).toBe('CONFLICT');
    expect(merged.ocrAlternatives?.length).toBe(1);
  });

  it('社会信用代码优先选择校验位通过的候选', () => {
    const candidates = rankFieldCandidates('ACCOUNT_CANCEL', 'uscc', [
      { value: '91110108592366240O', confidence: 0.96, pass: 'FULL_PAGE' },
      { value: '911101085923662400', confidence: 0.86, pass: 'ROI_RETRY' },
    ]);
    expect(candidates[0].value).toBe('911101085923662400');
  });
});
