import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Zap, 
  Send,
  Info,
  FileCheck2,
  AlertCircle,
  Edit3,
  ShieldCheck,
} from 'lucide-react';
import { FieldItem, WorkMode, FieldStatus, BusinessScene } from '../types/business';

const OCR_ENGINE_LABELS = {
  PADDLEOCR_JS: '智能识别',
  TESSERACT_JS: '辅助复核',
} as const;

const OCR_PASS_LABELS = {
  FULL_PAGE: '全图识别',
  ROI_RETRY: '名称区域增强',
  SUPPLEMENT: '补充识别',
} as const;

const getFieldProvenance = (field: FieldItem) => {
  if (!field.ocrEngine) return field.source === 'MANUAL' ? '人工录入' : field.source;
  const engine = OCR_ENGINE_LABELS[field.ocrEngine];
  const pass = field.ocrPass ? ` · ${OCR_PASS_LABELS[field.ocrPass]}` : '';
  return field.source === 'MANUAL' ? `人工修改 · 原始 ${engine}${pass}` : `${engine}${pass}`;
};

interface FormPanelProps {
  fields: Record<string, FieldItem>;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldChange: (fieldId: string, newValue: string) => void;
  onResolveConflict: (fieldId: string, acceptedValue: string) => void;
  onConfirmField: (fieldId: string) => void;
  workMode: WorkMode;
  onSubmit: () => void;
  currentScene?: BusinessScene;
  isProcessing: boolean;
}

