import React, { useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileJson, Images, Play, X } from 'lucide-react';
import type { OcrProvider } from '../config/appConfig';
import type { SceneType } from '../types/business';
import {
  downloadBenchmarkReport,
  runOcrBenchmark,
  type BenchmarkReport,
  type BenchmarkSample,
} from '../services/ocrBenchmark';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId: SceneType;
  provider: OcrProvider;
  confidenceThreshold: number;
}

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
  reader.readAsDataURL(file);
});

const readAsText = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('读取标注文件失败'));
  reader.readAsText(file);
});

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  sceneId,
  provider,
  confidenceThreshold,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLInputElement>(null);
  const [samples, setSamples] = useState<BenchmarkSample[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, Record<string, string>>>({});
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [completed, setCompleted] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState('');
  const annotatedCount = useMemo(() => samples.filter((sample) => annotations[sample.fileName]).length, [samples, annotations]);

  if (!isOpen) return null;

  const handleImages = async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = [...files].filter((file) => file.type.startsWith('image/'));
    const loaded = await Promise.all(imageFiles.map(async (file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      fileName: file.name,
      imageSource: await readAsDataUrl(file),
    })));
    setSamples(loaded);
    setReport(null);
    setCompleted(0);
    setMessage(loaded.length ? `已载入 ${loaded.length} 张图片` : '未找到可用图片');
  };

  const handleAnnotations = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await readAsText(file)) as unknown;
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid annotations');
      const record = parsed as Record<string, unknown>;
      const container = record.samples && typeof record.samples === 'object'
        ? record.samples as Record<string, unknown>
        : record;
      const values = Object.fromEntries(Object.entries(container).filter((entry): entry is [string, Record<string, string>] =>
        Boolean(entry[1]) && typeof entry[1] === 'object' && !Array.isArray(entry[1]))) as Record<string, Record<string, string>>;
      setAnnotations(values);
      setMessage(`已载入标注，匹配 ${samples.filter((sample) => values[sample.fileName]).length} 张图片`);
    } catch {
      setMessage('标注 JSON 无法解析，请检查文件格式');
    }
  };

  const handleRun = async () => {
    if (!samples.length || isRunning) return;
    setIsRunning(true);
    setCompleted(0);
    setReport(null);
    setMessage('正在逐张评测，本地模型会复用，无需联网');
    try {
      const nextReport = await runOcrBenchmark(
        samples.map((sample) => ({ ...sample, expected: annotations[sample.fileName] })),
        sceneId,
        confidenceThreshold,
        provider,
        (current) => setCompleted(current),
      );
      setReport(nextReport);
      setMessage('批量评测完成');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const ratio = (value: number, total: number) => total ? `${Math.round(value / total * 100)}%` : '—';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        width: 'min(980px, 96vw)', maxHeight: '88vh', backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ height: '58px', padding: '0 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <BarChart3 size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 700 }}>批量识别评测</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>统计字段提取率、冲突率、耗时；导入标注后计算精确匹配率</div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={isRunning} title="关闭"><X size={15} /></button>
        </div>

        <div style={{ padding: '1.1rem 1.25rem', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={() => imageInputRef.current?.click()} disabled={isRunning}>
              <Images size={16} />选择多张图片
            </button>
            <input ref={imageInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(event) => {
              void handleImages(event.target.files);
              event.target.value = '';
            }} />
            <button className="btn btn-outline" onClick={() => annotationInputRef.current?.click()} disabled={isRunning}>
              <FileJson size={16} />导入标注 JSON（可选）
            </button>
            <input ref={annotationInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(event) => {
              void handleAnnotations(event.target.files?.[0]);
              event.target.value = '';
            }} />
            <button className="btn btn-primary" onClick={() => void handleRun()} disabled={!samples.length || isRunning || provider === 'REMOTE_API'}>
              <Play size={16} />{isRunning ? `评测中 ${completed}/${samples.length}` : '开始评测'}
            </button>
            {report && <button className="btn btn-outline" onClick={() => downloadBenchmarkReport(report)}><Download size={16} />导出报告</button>}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            已选 {samples.length} 张；已匹配标注 {annotatedCount} 张。标注格式：<code>{'{ "图片文件名.png": { "uscc": "...", "companyName": "..." } }'}</code>
            {message && <div style={{ color: message.includes('无法') ? 'var(--status-conflict-text)' : 'var(--accent-primary)' }}>{message}</div>}
          </div>

          {isRunning && (
            <div style={{ marginTop: '1rem', height: '8px', borderRadius: '99px', background: 'var(--bg-app)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${samples.length ? completed / samples.length * 100 : 0}%`, background: 'var(--accent-primary)', transition: 'width .2s ease' }} />
            </div>
          )}

          {report && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '1.1rem' }}>
                {[
                  ['成功样本', `${report.succeeded}/${report.total}`],
                  ['字段全提取', ratio(report.fullyExtracted, report.total)],
                  ['出现冲突', ratio(report.conflictSamples, report.total)],
                  ['平均耗时', `${(report.averageDurationMs / 1000).toFixed(1)}s`],
                  ['精确匹配', report.annotatedFields ? ratio(report.exactMatches, report.annotatedFields) : '未标注'],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.8rem', background: 'var(--bg-app)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ marginTop: '0.2rem', fontSize: '1.15rem', fontWeight: 750 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', padding: '0.6rem 0.8rem', background: 'var(--bg-app)', fontSize: '0.75rem', fontWeight: 700 }}>
                  <span>字段</span><span>提取率</span><span>精确匹配率</span>
                </div>
                {report.fieldMetrics.map((metric) => (
                  <div key={metric.fieldId} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', padding: '0.58rem 0.8rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                    <span>{metric.label}</span>
                    <span>{metric.extracted}/{metric.total} · {ratio(metric.extracted, metric.total)}</span>
                    <span>{metric.annotated ? `${metric.exactMatches}/${metric.annotated} · ${ratio(metric.exactMatches, metric.annotated)}` : '未标注'}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', maxHeight: '210px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                {report.samples.map((sample) => (
                  <div key={sample.id} style={{ display: 'grid', gridTemplateColumns: '2fr .8fr .8fr 1fr', gap: '0.5rem', padding: '0.6rem 0.8rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.76rem' }}>
                    <span title={sample.error}>{sample.fileName}{sample.error ? ' · 失败' : ''}</span>
                    <span>{sample.filledCount}/{sample.fieldCount} 字段</span>
                    <span>{sample.conflictCount} 冲突</span>
                    <span>{(sample.durationMs / 1000).toFixed(1)}s{sample.qualityIssues.length ? ` · ${sample.qualityIssues.join('/')}` : ''}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
