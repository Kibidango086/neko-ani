import { MediaSource, VideoSourceResult, VideoEpisode } from '../types';

// Check if userscript bridge is available
const checkUserscriptBridge = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (window.NEKO_ANI_BRIDGE) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Userscript bridge not available. Please install Tampermonkey and enable the userscript.'));
    }, 5000);
  });
};

// Helper to call userscript bridge
const callUserscriptBridge = async <T>(
  method: string,
  payload: any
): Promise<T> => {
  await checkUserscriptBridge();
  
  const bridge = window.NEKO_ANI_BRIDGE;
  if (!bridge[method] || typeof bridge[method] !== 'function') {
    throw new Error(`Method ${method} not available in userscript bridge`);
  }
  
  return bridge[method](payload.source, payload.keyword || payload.detailUrl || payload.episodeUrl);
};

// Fallback to backend API if userscript is not available
const getBrowserlessEndpoint = (): string | undefined => {
    try {
        const stored = localStorage.getItem('browserless_endpoints');
        if (stored) {
            const endpoints = JSON.parse(stored);
            if (Array.isArray(endpoints) && endpoints.length > 0) {
                return endpoints[Math.floor(Math.random() * endpoints.length)];
            }
        }
    } catch (e) { console.error('Error reading browserless endpoints', e); }
    return undefined;
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const callBackendApi = async <T>(
  endpoint: string,
  payload: any
): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
};


// Caching Helpers
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

const getCache = <T>(key: string): T | null => {
    try {
        const item = localStorage.getItem(`cache_${key}`);
        if (!item) return null;
        const { value, expiry } = JSON.parse(item);
        if (Date.now() > expiry) {
            localStorage.removeItem(`cache_${key}`);
            return null;
        }
        return value as T;
    } catch (e) { return null; }
};

const setCache = (key: string, value: any) => {
    try {
        const item = {
            value,
            expiry: Date.now() + CACHE_TTL
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (e) { /* silent */ }
};

export const searchSource = async (
  source: MediaSource,
  keyword: string
): Promise<VideoSourceResult[]> => {
  const cacheKey = `search_${source.arguments.name}_${keyword}`;
  const cached = getCache<VideoSourceResult[]>(cacheKey);
  if (cached) return cached;

  try {
    // Try userscript bridge first
    const results = await callUserscriptBridge<VideoSourceResult[]>('searchSource', {
      source,
      keyword,
    });
    setCache(cacheKey, results);
    return results;
  } catch (userscriptError) {
    console.warn('Userscript bridge failed, falling back to backend API:', userscriptError);
    try {
      const results = await callBackendApi<VideoSourceResult[]>('/search', {
        source,
        keyword,
      });
      setCache(cacheKey, results);
      return results;
    } catch (backendError) {
      console.error('Both userscript and backend API failed:', backendError);
      return [];
    }
  }
};


export const getEpisodes = async (
    source: MediaSource,
    detailUrl: string
): Promise<VideoEpisode[]> => {
    const cacheKey = `episodes_${detailUrl}`;
    const cached = getCache<VideoEpisode[]>(cacheKey);
    if (cached) return cached;

    try {
      // Try userscript bridge first
      const eps = await callUserscriptBridge<VideoEpisode[]>('getEpisodes', {
        source,
        detailUrl,
      });
      setCache(cacheKey, eps);
      return eps;
    } catch (userscriptError) {
      console.warn('Userscript bridge failed, falling back to backend API:', userscriptError);
      try {
        const eps = await callBackendApi<VideoEpisode[]>('/episodes', {
          source,
          detailUrl,
        });
        setCache(cacheKey, eps);
        return eps;
      } catch (backendError) {
        console.error('Both userscript and backend API failed:', backendError);
        return [];
      }
    }
};


export const extractVideoUrl = async (
    source: MediaSource,
    episodeUrl: string
): Promise<string | null> => {
    const cacheKey = `extract_${episodeUrl}`;
    const cached = getCache<string>(cacheKey);
    if (cached) return cached;

    try {
      // Try userscript bridge first
      const result = await callUserscriptBridge<{ videoUrl: string | null; debug?: any }>('extractVideoUrl', {
        source,
        episodeUrl,
      });
      if (result.videoUrl) {
          setCache(cacheKey, result.videoUrl);
      }
      return result.videoUrl;
    } catch (userscriptError) {
      console.warn('Userscript bridge failed, falling back to backend API:', userscriptError);
      try {
        const browserlessEndpoint = getBrowserlessEndpoint();
        const result = await callBackendApi<{ videoUrl: string | null }>('/extract-video', {
          source,
          episodeUrl,
          browserlessEndpoint,
        });
        if (result.videoUrl) {
            setCache(cacheKey, result.videoUrl);
        }
        return result.videoUrl;
      } catch (backendError) {
        console.error('Both userscript and backend API failed:', backendError);
        return null;
      }
    }
};