export const FormPanel: React.FC<FormPanelProps> = ({
  fields,
  activeFieldId,
  onFieldSelect,
  onFieldChange,
  onResolveConflict,
  onConfirmField,
  workMode,
  onSubmit,
  currentScene,
  isProcessing,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getStatusBadge = (status: FieldStatus) => {
    switch (status) {
      case 'PASSED':
        return <span className="badge badge-passed"><CheckCircle2 size={12} />已验证</span>;
      case 'REVIEW':
        return <span className="badge badge-review"><AlertTriangle size={12} />待确认</span>;
      case 'CONFLICT':
        return <span className="badge badge-conflict"><XCircle size={12} />冲突待核</span>;
      case 'MISSING':
        return <span className="badge badge-conflict"><XCircle size={12} />必填缺失</span>;
      default:
        return null;
    }
  };

  const blockingCount = Object.values(fields).filter((field) => field.status !== 'PASSED').length;
  const canSubmit = Object.keys(fields).length > 0 && blockingCount === 0 && !isProcessing;

  return (
    <div style={{
      flex: 1,
      height: '100%',
      backgroundColor: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 1. 顶部模式状态 Header */}
      <div style={{
        height: '56px',
        padding: '0 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {workMode === 'RECOGNITION'
              ? <Zap size={18} color="var(--accent-primary)" strokeWidth={2.25} aria-hidden="true" />
              : <ShieldCheck size={18} color="var(--accent-primary)" strokeWidth={2.25} aria-hidden="true" />}
            <span>{workMode === 'RECOGNITION' ? '图像信息快速识别面板' : '对公资料可信校验表单'}</span>
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {workMode === 'RECOGNITION' 
              ? '(自动提取文本用于快捷预填与拷贝)'
              : '(包含规则强校验与主数据碰撞)'}
          </span>
        </div>

        {/* 极速一键填单或核对统计 */}
        {workMode === 'RECOGNITION' ? (
          <button className="btn btn-primary" onClick={onSubmit} disabled={!canSubmit}>
            <Zap size={16} />
            生成待录入报文
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
              通过: {Object.values(fields).filter(f => f.status === 'PASSED').length}
            </span>
            {blockingCount > 0 && (
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>
                待处理: {blockingCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. 字段展示与交互列表 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        backgroundColor: 'var(--bg-app)'
      }}>
        {Object.keys(fields).length === 0 ? (
          /* 详细的材料扫入指南与防错防混淆说明卡 (水平+垂直双向居中) */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '1rem'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '560px',
              padding: '1.25rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileCheck2 size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                    当前选择业务：{currentScene?.title || '对公业务处理'}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    所需凭证分类：{currentScene?.documentType}
                  </p>
                </div>
              </div>

              {/* 必备凭证清单 Checkbox 防错 */}
              <div style={{
                backgroundColor: 'var(--bg-app)',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                marginBottom: '0.875rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <AlertCircle size={14} color="#3b82f6" />
                  防错指南：请确认高拍仪已放妥以下凭证 (避免放错图片)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(currentScene?.requiredDocsNotice || [
                    '《企业营业执照》正本或副本原件 (带二维码)',
                    '《单位撤销银行结算账户申请书》 (盖公章)',
                    '法定代表人及经办人身份证件原件'
                  ]).map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 样张放置提示 */}
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.375rem'
              }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><b>对齐样张提示：</b>{currentScene?.templateTips || '请将材料平铺于扫描光标中央，保证文字正面朝上无遮挡。'}</span>
              </div>
            </div>
          </div>
        ) : Object.values(fields).map((field) => {
          const isActive = activeFieldId === field.id;
          const isConflict = field.status === 'CONFLICT';

          return (
            <div
              key={field.id}
              onClick={() => onFieldSelect(field.id)}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '8px',
                border: `1.5px solid ${
                  isActive 
                    ? 'var(--accent-primary)' 
                    : isConflict 
                    ? 'var(--status-conflict-border)' 
                    : 'var(--border-color)'
                }`,
                padding: '1rem 1.25rem',
                boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {/* 字段 Label + 状态 Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {field.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {getFieldProvenance(field)} · 置信度 {Math.round(field.confidence * 100)}%
                  </span>
                </div>
                <div>{getStatusBadge(field.status)}</div>
              </div>

              {/* 识别模式下：快捷文本与一键复制 */}
              {workMode === 'RECOGNITION' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <button
                    className="btn btn-outline"
                    onClick={() => handleCopy(field.id, field.value)}
                    style={{ padding: '0.5rem 0.85rem' }}
                  >
                    {copiedId === field.id ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    {copiedId === field.id ? '已复制' : '复制'}
                  </button>
                  {field.status === 'REVIEW' && field.value && (
                    <button className="btn btn-primary" onClick={() => onConfirmField(field.id)}>
                      <CheckCircle2 size={16} />
                      人工确认
                    </button>
                  )}
                </div>
              ) : (
                /* 核对模式下：结构化对比与冲突处理 */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="text"
                      value={field.value}
                      readOnly={editingId !== field.id}
                      onChange={(e) => onFieldChange(field.id, e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: editingId === field.id ? 'var(--bg-card)' : 'var(--bg-app)',
                        border: editingId === field.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        outline: 'none'
                      }}
                    />
                    
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingId(editingId === field.id ? null : field.id)}
                    >
                      <Edit3 size={14} />
                      {editingId === field.id ? '锁定' : '修改'}
                    </button>
                    {field.status === 'REVIEW' && field.value && (
                      <button className="btn btn-primary btn-sm" onClick={() => onConfirmField(field.id)}>
                        <CheckCircle2 size={14} />
                        确认与原图一致
                      </button>
                    )}
                  </div>

                  {/* 规则校验提示信息 */}
                  {field.ruleMessage && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.78rem',
                      color: isConflict ? 'var(--status-conflict-text)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <Info size={14} />
                      {field.ruleMessage}
                    </div>
                  )}

                  {/* 🔴 若存在冲突：展开对比与快捷采纳面板 */}
                  {isConflict && field.hostValue && (
                    <div style={{
                      marginTop: '0.75rem',
                      backgroundColor: 'var(--status-conflict-bg)',
                      border: '1px solid var(--status-conflict-border)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--status-conflict-text)', marginBottom: '0.375rem' }}>
                        ⚠️ 检测到算法识别值与核心主机系统存在差异：
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.625rem' }}>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>OCR识别原值:</span>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{field.ocrValue}</div>
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>行内核心系统推荐:</span>
                          <div style={{ fontWeight: 600, color: '#10b981', fontFamily: 'monospace' }}>{field.hostValue}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => onResolveConflict(field.id, field.hostValue!)}
                        >
                          采纳行内核心数据
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => onResolveConflict(field.id, field.ocrValue)}
                        >
                          保留OCR识别数据
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {workMode === 'RECOGNITION' && field.ruleMessage && (
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.78rem',
                  color: isConflict ? 'var(--status-conflict-text)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.375rem'
                }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{field.ruleMessage}</span>
                </div>
              )}

              {isConflict && field.ocrAlternatives && field.ocrAlternatives.length > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  backgroundColor: 'var(--status-conflict-bg)',
                  border: '1px solid var(--status-conflict-border)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--status-conflict-text)', marginBottom: '0.5rem' }}>
                    多次识别结果不一致，请对照原图选择
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onResolveConflict(field.id, field.value)}
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>{getFieldProvenance(field)}：{field.value}</span>
                      <span>采纳</span>
                    </button>
                    {field.ocrAlternatives.map((alternative, index) => (
                      <button
                        key={`${alternative.engine}-${alternative.value}-${index}`}
                        className="btn btn-sm btn-outline"
                        onClick={() => onResolveConflict(field.id, alternative.value)}
                        style={{ justifyContent: 'space-between' }}
                      >
                        <span>
                          {OCR_ENGINE_LABELS[alternative.engine]}
                          {alternative.pass ? ` · ${OCR_PASS_LABELS[alternative.pass]}` : ''}
                          {` · ${Math.round(alternative.confidence * 100)}%：${alternative.value}`}
                        </span>
                        <span>采纳</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. 底部提交与审计确认栏 */}
      <div style={{
        height: '56px',
        padding: '0 1.25rem',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {blockingCount > 0 ? (
            <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ 尚有 {blockingCount} 项缺失、低置信或规则异常</span>
          ) : Object.keys(fields).length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>请先采集或上传业务材料</span>
          ) : (
            <span style={{ color: '#10b981', fontWeight: 600 }}>✓ 所有字段规则校验通过，允许受控提交</span>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            opacity: canSubmit ? 1 : 0.6,
            padding: '0.4rem 1.25rem',
            fontSize: '0.85rem'
          }}
        >
          <Send size={15} />
          {workMode === 'RECOGNITION' ? '导出待录入报文' : '确认无误并生成报文'}
        </button>
      </div>
    </div>
  );
};
