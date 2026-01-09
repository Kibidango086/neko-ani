# 🐾 Neko-Ani (猫番)

一个基于 React + Vite 的现代化番剧聚合搜索与在线播放平台。结合了 Bangumi 数据引擎与强大的视频提取解决方案。

## ✨ 特性

- **聚合搜索**：多源番剧搜索，快速寻找在线资源。
- **现代化 UI**：遵循 Material Design 3 设计原则，采用紧凑型卡片布局，美观且高效。
- **卓越的播放体验**：
  - 支持 HLS (.m3u8) 与原生 MP4 播放。
  - 自动识别视频格式并选择最佳播放策略。
- **混合架构**：
  - **油猴脚本**：用于搜索和剧集列表获取，提供快速响应和CORS绕过。
  - **Browserless服务**：专门用于视频URL提取，支持复杂的反爬虫机制。
- **智能缓存**：搜索结果、剧集列表及视频链接自动缓存 2 小时，极速响应。
- **移动端适配**：针对手机端优化的设置页面与交互体验。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，添加必要的配置
```

### 3. 运行开发服务器
```bash
npm run dev
```

### 4. 配置关键服务（强制要求）

#### 油猴脚本（必需）
Neko-Ani **强制要求**安装油猴脚本才能运行：
1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 访问应用时会自动显示安装横幅。
3. 点击 **Install Userscript** 安装最新版本的油猴脚本。
4. 刷新页面完成安装。

⚠️ **注意**：未安装油猴脚本时，应用的所有功能都将不可用。

#### Browserless API（必需）
视频提取需要Browserless服务：
1. 在 [Browserless.io](https://browserless.io/) 注册账号。
2. 获取API密钥。
3. 在 **Settings** 页面的 **Browserless API Keys** 部分添加您的密钥。
4. 可以添加多个密钥实现负载均衡和故障转移。

## 🏗️ 架构说明

### 搜索和剧集列表
- **主要方式**：油猴脚本直接在用户浏览器中执行，速度快、无服务器负载。
- **备用方式**：Vercel API代理（当油猴脚本不可用时）。

### 视频URL提取
- **专用服务**：仅使用Browserless无头浏览器服务。
- **优势**：完整的浏览器环境，支持JavaScript执行、动态内容加载、反爬虫绕过。
- **功能**：网络请求监听、自定义脚本执行、等待选择器、正则匹配。

## 🛠️ 技术栈

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Player**: Hls.js, HTML5 Video
- **Backend**: Node.js Serverless Functions (Vercel)
- **Video Extraction**: Browserless (Puppeteer/Playwright)
- **Data**: Bangumi API
- **Userscript**: Tampermonkey

## 📁 项目结构

```
├── api/                    # Vercel API函数
│   ├── search.ts           # 搜索API（备用）
│   ├── episodes.ts         # 剧集列表API（备用）
│   ├── extract-video.ts     # 视频提取API（Browserless）
│   ├── helper.user.ts      # 油猴脚本服务
│   └── _server/           # 服务器端工具
│       ├── browser.ts      # Browserless服务封装
│       └── parsers.ts      # 网站解析器
├── components/            # React组件
├── pages/               # 页面组件
├── services/           # 前端服务层
├── neko-helper.user.js  # 油猴脚本文件
└── dist/               # 构建输出
```

## ⚙️ 环境变量

```env
# Browserless配置（可选，用户可在设置中配置）
BROWSERLESS_URL=your_browserless_endpoint
```

## 📄 开源协议
MIT