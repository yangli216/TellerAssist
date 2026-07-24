# 智晓通 (TellerAssist) - 对公业务可信智能填单工作台

[![GitHub Actions Release](https://github.com/yangli216/TellerAssist/actions/workflows/release.yml/badge.svg)](https://github.com/yangli216/TellerAssist/actions/workflows/release.yml)
[![Tauri 2.0](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org)

**智晓通 (TellerAssist)** 是一款专为银行柜面设计的高性能、**纯本地离线确定性**对公业务智能填单与合规核对桌面端系统。零外部网络/服务器依赖，实现企业凭证数据 100% 本地闭环处理。

---

## 🌟 核心特性

- **🔒 纯本地离线计算**：默认使用 PaddleOCR.js PP-OCRv5 mobile，识别模型、ONNX Runtime WASM 与备用 Tesseract.js 均随安装包发布，运行时不从 CDN 下载模型。
- **🔎 高风险字段增强与交叉核验**：企业名称会按执照版式裁剪 ROI、放大并以多种图像版本二次识别；Paddle 与 Tesseract 结果不一致或补充结果低于阈值时进入冲突待核，禁止静默自动通过。
- **⚡ 极速识别与合规核对双模式**：
  - `⚡ 识别模式`：秒级自动提取关键字段，方便柜员一键快捷复制预填至柜面系统。
  - `🛡️ 核对模式`：双栏对比、BBox 原图坐标反查定位、三色 (红/黄/绿) 风险碰撞指示。
- **📄 受控 JSON 报文导出**：空报文、必填缺失、低置信度和规则异常会阻止导出；报文区分自动校验与人工确认。
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

# 4. 运行规则和报文准入测试
npm test
```

`npm run dev` 和 `npm run build` 会先准备 PaddleOCR.js、ONNX Runtime 和 Tesseract.js 资源到 `public/ocr/`，该目录是可再生的构建产物。PaddleOCR 模型首次构建时从官方固定地址下载到 `.cache/ocr-models/`，校验 SHA-256 后打入应用；已缓存模型可用于后续离线构建。

---

## 🚧 落地边界

当前版本已使用真实离线 OCR 结果和确定性规则，不会在识别失败时填入演示数据。下列能力需在试点前根据目标银行和设备厂商完成集成：

- 高拍仪厂商 SDK 与设备状态协议；界面中的“样张抓拍”仍是演示采集适配器。
- 行内客户主数据、账户、身份与印鉴核验接口。
- 行内正式报文字典、通讯加密、签名、重试和幂等机制。
- 符合行内制度的操作员身份、审计日志、影像归档与数据保留策略。

---

## 📦 自动构建与发布 (CI/CD)

项目已配置 GitHub Actions 自动打包流水线。推送标签（例如 `v1.0.0`）或在 GitHub 项目页面手动触发工作流，即可自动编译生成：
- Windows 64位安装包 (`.msi` / `.exe`)
- macOS 镜像安装包 (`.dmg` / `.app`)

---

## 📄 开源许可

[MIT License](LICENSE) © [yangli216](https://github.com/yangli216)
