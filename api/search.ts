export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || (await parseJson(req));
    const { source, keyword } = body || {};

    if (!source || !keyword) {
      return res.status(400).json({ error: 'Missing source or keyword' });
    }

    console.log('Backend API: Search fallback request received');
    // 动态导入解析模块以捕获导入期错误
    const { searchSource } = await import('./_server/parsers.js');
    const results = await searchSource(source, keyword);
    return res.status(200).json(results);
  } catch (error) {
    console.error('Backend API: Search fallback error:', error);
    return res.status(500).json({
      error: 'Backend search fallback failed',
      message: 'Please install the userscript for better performance',
    });
  }
}

async function parseJson(req: any) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}
