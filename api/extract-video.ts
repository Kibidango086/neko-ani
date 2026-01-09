import fetch from 'node-fetch';

const setCORS = (res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: any, res: any) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || (await parseJson(req));
    const { source, episodeUrl, browserlessEndpoint } = body || {};

    if (!source || !episodeUrl) {
      return res.status(400).json({ error: 'Missing source or episodeUrl' });
    }

    console.log(`Backend API: Video extraction fallback for ${episodeUrl}`);

    try {
        const { extractVideoUrl } = await import('./_server/parsers.js');
        const result = await extractVideoUrl(source, episodeUrl, browserlessEndpoint);
        
        if (result && result.videoUrl) {
            console.log('Backend API: Extraction successful:', result.videoUrl);
            return res.status(200).json(result);
        }
        
        return res.status(404).json({ 
          error: 'Video URL not found via backend fallback', 
          debug: result?.debug,
          message: 'Please install the userscript for better video extraction'
        });
    } catch (error) {
        console.error('Backend API: Extraction fallback error:', error);
        return res.status(500).json({ 
          error: 'Backend extraction fallback failed', 
          message: 'Please install the userscript for better performance',
        });
    }

  } catch (error) {
    console.error('Backend API: Request error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
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