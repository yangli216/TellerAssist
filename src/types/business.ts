export type WorkMode = 'RECOGNITION' | 'VERIFICATION';
export type ThemeMode = 'dark' | 'light';

export type SceneType = 
  | 'ACCOUNT_CANCEL'             // 对公账户销户申请 (最高频)
  | 'BUSINESS_LICENSE_UPDATE'    // 单位营业执照变更更新 (高频)
  | 'MANAGER_CHANGE';            // 网银管理员变更 (高频)

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FieldStatus = 'PASSED' | 'REVIEW' | 'CONFLICT' | 'MISSING';

export interface FieldItem {
  id: string;
  label: string;
  value: string;
  ocrValue: string;
  hostValue?: string;
  source: 'OCR' | 'HOST' | 'MANUAL';
  confidence: number;
  bbox: BBox;
  status: FieldStatus;
  ruleMessage?: string;
  userModified: boolean;
}

export interface BusinessScene {
  id: SceneType;
  title: string;
  description: string;
  documentType: string;
  sampleImage: string;
  requiredDocsNotice: string[];
  templateTips: string;
  fields: Record<string, FieldItem>;
}

export interface ScannerDeviceInfo {
  id: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SCANNING';
  resolution: string;
}
