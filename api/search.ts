export default async function handler(req: any, res: any) {
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
    // 动态导入解析模块以捕获导入期错误
    const { searchSource } = await import('./_server/parsers.ts');
    const results = await searchSource(source, keyword);
    return res.status(200).json(results);
  } catch (error) {
    console.error('Search error:', error);
    // 返回更多调试信息（临时）以便在部署中快速定位问题
    return res.status(500).json({
      error: 'Search failed',
      message: error?.message || String(error),
      stack: error?.stack || null
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
