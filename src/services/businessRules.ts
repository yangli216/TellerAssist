import { BBox, FieldItem, FieldStatus, SceneType } from '../types/business';

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface ImageSize {
  width: number;
  height: number;
}

interface FieldDefinition {
  id: string;
  label: string;
  aliases: string[];
  pattern?: RegExp;
  requiresManualConfirmation?: boolean;
  validate: (value: string) => string | null;
}

const required = (label: string, minimumLength = 1) => (value: string) =>
  value.trim().length >= minimumLength ? null : `${label}未识别或内容过短`;

const dateValidator = (value: string) =>
  /(?:19|20)\d{2}\s*[年\-/.]\s*(?:0?[1-9]|1[0-2])\s*[月\-/.]\s*(?:0?[1-9]|[12]\d|3[01])日?/.test(value)
    ? null
    : '日期格式无法确认';

const phoneValidator = (value: string) =>
  /^1[3-9]\d{9}$/.test(value.replace(/\D/g, '')) ? null : '手机号应为11位大陆手机号';

const accountValidator = (value: string) => {
  const compactValue = value.replace(/\s/g, '');
  return /^\d{12,32}$/.test(compactValue) ? null : '对公账号应为12至32位数字';
};

const USCC_CHARACTERS = '0123456789ABCDEFGHJKLMNPQRTUWXY';
const USCC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];

export const validateUnifiedSocialCreditCode = (input: string): boolean => {
  const code = input.replace(/\s/g, '').toUpperCase();
  if (!/^[0-9ABCDEFGHJKLMNPQRTUWXY]{18}$/.test(code)) return false;

  const total = code
    .slice(0, 17)
    .split('')
    .reduce((sum, character, index) => sum + USCC_CHARACTERS.indexOf(character) * USCC_WEIGHTS[index], 0);
  const expectedCheckCharacter = USCC_CHARACTERS[(31 - (total % 31)) % 31];
  return code[17] === expectedCheckCharacter;
};

const usccValidator = (value: string) => {
  const code = value.replace(/\s/g, '').toUpperCase();
  if (!/^[0-9ABCDEFGHJKLMNPQRTUWXY]{18}$/.test(code)) return '统一社会信用代码应为18位';
  return validateUnifiedSocialCreditCode(code) ? null : '统一社会信用代码校验位不通过';
};

const licenseFields: FieldDefinition[] = [
  {
    id: 'uscc',
    label: '统一社会信用代码',
    aliases: ['统一社会信用代码', '社会信用代码', '信用代码'],
    pattern: /[0-9ABCDEFGHJKLMNPQRTUWXY](?:\s*[0-9ABCDEFGHJKLMNPQRTUWXY]){17}/i,
    validate: usccValidator,
  },
  { id: 'companyName', label: '企业名称', aliases: ['名称', '企业名称', '变更后企业名称'], requiresManualConfirmation: true, validate: required('企业名称', 4) },
  { id: 'legalPerson', label: '法定代表人', aliases: ['法定代表人', '法人', '新任法定代表人'], requiresManualConfirmation: true, validate: required('法定代表人', 2) },
  { id: 'regCapital', label: '注册资本', aliases: ['注册资本', '原注册资本'], requiresManualConfirmation: true, validate: required('注册资本', 2) },
  { id: 'establishDate', label: '成立日期', aliases: ['成立日期', '设立日期'], validate: dateValidator },
  { id: 'address', label: '住所地址', aliases: ['住所', '住所地址', '注册地址'], requiresManualConfirmation: true, validate: required('住所地址', 6) },
];

const licenseUpdateFields: FieldDefinition[] = [
  {
    id: 'uscc',
    label: '统一社会信用代码',
    aliases: ['统一社会信用代码', '社会信用代码', '信用代码'],
    pattern: /[0-9ABCDEFGHJKLMNPQRTUWXY](?:\s*[0-9ABCDEFGHJKLMNPQRTUWXY]){17}/i,
    validate: usccValidator,
  },
  { id: 'companyName', label: '变更后企业名称', aliases: ['变更后企业名称', '企业名称', '名称'], requiresManualConfirmation: true, validate: required('变更后企业名称', 4) },
  { id: 'legalPerson', label: '新任法定代表人', aliases: ['新任法定代表人', '法定代表人', '法人'], requiresManualConfirmation: true, validate: required('新任法定代表人', 2) },
  { id: 'regCapital', label: '原注册资本', aliases: ['原注册资本', '注册资本'], requiresManualConfirmation: true, validate: required('原注册资本', 2) },
  { id: 'changeDate', label: '变更申请日期', aliases: ['变更申请日期', '申请日期', '变更日期'], validate: dateValidator },
  { id: 'registryAuthority', label: '备案登记机关', aliases: ['备案登记机关', '登记机关', '备案机关'], requiresManualConfirmation: true, validate: required('备案登记机关', 4) },
];

