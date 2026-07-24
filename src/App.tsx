import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocViewer } from './components/DocViewer';
import { FormPanel } from './components/FormPanel';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { WorkMode, ThemeMode, SceneType, FieldItem } from './types/business';
import { sampleScenes } from './mock/sampleData';
import { processLocalImageOcr } from './services/localOcrEngine';
import { getAppConfig, AppConfig } from './config/appConfig';
import { generateBankMessage, BankStandardMessage } from './services/exportService';
import { validateFieldValue } from './services/businessRules';
import { captureDocument, getScannerAdapter } from './services/scannerService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const OCR_PROVIDER_LABELS: Record<AppConfig['ocrProvider'], string> = {
  PADDLEOCR_JS: '本地智能识别',
  TESSERACT_JS: '本地兼容识别',
  REMOTE_API: '行内识别服务',
};

export const App: React.FC = () => {
  const [workMode, setWorkMode] = useState<WorkMode>('RECOGNITION');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [currentSceneId, setCurrentSceneId] = useState<SceneType>('ACCOUNT_CANCEL');
  
  // App 配置状态
  const [appConfig, setAppConfig] = useState<AppConfig>(getAppConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 报文导出弹窗状态
  const [exportMessage, setExportMessage] = useState<BankStandardMessage | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  
  // 初始空状态（移除写死的 Demo 预填数据，等待柜员抓拍/上传）
  const [fields, setFields] = useState<Record<string, FieldItem>>({});
  const [imageSrc, setImageSrc] = useState<string>('');
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const scannerAdapter = getScannerAdapter();
  const [scannerConnected, setScannerConnected] = useState<boolean>(false);
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);

  // 场景改变时清空当前待拍摄状态
  useEffect(() => {
    const scene = sampleScenes[currentSceneId];
    setFields({});
    setImageSrc('');
    setActiveFieldId(null);
    showToast('info', `已切换至【${scene.title}】场景，请通过高拍仪抓拍或点击上传材料`);
  }, [currentSceneId]);

  // 主题改变时更新 DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    scannerAdapter.isReady().then((ready) => {
      if (active) setScannerConnected(ready);
    }).catch(() => {
      if (active) setScannerConnected(false);
    });
    return () => { active = false; };
  }, [scannerAdapter]);

  const showToast = (type: 'success' | 'info' | 'warning', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast('info', `已切换至【${nextTheme === 'dark' ? '暗夜护眼模式' : '明亮白天模式'}】`);
  };

  const handleFieldChange = (id: string, newValue: string) => {
    const validation = validateFieldValue(currentSceneId, id, newValue, 1, appConfig.autoAcceptConfidenceThreshold, true);
    setFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        value: newValue,
        source: 'MANUAL',
        confidence: 1,
        status: validation.status,
        ruleMessage: validation.ruleMessage,
        userModified: true,
      }
    }));
  };

  const handleConfirmField = (id: string) => {
    const field = fields[id];
    if (!field) return;
    const validation = validateFieldValue(currentSceneId, id, field.value, 1, appConfig.autoAcceptConfidenceThreshold, true);
    setFields((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        status: validation.status,
        ruleMessage: validation.status === 'PASSED' ? '已由柜员对照原图确认' : validation.ruleMessage,
        userModified: true,
      },
    }));
    showToast(validation.status === 'PASSED' ? 'success' : 'warning', validation.ruleMessage);
  };

  const handleResolveConflict = (id: string, acceptedValue: string) => {
    const validation = validateFieldValue(currentSceneId, id, acceptedValue, 1, appConfig.autoAcceptConfidenceThreshold, true);
    setFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        value: acceptedValue,
        source: 'MANUAL',
        confidence: 1,
        status: validation.status,
        userModified: true,
        ruleMessage: validation.status === 'PASSED' ? '已人工确认并通过字段规则校验' : validation.ruleMessage,
      }
    }));
    showToast(validation.status === 'PASSED' ? 'success' : 'warning', validation.ruleMessage);
  };

  const runOcr = async (source: string) => {
    setImageSrc(source);
    setFields({});
    setActiveFieldId(null);
    setIsOcrRunning(true);
    setOcrProgress(0);
    showToast('info', `正在使用 ${OCR_PROVIDER_LABELS[appConfig.ocrProvider]} 执行识别...`);

    try {
      const ocrRes = await processLocalImageOcr(
        source,
        currentSceneId,
        appConfig.autoAcceptConfidenceThreshold,
        ({ progress }) => setOcrProgress(Math.round(progress * 100)),
        appConfig.ocrProvider,
      );
      setFields(ocrRes.fields);
      setActiveFieldId(Object.keys(ocrRes.fields)[0] || null);
      const reviewCount = Object.values(ocrRes.fields).filter((field) => field.status !== 'PASSED').length;
      if (ocrRes.fallbackReason) {
        showToast(
          'warning',
          '智能识别暂不可用，已自动切换至备用识别，请重点核对结果',
        );
      } else if (ocrRes.conflictedFieldIds?.length) {
        showToast(
          'warning',
          `检测到 ${ocrRes.conflictedFieldIds.length} 个识别结果分歧或低置信度字段，已拦截自动通过`,
        );
      } else if (ocrRes.supplementedFieldIds?.length) {
        showToast(
          'warning',
          `智能识别完成，辅助复核补全 ${ocrRes.supplementedFieldIds.length} 个缺失字段，请重点核对`,
        );
      } else {
        showToast(
          reviewCount > 0 ? 'warning' : 'success',
          reviewCount > 0
            ? `${OCR_PROVIDER_LABELS[ocrRes.engine]} 完成，${reviewCount} 个字段需要柜员核对`
            : `${OCR_PROVIDER_LABELS[ocrRes.engine]} 完成，平均置信度 ${Math.round(ocrRes.averageConfidence * 100)}%`,
        );
      }
    } catch (error) {
      setFields({});
      console.error('文字识别执行失败', error);
      showToast(
        'warning',
        appConfig.ocrProvider === 'REMOTE_API'
          ? '行内识别服务尚未接入，请在设置中选择本地识别'
          : '识别未完成，请检查图片清晰度后重试；如仍失败，可在设置中切换备用识别',
      );
    } finally {
      setIsOcrRunning(false);
      setOcrProgress(0);
    }
  };

  const handleScanClick = async () => {
    try {
      const capture = await captureDocument(sampleScenes[currentSceneId]);
      await runOcr(capture.imageSource);
    } catch (error) {
      showToast('warning', error instanceof Error ? error.message : String(error));
    }
  };

  const handleImageUpload = async (newSrc: string) => runOcr(newSrc);

  const handleSubmit = () => {
    const blockingFields = Object.values(fields).filter((field) => field.status !== 'PASSED');
    if (Object.keys(fields).length === 0 || blockingFields.length > 0) {
      showToast('warning', Object.keys(fields).length === 0 ? '请先识别业务材料' : `仍有 ${blockingFields.length} 个字段未通过校验`);
      return;
    }

    try {
      const msg = generateBankMessage(currentSceneId, fields);
      setExportMessage(msg);
      setIsExportOpen(true);
      showToast('success', '已生成待行内集成层消费的对公填单 JSON 报文');
    } catch (error) {
      showToast('warning', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      {/* 顶部 Navigation */}
      <Header
        mode={workMode}
        onModeChange={setWorkMode}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        currentScene={currentSceneId}
        onSceneChange={setCurrentSceneId}
        scannerConnected={scannerConnected}
        scannerStatusLabel={scannerAdapter.mode === 'DEMO' ? '样张适配器' : scannerAdapter.displayName}
        isOcrRunning={isOcrRunning}
        ocrProgress={ocrProgress}
        onScanClick={handleScanClick}
        config={appConfig}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 主工作区：宽屏 4:6 双栏响应式 */}
      <main style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* 左侧原图与 BBox 证据框视角 */}
        <DocViewer
          imageSrc={imageSrc}
          fields={fields}
          activeFieldId={activeFieldId}
          onFieldSelect={setActiveFieldId}
          workMode={workMode}
          onImageUpload={handleImageUpload}
        />

        {/* 右侧智能表单与核对校验 */}
        <FormPanel
          fields={fields}
          activeFieldId={activeFieldId}
          onFieldSelect={setActiveFieldId}
          onFieldChange={handleFieldChange}
          onResolveConflict={handleResolveConflict}
          onConfirmField={handleConfirmField}
          workMode={workMode}
          onSubmit={handleSubmit}
          currentScene={sampleScenes[currentSceneId]}
          isProcessing={isOcrRunning}
        />
      </main>

      {/* ⚙️ 系统设置与 LLM 开关模态框 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={appConfig}
        onConfigChange={(newConfig) => {
          setAppConfig(newConfig);
          showToast('info', `配置已更新，LLM AI Copilot: 【${newConfig.llmEnabled ? '开启(预览)' : '未启用(V1离线模式)'}】`);
        }}
      />

      {/* 📄 标准填单报文受控生成模态框 */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        message={exportMessage}
      />

      {/* 浮动 Toast 提醒 */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toastMessage.type === 'success' ? '#064e3b' : '#1e293b',
          color: toastMessage.type === 'success' ? '#6ee7b7' : '#f8fafc',
          border: `1px solid ${toastMessage.type === 'success' ? '#047857' : '#334155'}`,
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 100,
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} color="#6ee7b7" /> : <AlertCircle size={18} color="#38bdf8" />}
          {toastMessage.text}
        </div>
      )}
    </div>
  );
};
