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
  operatorId = 'TELLER_8801'
): BankStandardMessage => {
  const now = new Date();
  const timestamp = now.toISOString();
  const messageId = `MSG_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${Math.floor(1000 + Math.random() * 9000)}`;

  const fieldList = Object.values(fields).map((field) => ({
    fieldKey: field.id,
    fieldName: field.label,
    finalValue: field.value,
    ocrOriginalValue: field.ocrValue,
    source: field.source,
    confidence: field.confidence,
    ruleStatus: field.status,
    userModified: field.userModified,
  }));

  const allPassed = Object.values(fields).every((f) => f.status === 'PASSED');

  return {
    header: {
      messageId,
      sceneType,
      channelId: 'TELLER_ASSIST_V1',
      timestamp,
      operatorId,
      auditStatus: allPassed ? 'PASSED_AUTO_AUDIT' : 'PASSED_MANUAL_CONFIRMED',
    },
    fields: fieldList,
    auditTrail: {
      evidenceCount: fieldList.length,
      ruleCheckPassed: allPassed,
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
