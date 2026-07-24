import { FieldItem, SceneType } from '../types/business';

export interface BankStandardMessage {
  header: {
    messageId: string;
    sceneType: SceneType;
    channelId: string;
    timestamp: string;
    operatorId: string;
    auditStatus: string;
  };
  fields: Array<{
    fieldKey: string;
    fieldName: string;
    finalValue: string;
    ocrOriginalValue: string;
    source: string;
    ocrEngine?: string;
    confidence: number;
    ruleStatus: string;
    userModified: boolean;
  }>;
  auditTrail: {
    evidenceCount: number;
    ruleCheckPassed: boolean;
  };
}

export const generateBankMessage = (
  sceneType: SceneType,
  fields: Record<string, FieldItem>,
  operatorId = 'LOCAL_OPERATOR_UNVERIFIED'
): BankStandardMessage => {
  const fieldValues = Object.values(fields);
  if (fieldValues.length === 0) throw new Error('不能生成空报文，请先完成材料识别');
  const blockingFields = fieldValues.filter((field) => field.status !== 'PASSED');
  if (blockingFields.length > 0) {
    throw new Error(`报文生成被阻止：${blockingFields.map((field) => field.label).join('、')} 未通过校验`);
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const messageId = `MSG_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${crypto.randomUUID()}`;

  const fieldList = Object.values(fields).map((field) => ({
    fieldKey: field.id,
    fieldName: field.label,
    finalValue: field.value,
    ocrOriginalValue: field.ocrValue,
    source: field.source,
    ocrEngine: field.ocrEngine,
    confidence: field.confidence,
    ruleStatus: field.status,
    userModified: field.userModified,
  }));

  const hasManualChanges = fieldValues.some((field) => field.userModified);

  return {
    header: {
      messageId,
      sceneType,
      channelId: 'TELLER_ASSIST_V1',
      timestamp,
      operatorId,
      auditStatus: hasManualChanges ? 'PASSED_MANUAL_VALIDATED' : 'PASSED_AUTO_VALIDATION',
    },
    fields: fieldList,
    auditTrail: {
      evidenceCount: fieldValues.filter((field) => field.bbox.width > 0 && field.bbox.height > 0).length,
      ruleCheckPassed: true,
    },
  };
};

export const downloadJsonFile = (filename: string, data: object) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
