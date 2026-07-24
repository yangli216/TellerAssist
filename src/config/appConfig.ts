export type OcrProvider = 'PADDLEOCR_JS' | 'TESSERACT_JS' | 'REMOTE_API';

export interface AppConfig {
  // LLM 开关与配置 (首版默认关闭，预留扩展能力)
  llmEnabled: boolean;
  llmEndpoint: string;
  llmModel: string;
  llmApiKey?: string;

  // OCR 与提取服务设置
  ocrProvider: OcrProvider;
  remoteOcrEndpoint?: string;

  // 校验敏感度
  autoAcceptConfidenceThreshold: number; // 默认 0.85
  auditLogEnabled: boolean;
}

const CONFIG_STORAGE_KEY = 'teller_assist_app_config_v1';

export const defaultConfig: AppConfig = {
  llmEnabled: false, // V1 版本默认关闭
  llmEndpoint: 'http://localhost:11434/v1',
  llmModel: 'qwen2.5:7b',
  ocrProvider: 'PADDLEOCR_JS',
  autoAcceptConfidenceThreshold: 0.85,
  auditLogEnabled: true,
};

export const getAppConfig = (): AppConfig => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Omit<Partial<AppConfig>, 'ocrProvider'> & {
        ocrProvider?: OcrProvider | 'LOCAL_OFFLINE';
      };
      return {
        ...defaultConfig,
        ...parsed,
        // 旧版本只有一个本地 OCR 选项；升级后默认迁移到推荐的 PaddleOCR.js。
        ocrProvider: parsed.ocrProvider === 'LOCAL_OFFLINE'
          ? 'PADDLEOCR_JS'
          : parsed.ocrProvider ?? defaultConfig.ocrProvider,
      };
    }
  } catch (e) {
    console.warn('Failed to load local config, using defaults:', e);
  }
  return defaultConfig;
};

export const saveAppConfig = (config: AppConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage:', e);
  }
};
