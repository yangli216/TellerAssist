import React, { useState } from 'react';
import { X, Download, Copy, Check, ShieldCheck } from 'lucide-react';
import { BankStandardMessage, downloadJsonFile } from '../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: BankStandardMessage | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !message) return null;

  const jsonString = JSON.stringify(message, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadJsonFile(`${message.header.messageId}.json`, message);
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
        width: '680px',
        maxWidth: '92vw',
        maxHeight: '85vh',
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
            <ShieldCheck size={22} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>受控生成 - 标准银行对公填单报文</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                本地校验已通过 | 报文流水号: {message.header.messageId}
              </p>
            </div>
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

        {/* Code Content View */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-app)'
        }}>
          <pre style={{
            margin: 0,
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontSize: '0.82rem',
            fontFamily: 'monospace',
            color: 'var(--text-primary)',
            overflowX: 'auto',
            lineHeight: 1.5
          }}>
            {jsonString}
          </pre>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
            ✓ 本文件尚未写入核心系统，需由行内集成层接收
          </span>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={handleCopy}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              {copied ? '已复制报文' : '复制 JSON'}
            </button>
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download size={16} />
              下载报文文件
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
