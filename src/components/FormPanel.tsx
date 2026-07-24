import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Send, 
  Info,
  Edit3,
  Zap
} from 'lucide-react';
import { FieldItem, WorkMode, FieldStatus } from '../types/business';

interface FormPanelProps {
  fields: Record<string, FieldItem>;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldChange: (fieldId: string, newValue: string) => void;
  onResolveConflict: (fieldId: string, acceptedValue: string) => void;
  workMode: WorkMode;
  onSubmit: () => void;
}

export const FormPanel: React.FC<FormPanelProps> = ({
  fields,
  activeFieldId,
  onFieldSelect,
  onFieldChange,
  onResolveConflict,
  workMode,
  onSubmit,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getStatusBadge = (status: FieldStatus) => {
    switch (status) {
      case 'PASSED':
        return <span className="badge badge-passed"><CheckCircle2 size={12} />已验证</span>;
      case 'REVIEW':
        return <span className="badge badge-review"><AlertTriangle size={12} />需确认</span>;
      case 'CONFLICT':
        return <span className="badge badge-conflict"><XCircle size={12} />冲突待核</span>;
      default:
        return null;
    }
  };

  const conflictCount = Object.values(fields).filter((f) => f.status === 'CONFLICT').length;
  const reviewCount = Object.values(fields).filter((f) => f.status === 'REVIEW').length;
  const passCount = Object.values(fields).filter((f) => f.status === 'PASSED').length;

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
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
            {workMode === 'RECOGNITION' ? '⚡ 图像信息快速识别面板' : '🛡️ 对公资料可信校验表单'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {workMode === 'RECOGNITION' 
              ? '(自动提取文本用于快捷预填与拷贝)'
              : '(包含规则强校验与主数据碰撞)'}
          </span>
        </div>

        {/* 极速一键填单或核对统计 */}
        {workMode === 'RECOGNITION' ? (
          <button className="btn btn-primary" onClick={onSubmit}>
            <Zap size={16} />
            一键自动预填至柜面系统
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-passed">通过: {passCount}</span>
            {reviewCount > 0 && <span className="badge badge-review">待确认: {reviewCount}</span>}
            {conflictCount > 0 && <span className="badge badge-conflict">冲突: {conflictCount}</span>}
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
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '2rem'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Info size={28} color="var(--text-secondary)" />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              暂无已解析的对公字段数据
            </h4>
            <p style={{ fontSize: '0.8rem', maxWidth: '320px', lineHeight: 1.5 }}>
              点击上方<b>【高拍仪抓拍 / 重扫描】</b>或拖入材料照片，纯本地 OCR 引擎将自动提取并校验数据。
            </p>
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
                    (来源: {field.source} | 置信度: {Math.round(field.confidence * 100)}%)
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
          {conflictCount > 0 ? (
            <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ 尚有 {conflictCount} 项数据冲突需核对解决</span>
          ) : (
            <span style={{ color: '#10b981', fontWeight: 600 }}>✓ 所有字段规则校验通过，允许受控提交</span>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={conflictCount > 0 && workMode === 'VERIFICATION'}
          style={{
            opacity: (conflictCount > 0 && workMode === 'VERIFICATION') ? 0.6 : 1,
            padding: '0.4rem 1.25rem',
            fontSize: '0.85rem'
          }}
        >
          <Send size={15} />
          {workMode === 'RECOGNITION' ? '导出并智能填充' : '确认无误受控写入系统'}
        </button>
      </div>
    </div>
  );
};
