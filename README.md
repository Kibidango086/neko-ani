<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Neko Ani - 动漫播放器 🎬

这是一个自适应爬虫动漫播放器，支持多源配置和智能视频提取。

## ✨ 最新改进

此项目已从 **前端 CORS 代理爬取** 改进为 **Node.js 后端爬取服务**，解决了以下问题：

- ✅ 不再依赖第三方 CORS 代理服务
- ✅ 智能 User-Agent 轮换，降低被屏蔽风险
- ✅ 指数退避重试机制，提高稳定性
- ✅ 真正的 HTML 解析（使用 JSDOM）
- ✅ 支持 iframe 嵌套页面提取
- ✅ 更好的隐私保护（数据不经过第三方）

### 1. 安装依赖
npm install
```

## Vercel 部署说明

- 已添加 `vercel.json`，并将原 `express` 路由迁移为 Vercel Serverless 函数，位于 `api/` 目录中。
- 前端由 Vite 构建输出到 `dist/`（默认），Vercel 使用 `vercel-build`（执行 `vite build`）进行静态构建。

快速部署步骤：

1. 本地构建并测试：

```bash
npm install
npm run build
npm run preview   # 可选：检查静态站点
```

2. 使用 Vercel CLI 或将仓库推到与 Vercel 关联的 Git 仓库：

```bash
npx vercel # 或 vercel --prod
```

Playwright 注意事项：

- 已将 `playwright` 替换为 `playwright-core`（减小安装体积），并在 `server/browser.ts` 中加入了 `CHROMIUM_EXECUTABLE_PATH` 支持，允许在运行时提供预下载的 Chromium 可执行文件以避免在构建阶段下载大体积浏览器。
- 新增脚本：

```bash
npm run download-browsers
# 等同于： npx playwright install chromium
```

- 使用策略建议：
  - 本地或 CI 环境需要浏览器时，运行上面的脚本来下载 Chromium（二进制会写入本地磁盘）；
  - 在 Vercel 等受限平台上，建议不要在构建阶段下载浏览器（会显著增加构建时间与体积）。可选方案：
    - 把需要浏览器的工作迁移到自托管后端或专门云主机，并让 Vercel 函数调用该后端；
    - 在 CI 中下载 Chromium 并将二进制藏入构建产物或缓存，再在部署时通过 `CHROMIUM_EXECUTABLE_PATH` 指定其路径；
    - 若你更想简化依赖，可选择 `playwright-chromium`（仅包含 Chromium 支持，通常更小）。

如果你希望，我可以：
- 帮你把 `server/` 的 TypeScript 预编译到 `dist/server`（用于自托管场景）；或
- 帮你把依赖切换为 `playwright-chromium` 并适配启动设置，以进一步减小体积。

### 2. 同时运行前端和后端
```bash
npm run dev
```

✨ 会自动启动：
- 前端：http://localhost:3000 (Vite)
- 后端：http://localhost:3001 (Express API)

### 3. 或分别运行
```bash
# 终端1：前端
npm run dev:client

# 终端2：后端
npm run dev:server
```

## 📚 文档

- **[快速启动](./QUICKSTART.md)** - 详细的启动步骤
- **[架构说明](./ARCHITECTURE.md)** - 完整的技术改进说明
- **[API 文档](./ARCHITECTURE.md#新增-api-端点)** - 后端 API 接口说明

## 🏗️ 项目结构

```
neko-ani/
├── server/                 # Node.js 后端
│   ├── index.ts           # Express 服务器
│   ├── parsers.ts         # 爬取核心逻辑
│   └── validator.ts       # 配置验证工具
├── services/              # 前端服务
│   ├── parserService.ts   # 调用后端 API
│   └── bangumiService.ts  # Bangumi 数据源
├── pages/                 # React 页面
├── components/            # React 组件
├── types.ts               # TypeScript 类型定义
├── vite.config.ts         # Vite 配置（含 API 代理）
└── package.json           # 项目依赖
```

## 🔗 API 接口

后端提供三个主要接口：

### `POST /api/search` - 搜索
```json
{
  "source": { /* MediaSource 对象 */ },
  "keyword": "搜索关键词"
}
```
返回搜索结果列表。

### `POST /api/episodes` - 获取剧集
```json
{
  "source": { /* MediaSource 对象 */ },
  "detailUrl": "详情页面链接"
}
```
返回剧集列表。

### `POST /api/extract-video` - 提取视频
```json
{
  "source": { /* MediaSource 对象 */ },
  "episodeUrl": "剧集页面链接"
}
```
返回 `{ videoUrl: "视频直链" }`。

## 🛠️ 后端特性

### 智能爬虫
- 🔄 自动 User-Agent 轮换
- ⏱️ 指数退避重试（1s, 2s, 4s...）
- 📊 完整的 HTTP 请求头
- 🌐 支持 iframe 递归提取

### 正则匹配
- 支持命名捕获组 `(?<v>...)`
- 自动处理转义路径
- 优先级：命名组 > 第一组 > 完整匹配

## ⚙️ 配置源

在 `store.tsx` 中定义 `MediaSource` 配置：

```typescript
const source: MediaSource = {
  factoryId: "mySource",
  version: 1,
  arguments: {
    name: "我的动漫网站",
    searchConfig: {
      searchUrl: "https://example.com/search?q={keyword}",
      subjectFormatId: "a",
      selectorSubjectFormatA: {
        selectLists: "a.anime-item"
      },
      channelFormatId: "flattened",
      selectorChannelFormatFlattened: {
        selectEpisodeLists: "ul.episodes",
        selectEpisodesFromList: "li a"
      },
      matchVideo: {
        enableNestedUrl: true,
        matchNestedUrl: "player|video",
        matchVideoUrl: "https?://[^\"']+\\.m3u8"
      }
    }
  }
};
```

## 🧪 测试

```bash
# 测试后端 API
bash test-backend.sh
```

## 📦 生产构建

```bash
npm run build        # 构建前端
npm run build:server # 构建后端
npm start            # 运行生产版本
```

## 🐳 Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/server/index.js"]
```

## 🔧 故障排查

### 后端无法启动
```bash
# 检查 3001 端口是否被占用
lsof -i :3001

# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

### 爬取失败
- 查看后端日志输出
- 检查网站选择器是否改变
- 尝试在浏览器中手动访问 URL

## 📝 环境变量

创建 `.env.local` 文件：
```bash
GEMINI_API_KEY=your_key_here
```

参考 `.env.example` 了解更多。

## 📄 许可证

MIT

## 💡 下一步

- [x] 后端爬虫服务
- [ ] 缓存层（Redis）
- [ ] 代理轮换支持
- [ ] 监控告警系统
- [ ] 数据持久化

---

📖 **更多信息** 见 [ARCHITECTURE.md](./ARCHITECTURE.md) 和 [QUICKSTART.md](./QUICKSTART.md)
