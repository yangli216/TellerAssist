import React, { useEffect, useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Upload, 
  Layers,
  BarChart3,
} from 'lucide-react';
import { FieldItem, WorkMode } from '../types/business';

interface DocViewerProps {
  imageSrc: string;
  fields: Record<string, FieldItem>;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  workMode: WorkMode;
  onImageUpload: (newSrc: string) => void;
  onOpenBenchmark: () => void;
}

export const DocViewer: React.FC<DocViewerProps> = ({
  imageSrc,
  fields,
  activeFieldId,
  onFieldSelect,
  workMode,
  onImageUpload,
  onOpenBenchmark,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 });

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom - 0.25, 0.5);
    if (nextZoom <= 1) setPan({ x: 0, y: 0 });
    setZoom(nextZoom);
  };
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [imageSrc]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-ocr-marker]')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: dragStartRef.current.panX + event.clientX - dragStartRef.current.pointerX,
      y: dragStartRef.current.panY + event.clientY - dragStartRef.current.pointerY,
    });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

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
      // 清空 value，确保选择同名文件或重复点击时百分百触发 onChange
      e.target.value = '';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Layers size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {workMode === 'VERIFICATION' ? '证据链对比视角' : '快速扫描识别'}
          </span>
          <span
            title="分辨率：2400×3200，300DPI"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            (分辨率: 2400×3200 300DPI)
          </span>
        </div>

        {/* 缩放、旋转、重新上传按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, marginLeft: '0.75rem' }}>
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
          <button
            className="btn btn-outline btn-sm"
            onClick={onOpenBenchmark}
            title="批量识别评测"
            aria-label="批量识别评测"
          >
            <BarChart3 size={14} />
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
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-app)',
        cursor: imageSrc && zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
        userSelect: isDragging ? 'none' : 'auto',
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
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
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
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 200px)',
                objectFit: 'contain'
              }}
            />

            {/* 绘制 OCR 包围框 (BBox) Overlay */}
            {Object.values(fields).map((field) => {
              if (field.bbox.width <= 0 || field.bbox.height <= 0) return null;
              const isActive = activeFieldId === field.id;
              // OCR 多边形通常会比字形顶部多包含少量行高，显示层轻微下移以贴合原文字。
              // 仅校准可视标记，不修改字段中用于审计的原始坐标。
              const markerYOffset = Math.min(field.bbox.height * 0.12, 0.35);
              
              let borderColor = 'rgba(16, 185, 129, 0.7)';
              
              if (field.status === 'REVIEW') {
                borderColor = 'rgba(245, 158, 11, 0.9)';
              } else if (field.status === 'CONFLICT') {
                borderColor = 'rgba(239, 68, 68, 0.95)';
              }

              if (isActive) {
                borderColor = '#2563eb';
              }

              return (
                <div
                  key={field.id}
                  data-ocr-marker
                  onClick={() => onFieldSelect(field.id)}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={{
                    position: 'absolute',
                    left: `${field.bbox.x}%`,
                    top: `${field.bbox.y + markerYOffset}%`,
                    width: `${field.bbox.width}%`,
                    height: `${field.bbox.height}%`,
                    border: `${2 / zoom}px ${isActive ? 'solid' : 'dashed'} ${borderColor}`,
                    backgroundColor: 'transparent',
                    borderRadius: `${4 / zoom}px`,
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 0 0 ${2 / zoom}px rgba(37, 99, 235, 0.22)` : 'none',
                    transition: 'all 0.15s ease-in-out',
                    zIndex: isActive ? 10 : 2
                  }}
                  title={`${field.label}：${field.value || '未识别'}`}
                  aria-label={`${field.label}：${field.value || '未识别'}`}
                />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <span style={{ whiteSpace: 'nowrap' }}>图文证据链：<strong style={{ color: 'var(--text-primary)' }}>已建立坐标点位映射 ({Object.keys(fields).length}处)</strong></span>
          {activeFieldId && fields[activeFieldId] && (
            <span style={{ color: 'var(--accent-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              当前定位：{fields[activeFieldId].label} · {fields[activeFieldId].value || '未识别'}
            </span>
          )}
        </div>
        <div style={{ whiteSpace: 'nowrap', marginLeft: '1rem' }}>
          {zoom > 1 ? '按住画面拖动查看 · 点击标记联动字段' : '点击表单可联动高亮原图坐标'}
        </div>
      </div>
    </div>
  );
};