const managerFields: FieldDefinition[] = [
  {
    id: 'accountNo',
    label: '单位对公结算账号',
    aliases: ['单位对公结算账号', '对公账号', '银行账号', '账号'],
    pattern: /\d(?:\s*\d){11,31}/,
    validate: accountValidator,
  },
  { id: 'companyName', label: '开户企业户名', aliases: ['开户企业户名', '单位名称', '企业名称', '户名'], requiresManualConfirmation: true, validate: required('开户企业户名', 4) },
  { id: 'oldAdmin', label: '原网银管理员', aliases: ['原网银管理员', '原管理员', '原主管'], requiresManualConfirmation: true, validate: required('原网银管理员', 2) },
  { id: 'newAdmin', label: '新任网银管理员', aliases: ['新任网银管理员', '新管理员', '新主管'], requiresManualConfirmation: true, validate: required('新任网银管理员', 2) },
  {
    id: 'phone',
    label: '管理员联系手机',
    aliases: ['管理员联系手机', '联系手机', '手机号码', '手机'],
    pattern: /1\s*[3-9](?:\s*\d){9}/,
    validate: phoneValidator,
  },
];

export const getFieldDefinitions = (sceneId: SceneType): FieldDefinition[] =>
  sceneId === 'MANAGER_CHANGE'
    ? managerFields
    : sceneId === 'BUSINESS_LICENSE_UPDATE'
      ? licenseUpdateFields
      : licenseFields;

const compact = (value: string) => value.replace(/[\s　]/g, '');

const cleanExtractedValue = (value: string) =>
  value
    .replace(/^[：:;；,，.。一—\-\s]+/, '')
    .replace(/\s+/g, '')
    .trim();

const findSameRowValueLine = (labelLine: OcrLine, lines: OcrLine[]): OcrLine | undefined => {
  const labelHeight = Math.max(1, labelLine.bbox.y1 - labelLine.bbox.y0);
  const labelCenterY = (labelLine.bbox.y0 + labelLine.bbox.y1) / 2;

  return lines
    .filter((candidate) => {
      if (candidate === labelLine || !compact(candidate.text)) return false;
      const candidateHeight = Math.max(1, candidate.bbox.y1 - candidate.bbox.y0);
      const candidateCenterY = (candidate.bbox.y0 + candidate.bbox.y1) / 2;
      const isOnSameRow = Math.abs(candidateCenterY - labelCenterY) <= Math.max(labelHeight, candidateHeight) * 0.8;
      const isToTheRight = candidate.bbox.x0 >= labelLine.bbox.x1 - labelHeight * 0.2;
      return isOnSameRow && isToTheRight;
    })
    .sort((left, right) => left.bbox.x0 - right.bbox.x0)[0];
};

const toPercentBBox = (bbox: OcrLine['bbox'], imageSize: ImageSize): BBox => ({
  x: Math.max(0, Math.min(100, (bbox.x0 / imageSize.width) * 100)),
  y: Math.max(0, Math.min(100, (bbox.y0 / imageSize.height) * 100)),
  width: Math.max(0.5, Math.min(100, ((bbox.x1 - bbox.x0) / imageSize.width) * 100)),
  height: Math.max(0.5, Math.min(100, ((bbox.y1 - bbox.y0) / imageSize.height) * 100)),
});

interface ExtractedValue {
  value: string;
  line?: OcrLine;
}

