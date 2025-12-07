import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { searchSource, getEpisodes, extractVideoUrl } from './parsers.ts';
import { closeBrowser } from './browser.ts';
import type { MediaSource } from '../types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(30000);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search for anime/videos
app.post('/api/search', async (req, res) => {
  try {
    const { source, keyword } = req.body as { source: MediaSource; keyword: string };

    if (!source || !keyword) {
      return res.status(400).json({ error: 'Missing source or keyword' });
    }

    const results = await searchSource(source, keyword);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get episodes from a detail page
app.post('/api/episodes', async (req, res) => {
  try {
    const { source, detailUrl } = req.body as { source: MediaSource; detailUrl: string };

    if (!source || !detailUrl) {
      return res.status(400).json({ error: 'Missing source or detailUrl' });
    }

    const episodes = await getEpisodes(source, detailUrl);
    res.json(episodes);
  } catch (error) {
    console.error('Episodes error:', error);
    res.status(500).json({ 
      error: 'Failed to get episodes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Extract video URL from episode
app.post('/api/extract-video', async (req, res) => {
  try {
    const { source, episodeUrl } = req.body as { source: MediaSource; episodeUrl: string };

    if (!source || !episodeUrl) {
      return res.status(400).json({ error: 'Missing source or episodeUrl' });
    }

    const videoUrl = await extractVideoUrl(source, episodeUrl);
    res.json({ videoUrl });
  } catch (error) {
    console.error('Video extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract video URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// M3U8 和媒体资源代理（处理 CORS）
app.get('/api/media-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    // 验证 URL 是否为 HTTP(s)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    console.log(`📥 代理请求: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(url).origin + '/',
        'Origin': new URL(url).origin,
      },
      timeout: 15000,
    });

    if (!response.ok) {
      console.error(`❌ 代理失败: HTTP ${response.status} for ${url}`);
      return res.status(response.status).json({ 
        error: `Remote server returned ${response.status}`,
        url 
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    
    // 如果是 m3u8 文件，修改其中的所有 URI 指向本地代理
    if (url.endsWith('.m3u8') || contentType.includes('application/vnd.apple.mpegurl')) {
      let content = buffer.toString('utf-8');
      console.log(`📋 原始 m3u8 内容 (前 500 字符):\n${content.substring(0, 500)}`);
      
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1); // 获取目录部分
      console.log(`🔗 基础 URL: ${baseUrl}`);
      
      // 按行处理，转换所有 URI 为代理链接
      const lines = content.split('\n');
      const convertedLines = lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // 跳过空行和注释行
        if (!trimmed || trimmed.startsWith('#')) {
          return line;
        }
        
        // 构建完整 URL
        let fullUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          // 相对路径，基于 m3u8 文件位置转换
          fullUrl = new URL(trimmed, baseUrl).href;
        }
        
        // 重写为代理 URL
        const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(fullUrl)}`;
        console.log(`  行 ${idx}: ${trimmed.substring(0, 50)} -> ${proxyUrl.substring(0, 80)}`);
        
        // 保留原始行的前导空格
        const leadingSpaces = line.match(/^\s*/)[0];
        return leadingSpaces + proxyUrl;
      });
      
      content = convertedLines.join('\n');
      console.log(`📝 转换后 m3u8 (前 500 字符):\n${content.substring(0, 500)}`);
      buffer = Buffer.from(content, 'utf-8');
    }

    // 设置响应头
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Content-Length', buffer.length.toString());

    res.send(buffer);
  } catch (error) {
    console.error('Media proxy error:', error);
    res.status(500).json({ 
      error: 'Media proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// OPTIONS 请求处理（用于 CORS 预检）
app.options('/api/media-proxy', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.sendStatus(200);
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err?.message || 'Unknown error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📛 收到关闭信号，清理资源...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📛 收到终止信号，清理资源...');
  await closeBrowser();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
});
