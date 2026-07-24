import React, { useState } from 'react';
import { X, Settings, Bot, Cpu, Save, RotateCcw } from 'lucide-react';
import { AppConfig, defaultConfig, saveAppConfig } from '../config/appConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
}) => {
  const [formData, setFormData] = useState<AppConfig>(config);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppConfig(formData);
    onConfigChange(formData);
    onClose();
  };

  const handleReset = () => {
    setFormData(defaultConfig);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: '560px',
        maxWidth: '90vw',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Settings size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>系统设置 & 扩展能力配置</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 1. LLM 能力预留开关板块 */}
          <div style={{
            backgroundColor: 'var(--bg-app)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={18} color={formData.llmEnabled ? '#10b981' : 'var(--text-muted)'} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>🤖 LLM 大模型 Copilot 扩展</span>
              </div>
              
              {/* 开关 Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: formData.llmEnabled ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                  {formData.llmEnabled ? '已启用 (开发预览)' : '已停用 (V1默认)'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.llmEnabled}
                  onChange={(e) => setFormData({ ...formData, llmEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </label>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {formData.llmEnabled 
                ? '提示：LLM 模式开启后，系统将尝试调用远端/本地大模型执行零样本非标准合同理解与语义转换。'
                : '🔒 V1 运行模式：LLM 已关闭，系统 100% 运行于纯本地离线确定性逻辑与标准正则校验模式下，绝不上传数据。'}
            </p>

            {/* 展开的 LLM 配置参数 */}
            {formData.llmEnabled && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px stroke var(--border-color)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    LLM API Endpoint 地址
                  </label>
                  <input
                    type="text"
                    value={formData.llmEndpoint}
                    onChange={(e) => setFormData({ ...formData, llmEndpoint: e.target.value })}
                    placeholder="http://localhost:11434/v1"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    模型标识 (Model ID)
                  </label>
                  <input
                    type="text"
                    value={formData.llmModel}
                    onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
                    placeholder="qwen2.5:7b"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. OCR 与可信审计板块 */}
          <div style={{
            backgroundColor: 'var(--bg-app)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Cpu size={18} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>⚡ 离线 OCR 与规则引擎设置</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  OCR 识别提供商
                </label>
                <select
                  value={formData.ocrProvider}
                  onChange={(e) => setFormData({ ...formData, ocrProvider: e.target.value as 'LOCAL_OFFLINE' | 'REMOTE_API' })}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="LOCAL_OFFLINE">纯本地离线引擎 (PaddleOCR 算法卡片模式)</option>
                  <option value="REMOTE_API">行内远程 OCR 服务网关</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleReset}>
              <RotateCcw size={14} />
              恢复默认
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                保存配置
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
