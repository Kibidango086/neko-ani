# 🤖 Gemini 协同开发记录

本文档记录了 Gemini CLI Agent 在此项目中的开发足迹及关键逻辑实现，方便后续交接或维护。

## 🎯 核心攻克点

### 1. 视频播放跨域方案 (CORS Bypass)
- **演进过程**：从最初的简单 Fetch 代理，演进到全局拦截，最终定稿为 **静态文件 + 规范化 Loader 桥接**。
- **实现细节**：
  - `neko-helper.user.js`: 静态存储的油猴脚本，通过 `GM_xmlhttpRequest` 提供特权网络访问。
  - `UserscriptLoader`: 在 `Details.tsx` 中手动实现 `hls.js` 的 Loader 接口。
  - **关键修复**：补全了 `stats` 对象中的 `loading`, `parsing`, `buffering` 子对象，解决了 `hls.js` v1.x 报 `m.parsing is undefined` 的崩溃问题。

### 2. 多格式兼容播放系统
- **逻辑**：自动检测 URL 后缀，排除 `.mp4` 后进入 HLS 逻辑。
- **自动降级**：当 HLS 解析报出 `manifestParsingError` 时，系统会自动销毁 HLS 实例并降级为原生 HTML5 播放器，确保 MP4 文件能正常播放。

### 3. UI/UX 深度重构
- **详情页**：去掉了沉重的 Banner，改用封面图为核心的紧凑布局。实现了搜索源的**流式更新**，搜索到一个源立即渲染一个，拒绝长时间白屏等待。
- **移动端**：为设置页面添加了 `Sticky Bottom Bar`（毛玻璃效果），解决了在移动端键盘弹出或页面过长时找不到保存按钮的痛点。

### 4. 性能优化
- **缓存层**：在 `parserService.ts` 中封装了统一的 `localStorage` 缓存逻辑，TTL 设置为 2 小时，显著减少了对后端 API 的重复请求。

## 📝 维护者笔记

- **关于 Referer 伪造**：油猴脚本已支持 `X-Neko-Referer` 自定义头。如遇 403 错误，请检查 `Details.tsx` 中 `window.CURRENT_SOURCE_URL` 是否被正确设置。
- **关于静态资源**：`neko-helper.user.js` 必须保持为物理文件，不要轻易改回动态生成，以避免转义和换行符导致的语法报错。
- **TODO**：
  - [ ] 增加播放进度的本地记录功能。
  - [ ] 优化搜索算法，增加关键词自动纠错。

---
*Developed with ❤️ and Gemini CLI Agent.*
