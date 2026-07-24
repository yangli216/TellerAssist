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
import { CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [scannerConnected, setScannerConnected] = useState<boolean>(true);
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
    setFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        value: newValue,
        userModified: true,
      }
    }));
  };

  const handleResolveConflict = (id: string, acceptedValue: string) => {
    setFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        value: acceptedValue,
        status: 'PASSED',
        userModified: true,
        ruleMessage: '已人工确认，采纳推荐数据并完成闭环存证',
      }
    }));
    showToast('success', `字段 [${fields[id]?.label}] 冲突已解决并自动校验通过`);
  };

  const handleScanClick = async () => {
    setScannerConnected(false);
    showToast('info', '高拍仪抓拍中，正在调取采样材料并进行纯本地离线 OCR 推理...');
    
    // 加载当前场景采样影像并调用离线 OCR
    const scene = sampleScenes[currentSceneId];
    const targetSrc = scene.sampleImage;
    setImageSrc(targetSrc);

    const ocrRes = await processLocalImageOcr(targetSrc, currentSceneId);
    setFields(ocrRes.fields);
    setActiveFieldId(Object.keys(ocrRes.fields)[0] || null);
    setScannerConnected(true);
    showToast('success', '纯本地 OCR 抓拍识别完成！已自动解析结构化字段与生成坐标映射');
  };

  const handleImageUpload = async (newSrc: string) => {
    setImageSrc(newSrc);
    showToast('info', '自定扫描件已接收，正在触发纯本地离线 OCR 版面分析...');
    
    const ocrRes = await processLocalImageOcr(newSrc, currentSceneId);
    setFields(ocrRes.fields);
    setActiveFieldId(Object.keys(ocrRes.fields)[0] || null);
    showToast('success', '纯本地离线 OCR 提取成功，已生成全量标注框与可信存证');
  };

  const handleSubmit = () => {
    const msg = generateBankMessage(currentSceneId, fields);
    setExportMessage(msg);
    setIsExportOpen(true);
    showToast('success', '已受控生成银行对公填单报文！数据全存证闭环');
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
          workMode={workMode}
          onSubmit={handleSubmit}
          currentScene={sampleScenes[currentSceneId]}
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
