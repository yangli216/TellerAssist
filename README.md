# 智晓通 (TellerAssist) - 对公业务可信智能填单工作台

[![GitHub Actions Release](https://github.com/yangli216/TellerAssist/actions/workflows/release.yml/badge.svg)](https://github.com/yangli216/TellerAssist/actions/workflows/release.yml)
[![Tauri 2.0](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org)

**智晓通 (TellerAssist)** 是一款专为银行柜面设计的高性能、**纯本地离线确定性**对公业务智能填单与合规核对桌面端系统。零外部网络/服务器依赖，实现企业凭证数据 100% 本地闭环处理。

---

## 🌟 核心特性

- **🔒 纯本地离线计算**：零数据上云风险，内置卡片模式离线 OCR 与确定性规则提取引擎。
- **⚡ 极速识别与合规核对双模式**：
  - `⚡ 识别模式`：秒级自动提取关键字段，方便柜员一键快捷复制预填至柜面系统。
  - `🛡️ 核对模式`：双栏对比、BBox 原图坐标反查定位、三色 (红/黄/绿) 风险碰撞指示。
- **📄 标准银行报文受控导出**：自动生成符合银行业核心系统规范的 JSON / XML 格式报文，并保留图文证据链存证。
- **🤖 LLM Copilot 开关预留**：架构预留大模型增强配置能力，V1 版本默认停用，可根据需要在系统设置中配置化开启。
- **💻 宽屏响应式与双主题**：支持 16:9 / 21:9 宽屏布局，提供白天明亮与暗夜护眼模式。

---

## 🛠️ 技术栈

- **桌面端框架**：Tauri 2.0 (Rust)
- **前端技术**：React 18 + TypeScript + Vite
- **图标与样式**：Lucide React + Vanilla CSS (CSS Variables 设计系统)
- **自动化构建**：GitHub Actions (`.github/workflows/release.yml`) 自动构建 Windows (.msi/.exe) 与 macOS 安装包。

---

## 🚀 快速启动

### 前置条件
- [Node.js](https://nodejs.org/) (>= 18)
- [Rust](https://www.rust-lang.org/) (最新 Stable 版本)

### 开发命令

```bash
# 1. 安装项目依赖
yarn install

# 2. 启动前端 + Tauri 桌面本地开发模式
yarn tauri dev

# 3. 构建前端生产产物
npm run build
```

---

## 📦 自动构建与发布 (CI/CD)

项目已配置 GitHub Actions 自动打包流水线。推送标签（例如 `v1.0.0`）或在 GitHub 项目页面手动触发工作流，即可自动编译生成：
- Windows 64位安装包 (`.msi` / `.exe`)
- macOS 镜像安装包 (`.dmg` / `.app`)

---

## 📄 开源许可

[MIT License](LICENSE) © [yangli216](https://github.com/yangli216)
