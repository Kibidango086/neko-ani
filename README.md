# 🐾 Neko-Ani (猫番)

一个基于 React + Vite 的现代化番剧聚合搜索与在线播放平台。结合了 Bangumi 数据引擎与强大的跨域播放解决方案。

## ✨ 特性

- **聚合搜索**：多源番剧搜索，快速寻找在线资源。
- **现代化 UI**：遵循 Material Design 3 设计原则，采用紧凑型卡片布局，美观且高效。
- **卓越的播放体验**：
  - 支持 HLS (.m3u8) 与原生 MP4 播放。
  - 自动识别视频格式并选择最佳播放策略。
- **强大的跨域绕过**：内置独创的油猴脚本桥接技术，彻底解决视频流加载的 CORS 限制。
- **智能缓存**：搜索结果、剧集列表及视频链接自动缓存 2 小时，极速响应。
- **移动端适配**：针对手机端优化的设置页面与交互体验。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 运行开发服务器
```bash
npm run dev
```

### 3. 配置油猴脚本（关键）
为了绕过视频网站的跨域限制（CORS）和防盗链：
1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 进入应用的 **Settings (设置)** 页面。
3. 点击 **Install Helper Script** 或复制代码手动新建脚本。
4. 在设置中开启 **Use Userscript Helper** 选项。

## 🛠️ 技术栈

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Player**: Hls.js, HTML5 Video
- **Backend**: Node.js Serverless Functions (Vercel)
- **Data**: Bangumi API, Browserless

## 📄 开源协议
MIT