const cropLineToValue = (line: OcrLine, value: string): OcrLine => {
  const sourceText = compact(line.text);
  const valueText = compact(value);
  const valueIndex = sourceText.lastIndexOf(valueText);
  if (!valueText || valueIndex < 0 || sourceText.length === valueText.length) return line;

  const lineWidth = Math.max(1, line.bbox.x1 - line.bbox.x0);
  return {
    ...line,
    bbox: {
      ...line.bbox,
      x0: line.bbox.x0 + lineWidth * (valueIndex / sourceText.length),
      x1: line.bbox.x0 + lineWidth * ((valueIndex + valueText.length) / sourceText.length),
    },
  };
};

const extractFieldValue = (
  definition: FieldDefinition,
  lines: OcrLine[],
  rawText: string,
): ExtractedValue => {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const compactLine = compact(line.text);
    for (const alias of definition.aliases) {
      const aliasIndex = compactLine.indexOf(compact(alias));
      if (aliasIndex < 0) continue;

      const valueOnSameLine = cleanExtractedValue(compactLine.slice(aliasIndex + compact(alias).length));
      if (valueOnSameLine) return { value: valueOnSameLine, line: cropLineToValue(line, valueOnSameLine) };

      // 检测模型经常把“名称：”和值切成两个框。优先按同一行、标签右侧的几何关系取值，
      // 避免仅依赖 OCR 返回顺序而误取下一字段。
      const sameRowValue = findSameRowValueLine(line, lines);
      if (sameRowValue) {
        const value = cleanExtractedValue(sameRowValue.text);
        return { value, line: cropLineToValue(sameRowValue, value) };
      }

      const nextLine = lines.slice(index + 1).find((candidate) => compact(candidate.text).length > 0);
      if (nextLine) return { value: cleanExtractedValue(nextLine.text), line: nextLine };
    }
  }

  if (definition.pattern) {
    const match = rawText.match(definition.pattern);
    if (match) {
      const value = cleanExtractedValue(match[0]);
      const sourceLine = lines.find((line) => compact(line.text).includes(compact(value)));
      return { value, line: sourceLine ? cropLineToValue(sourceLine, value) : undefined };
    }
  }

  return { value: '' };
};

export interface FieldValidation {
  status: FieldStatus;
  ruleMessage: string;
}

export const validateFieldValue = (
  sceneId: SceneType,
  fieldId: string,
  value: string,
  confidence = 1,
  confidenceThreshold = 0.85,
  manuallyConfirmed = false,
): FieldValidation => {
  const definition = getFieldDefinitions(sceneId).find((field) => field.id === fieldId);
  if (!definition) return { status: 'REVIEW', ruleMessage: '未找到对应的业务规则' };
  if (!value.trim()) return { status: 'MISSING', ruleMessage: `${definition.label}为必填字段，当前未识别` };

  const validationError = definition.validate(value);
  if (validationError) return { status: 'REVIEW', ruleMessage: validationError };
  if (confidence < confidenceThreshold) {
    return {
      status: 'REVIEW',
      ruleMessage: `OCR 置信度 ${Math.round(confidence * 100)}% 低于自动通过阈值 ${Math.round(confidenceThreshold * 100)}%`,
    };
  }
  if (definition.requiresManualConfirmation && !manuallyConfirmed) {
    return { status: 'REVIEW', ruleMessage: '该字段无法仅凭格式确认真实性，请对照原图人工确认' };
  }
  return { status: 'PASSED', ruleMessage: '字段格式和确定性规则校验通过' };
};

export const parseBusinessFields = (
  sceneId: SceneType,
  lines: OcrLine[],
  rawText: string,
  imageSize: ImageSize,
  confidenceThreshold = 0.85,
): Record<string, FieldItem> => {
  const fields: Record<string, FieldItem> = {};

  for (const definition of getFieldDefinitions(sceneId)) {
    const extracted = extractFieldValue(definition, lines, rawText);
    const confidence = extracted.line ? Math.max(0, Math.min(1, extracted.line.confidence / 100)) : 0;
    const validation = validateFieldValue(sceneId, definition.id, extracted.value, confidence, confidenceThreshold);

    fields[definition.id] = {
      id: definition.id,
      label: definition.label,
      value: extracted.value,
      ocrValue: extracted.value,
      source: 'OCR',
      confidence,
      bbox: extracted.line ? toPercentBBox(extracted.line.bbox, imageSize) : { x: 0, y: 0, width: 0, height: 0 },
      status: validation.status,
      ruleMessage: validation.ruleMessage,
      userModified: false,
    };
  }

  return fields;
};
