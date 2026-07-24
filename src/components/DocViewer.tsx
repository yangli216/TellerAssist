import React, { useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Upload, 
  Layers
} from 'lucide-react';
import { FieldItem, WorkMode } from '../types/business';

interface DocViewerProps {
  imageSrc: string;
  fields: Record<string, FieldItem>;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  workMode: WorkMode;
  onImageUpload: (newSrc: string) => void;
}

export const DocViewer: React.FC<DocViewerProps> = ({
  imageSrc,
  fields,
  activeFieldId,
  onFieldSelect,
  workMode,
  onImageUpload,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      flex: '0 0 42%',
      height: '100%',
      backgroundColor: 'var(--bg-card)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 1. 工具控制栏 */}
      <div style={{
        height: '56px',
        padding: '0 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {workMode === 'VERIFICATION' ? '🛡️ 证据链对比视角' : '⚡ 快速扫描识别'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            (分辨率: 2400×3200 300DPI)
          </span>
        </div>

        {/* 缩放、旋转、重新上传按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button className="btn btn-outline btn-sm" onClick={handleZoomOut} title="缩小">
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="btn btn-outline btn-sm" onClick={handleZoomIn} title="放大">
            <ZoomIn size={14} />
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleRotate} title="旋转90度">
            <RotateCw size={14} />
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleResetZoom} title="还原视角">
            <Maximize2 size={14} />
          </button>
          
          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          <button 
            className="btn btn-outline btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="手动上传测试影像"
          >
            <Upload size={14} />
            上传文件
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* 2. 图像画布与坐标框显示区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-app)'
      }}>
        {!imageSrc ? (
          /* 空状态：等待高拍仪抓拍或上传文件 */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '3rem 2rem',
            border: '2px dashed var(--border-color)',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
            maxWidth: '380px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: 'var(--accent-primary)'
            }}>
              <Upload size={32} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              等待材料采集
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              请将客户营业执照/申请书放置于高拍仪下方，点击右上角<b>【高拍仪抓拍】</b>，或上传本地图像。
            </p>
            <button
              className="btn btn-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              上传业务材料照片
            </button>
          </div>
        ) : (
          <div style={{
            position: 'relative',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fff',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
            <img
              src={imageSrc}
              alt="扫描证件预览"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 200px)',
                objectFit: 'contain'
              }}
            />

            {/* 绘制 OCR 包围框 (BBox) Overlay */}
            {Object.values(fields).map((field) => {
              const isActive = activeFieldId === field.id;
              
              let borderColor = 'rgba(16, 185, 129, 0.7)';
              let bgColor = 'rgba(16, 185, 129, 0.12)';
              
              if (field.status === 'REVIEW') {
                borderColor = 'rgba(245, 158, 11, 0.9)';
                bgColor = 'rgba(245, 158, 11, 0.15)';
              } else if (field.status === 'CONFLICT') {
                borderColor = 'rgba(239, 68, 68, 0.95)';
                bgColor = 'rgba(239, 68, 68, 0.2)';
              }

              if (isActive) {
                borderColor = '#2563eb';
                bgColor = 'rgba(37, 99, 235, 0.25)';
              }

              return (
                <div
                  key={field.id}
                  onClick={() => onFieldSelect(field.id)}
                  style={{
                    position: 'absolute',
                    left: `${field.bbox.x}%`,
                    top: `${field.bbox.y}%`,
                    width: `${field.bbox.width}%`,
                    height: `${field.bbox.height}%`,
                    border: `2px ${isActive ? 'solid' : 'dashed'} ${borderColor}`,
                    backgroundColor: bgColor,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 12px rgba(37, 99, 235, 0.8)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                    zIndex: isActive ? 10 : 2
                  }}
                  title={`点击查看证据: ${field.label}`}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '0',
                    backgroundColor: isActive ? '#2563eb' : (field.status === 'CONFLICT' ? '#dc2626' : '#374151'),
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    fontWeight: 600
                  }}>
                    {field.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 底部状态指示 */}
      <div style={{
        height: '56px',
        padding: '0 1.25rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>图文证据链：<strong style={{ color: 'var(--text-primary)' }}>已建立坐标点位映射 ({Object.keys(fields).length}处)</strong></span>
        </div>
        <div>
          提示: 点击表单可联动高亮原图坐标
        </div>
      </div>
    </div>
  );
};
