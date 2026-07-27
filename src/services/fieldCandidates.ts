import type { FieldItem, OcrAlternative, SceneType } from '../types/business';
import { getFieldDefinitions, validateFieldValue, validateUnifiedSocialCreditCode } from './businessRules';

export interface FieldCandidate {
  value: string;
  confidence: number;
  score: number;
  pass: 'FULL_PAGE' | 'ROI_RETRY';
  bbox?: FieldItem['bbox'];
}

export const normalizeCandidateValue = (fieldId: string, value: string) => {
  let normalized = value
    .replace(/^[：:;；,，.。一—\-\s]+/, '')
    .replace(/[\s　]/g, '')
    .trim();
  if (fieldId === 'uscc') normalized = normalized.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (fieldId === 'establishDate' || fieldId === 'changeDate') {
    normalized = normalized.replace(/[日曰]$/, '日');
  }
  return normalized;
};

const fieldPlausibilityBonus = (fieldId: string, value: string) => {
  switch (fieldId) {
    case 'uscc':
      if (validateUnifiedSocialCreditCode(value)) return 40;
      return /^[0-9ABCDEFGHJKLMNPQRTUWXY]{18}$/.test(value) ? 8 : -35;
    case 'companyName':
      return /(?:公司|集团|企业|中心|合伙|事务所|研究院)$/.test(value) ? 15 : 0;
    case 'companyType':
      return /(?:有限责任公司|股份有限公司|个人独资企业|合伙企业|个体工商户|全民所有制|集体所有制)/.test(value) ? 18 : 0;
    case 'legalPerson':
      return /^[\u3400-\u9fff·]{2,8}$/.test(value) ? 15 : -8;
    case 'regCapital':
      return /^(?:人民币)?[零〇一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟万\d,.，]+(?:元|万元|亿元)(?:整)?$/.test(value) ? 18 : -18;
    case 'establishDate':
    case 'changeDate':
      return /(?:19|20)\d{2}[年\-/.](?:0?[1-9]|1[0-2])[月\-/.](?:0?[1-9]|[12]\d|3[01])日?/.test(value) ? 20 : -12;
    case 'address':
      if (value.length > 80 || /经营范围|营业期限|成立日期/.test(value)) return -25;
      return value.length >= 6 && /[省市区县乡镇街路号室]/.test(value) ? 14 : 0;
    default:
      return 0;
  }
};

export const scoreFieldCandidate = (
  sceneId: SceneType,
  fieldId: string,
  value: string,
  confidence: number,
  agreementCount = 1,
) => {
  const normalized = normalizeCandidateValue(fieldId, value);
  if (!normalized) return -100;
  const validation = validateFieldValue(sceneId, fieldId, normalized, 1, 0, true);
  const ruleBonus = validation.status === 'PASSED' ? 18 : -10;
  return confidence * 70 + ruleBonus + fieldPlausibilityBonus(fieldId, normalized)
    + Math.min(12, Math.max(0, agreementCount - 1) * 6);
};

export const rankFieldCandidates = (
  sceneId: SceneType,
  fieldId: string,
  candidates: Omit<FieldCandidate, 'score'>[],
): FieldCandidate[] => {
  const grouped = new Map<string, Omit<FieldCandidate, 'score'>[]>();
  for (const candidate of candidates) {
    const value = normalizeCandidateValue(fieldId, candidate.value);
    if (!value) continue;
    grouped.set(value, [...(grouped.get(value) ?? []), { ...candidate, value }]);
  }
  return [...grouped.entries()].map(([value, group]) => {
    const best = [...group].sort((left, right) => right.confidence - left.confidence)[0];
    return {
      ...best,
      value,
      confidence: Math.min(1, best.confidence + Math.min(0.06, (group.length - 1) * 0.03)),
      score: scoreFieldCandidate(sceneId, fieldId, value, best.confidence, group.length),
    };
  }).sort((left, right) => right.score - left.score);
};

export const mergeRankedFieldCandidates = (
  sceneId: SceneType,
  field: FieldItem,
  roiCandidates: Omit<FieldCandidate, 'score'>[],
  confidenceThreshold: number,
): FieldItem => {
  const ranked = rankFieldCandidates(sceneId, field.id, [
    ...(field.value ? [{
      value: field.value,
      confidence: field.confidence,
      pass: 'FULL_PAGE' as const,
      bbox: field.bbox,
    }] : []),
    ...roiCandidates,
  ]);
  if (ranked.length === 0) return field;
  const selected = ranked[0];
  const alternatives: OcrAlternative[] = ranked.slice(1)
    .filter((candidate) => candidate.value !== selected.value)
    .slice(0, 3)
    .map((candidate) => ({
      engine: 'PADDLEOCR_JS',
      value: candidate.value,
      confidence: candidate.confidence,
      pass: candidate.pass,
    }));
  const validation = validateFieldValue(
    sceneId,
    field.id,
    selected.value,
    selected.confidence,
    confidenceThreshold,
  );
  // 仅当两个候选都通过了基本语义评分且分数非常接近时才拦截。
  // ROI 中偶尔会带入相邻行，不能因为一个高置信度噪声框就制造大量假冲突。
  const hasMaterialConflict = alternatives.some((candidate) => candidate.confidence >= 0.55)
    && ranked[1] && ranked[1].score >= 65 && selected.score - ranked[1].score < 12;
  return {
    ...field,
    value: selected.value,
    ocrValue: selected.value,
    confidence: selected.confidence,
    bbox: selected.bbox ?? field.bbox,
    ocrPass: selected.pass,
    ocrAlternatives: alternatives.length > 0 ? alternatives : undefined,
    status: hasMaterialConflict ? 'CONFLICT' : validation.status,
    ruleMessage: hasMaterialConflict
      ? `全图与区域增强得到不同结果（当前候选“${selected.value}”），请对照原图确认`
      : validation.ruleMessage,
  };
};

export const licenseFieldIds = (sceneId: SceneType) => getFieldDefinitions(sceneId).map((field) => field.id);
