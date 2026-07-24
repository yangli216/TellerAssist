export interface AppConfig {
  // LLM 开关与配置 (首版默认关闭，预留扩展能力)
  llmEnabled: boolean;
  llmEndpoint: string;
  llmModel: string;
  llmApiKey?: string;

  // OCR 与提取服务设置
  ocrProvider: 'LOCAL_OFFLINE' | 'REMOTE_API';
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
  ocrProvider: 'LOCAL_OFFLINE',
  autoAcceptConfidenceThreshold: 0.85,
  auditLogEnabled: true,
};

export const getAppConfig = (): AppConfig => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
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
