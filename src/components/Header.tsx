import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Sun, 
  Moon, 
  Camera, 
  ChevronDown,
  Settings,
  Bot
} from 'lucide-react';
import { WorkMode, ThemeMode, SceneType } from '../types/business';
import { AppConfig } from '../config/appConfig';
import { sampleScenes } from '../mock/sampleData';

interface HeaderProps {
  mode: WorkMode;
  onModeChange: (mode: WorkMode) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  currentScene: SceneType;
  onSceneChange: (scene: SceneType) => void;
  scannerConnected: boolean;
  onScanClick: () => void;
  config: AppConfig;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  theme,
  onThemeToggle,
  currentScene,
  onSceneChange,
  scannerConnected,
  onScanClick,
  config,
  onOpenSettings
}) => {
  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--bg-header)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-sm)',
      zIndex: 20
    }}>
      {/* 1. 品牌与场景选择 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <img
            src="/logo.png"
            alt="智晓通 Logo"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              objectFit: 'cover'
            }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              智晓通
              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                V1.0
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-2px' }}>对公业务可信智能填单工作台</div>
          </div>
        </div>

        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* 高频对公场景下拉选择器 */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>当前办理场景</div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={currentScene}
              onChange={(e) => onSceneChange(e.target.value as SceneType)}
              style={{
                appearance: 'none',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.375rem 2rem 0.375rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {Object.values(sampleScenes).map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title}
                </option>
              ))}
            </select>
            <ChevronDown size={16} style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--text-secondary)'
            }} />
          </div>
        </div>
      </div>

      {/* 2. 中间：模式切换 Tab 按钮 */}
      <div style={{
        backgroundColor: 'var(--bg-app)',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        gap: '4px'
      }}>
        <button
          onClick={() => onModeChange('RECOGNITION')}
          className="btn"
          style={{
            padding: '0.4rem 1.25rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: mode === 'RECOGNITION' ? 'var(--bg-card)' : 'transparent',
            color: mode === 'RECOGNITION' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: mode === 'RECOGNITION' ? 600 : 500,
            boxShadow: mode === 'RECOGNITION' ? 'var(--shadow-sm)' : 'none',
            border: 'none'
          }}
        >
          <Zap size={16} fill={mode === 'RECOGNITION' ? 'var(--accent-primary)' : 'none'} />
          ⚡ 识别模式 (极速录入)
        </button>

        <button
          onClick={() => onModeChange('VERIFICATION')}
          className="btn"
          style={{
            padding: '0.4rem 1.25rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: mode === 'VERIFICATION' ? 'var(--bg-card)' : 'transparent',
            color: mode === 'VERIFICATION' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: mode === 'VERIFICATION' ? 600 : 500,
            boxShadow: mode === 'VERIFICATION' ? 'var(--shadow-sm)' : 'none',
            border: 'none'
          }}
        >
          <ShieldCheck size={16} />
          🛡️ 核对模式 (合规比对)
        </button>
      </div>

      {/* 3. 右侧：高拍仪抓拍控制 & 主题切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* 高拍仪设备状态与抓拍按钮 */}
        <button
          onClick={onScanClick}
          className="btn btn-primary"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.85rem'
          }}
        >
          <Camera size={16} />
          高拍仪抓拍 / 重扫描
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: scannerConnected ? '#10b981' : '#ef4444',
            display: 'inline-block'
          }} />
          {scannerConnected ? '高拍仪在线' : '离线模式'}
        </div>

        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* LLM 预留扩展状态指示 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.75rem',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: config.llmEnabled ? 'var(--status-pass-bg)' : 'var(--bg-app)',
          border: '1px solid var(--border-color)',
          color: config.llmEnabled ? 'var(--status-pass-text)' : 'var(--text-muted)'
        }}>
          <Bot size={14} />
          {config.llmEnabled ? 'AI Copilot(开启)' : 'AI Copilot(停用)'}
        </div>

        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* ⚙️ 设置按钮 */}
        <button
          onClick={onOpenSettings}
          className="btn btn-outline"
          title="系统设置与 LLM 开关"
          style={{
            padding: '0.45rem',
            borderRadius: '50%',
            width: '38px',
            height: '38px'
          }}
        >
          <Settings size={18} color="var(--text-secondary)" />
        </button>

        {/* 白天/夜间 Theme 切换按钮 */}
        <button
          onClick={onThemeToggle}
          className="btn btn-outline"
          title={theme === 'dark' ? '切换至白天模式' : '切换至暗夜模式'}
          style={{
            padding: '0.45rem',
            borderRadius: '50%',
            width: '38px',
            height: '38px'
          }}
        >
          {theme === 'dark' ? (
            <Sun size={18} color="#f59e0b" />
          ) : (
            <Moon size={18} color="#4f46e5" />
          )}
        </button>
      </div>
    </header>
  );
};
