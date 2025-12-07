export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || (await parseJson(req));
    const { source, detailUrl } = body || {};

    if (!source || !detailUrl) {
      return res.status(400).json({ error: 'Missing source or detailUrl' });
    }
    // 动态导入以捕获导入期错误
    const { getEpisodes } = await import('./_server/parsers.js');
    const episodes = await getEpisodes(source, detailUrl);
    return res.status(200).json(episodes);
  } catch (error) {
    console.error('Episodes error:', error);
    return res.status(500).json({ error: 'Failed to get episodes', message: error?.message || String(error) });
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
