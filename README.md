# 🐾 Neko-Ani

[Demo](https://neko-ani.kibidango.top)

自用简洁看番。结合了 Bangumi 。灵感来自 [Animeko](Refer to the subscription at github.com/open-ani/animeko)。

部署在 Vercel 。

基本使用 AI 生成的代码。


### 4. 配置关键服务（强制要求）

#### 登录 Bangumi
1. 到[这里](https://next.bgm.tv/demo/access-token)生成 token 。
2. 到设置页面填入。

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

#### 源
参照 [Animeko](Refer to the subscription at github.com/open-ani/animeko)。


## 🛠️ 技术栈

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Player**: Hls.js, HTML5 Video
- **Backend**: Node.js Serverless Functions (Vercel)
- **Video Extraction**: Browserless (Puppeteer/Playwright)
- **Data**: Bangumi API
- **Userscript**: Tampermonkey

## 📄 开源协议
MIT