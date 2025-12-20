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
    const { source, episodeUrl } = body || {};

    if (!source || !episodeUrl) {
      return res.status(400).json({ error: 'Missing source or episodeUrl' });
    }

    console.log(`Extracting: ${episodeUrl}`);

    // 1. Attempt Local Extraction (Static only)
    try {
        const { extractVideoUrl } = await import('./_server/parsers.js');
        const localResult = await extractVideoUrl(source, episodeUrl);
        
        if (localResult && localResult.videoUrl) {
            console.log('Local extraction successful:', localResult.videoUrl);
            return res.status(200).json(localResult);
        }
        console.log('Local extraction failed, trying remote...');
    } catch (localError) {
        console.warn('Local extraction error:', localError);
        // Continue to remote
    }

    // 2. Fallback to Remote Server
    const remoteApiUrl = process.env.REMOTE_EXTRACT_API_URL;
    if (!remoteApiUrl) {
        console.error('REMOTE_EXTRACT_API_URL is not configured');
        // If no remote configured, return failure
        return res.status(500).json({ error: 'Video extraction failed (Local failed, Remote not configured)' });
    }

    // Forward the request to the remote server
    const response = await fetch(remoteApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': req.headers['user-agent'] || 'neko-ani-proxy'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Remote extraction failed: ${response.status} ${errorText}`);
        return res.status(response.status).json({ error: 'Remote extraction failed', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Video extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract video URL', message: error?.message || String(error) });
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
