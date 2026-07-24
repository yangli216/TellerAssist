import React, { useState } from 'react';
import { X, Settings, Bot, Cpu, Save, RotateCcw } from 'lucide-react';
import { AppConfig, OcrProvider, defaultConfig, saveAppConfig } from '../config/appConfig';

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
                : formData.ocrProvider === 'REMOTE_API'
                  ? 'LLM 已关闭；当前选择行内远程 OCR，影像将按行内网关配置传输。'
                  : '🔒 LLM 已关闭，OCR 模型与规则引擎均随应用发布，识别过程不上传影像。'}
            </p>

            {/* 展开的 LLM 配置参数 */}
            {formData.llmEnabled && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
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

          {/* 2. 文字识别与可信审计板块 */}
          <div style={{
            backgroundColor: 'var(--bg-app)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Cpu size={18} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>⚡ 文字识别与校验设置</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  识别方案
                </label>
                <select
                  value={formData.ocrProvider}
                  onChange={(e) => setFormData({ ...formData, ocrProvider: e.target.value as OcrProvider })}
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
                  <option value="PADDLEOCR_JS">本地智能识别（推荐）</option>
                  <option value="TESSERACT_JS">本地兼容识别（备用）</option>
                  <option value="REMOTE_API">行内识别服务（待接入）</option>
                </select>
                <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {formData.ocrProvider === 'PADDLEOCR_JS'
                    ? '影像仅在本机处理；识别异常时自动切换备用方案，缺失字段会触发辅助复核。'
                    : formData.ocrProvider === 'TESSERACT_JS'
                      ? '兼容性备用方案，适用于智能识别暂不可用的情况，结果建议人工核对。'
                      : '当前版本仅预留配置，尚未连接正式行内识别服务。'}
                </p>
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>自动通过置信度阈值</span>
                  <strong>{Math.round(formData.autoAcceptConfidenceThreshold * 100)}%</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={formData.autoAcceptConfidenceThreshold}
                  onChange={(event) => setFormData({ ...formData, autoAcceptConfidenceThreshold: Number(event.target.value) })}
                  style={{ width: '100%' }}
                />
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
