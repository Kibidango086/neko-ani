import fetch from 'node-fetch';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const url = (req.query && req.query.url) || (req.url && new URL(req.url, `http://${req.headers.host}`).searchParams.get('url'));

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    console.log(`Proxy request -> ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(url).origin + '/',
        'Origin': new URL(url).origin,
      },
      timeout: 15000,
    } as any);

    if (!response.ok) {
      console.error(`Proxy failed: HTTP ${response.status} for ${url}`);
      return res.status(response.status).json({ error: `Remote server returned ${response.status}`, url });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    if (url.endsWith('.m3u8') || contentType.includes('application/vnd.apple.mpegurl')) {
      let content = buffer.toString('utf-8');
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      const lines = content.split('\n');
      const convertedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        let fullUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          fullUrl = new URL(trimmed, baseUrl).href;
        }
        const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(fullUrl)}`;
        const leadingSpaces = line.match(/^\s*/)[0];
        return leadingSpaces + proxyUrl;
      });
      content = convertedLines.join('\n');
      buffer = Buffer.from(content, 'utf-8');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', buffer.length.toString());

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Media proxy error:', error);
    return res.status(500).json({ error: 'Media proxy failed', message: error?.message || String(error) });
  }
}
