import { MediaSource, VideoSourceResult, VideoEpisode } from '../types';

// Backend API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Helper to pick a random browserless endpoint
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

// Helper to call backend API
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
    const results = await callBackendApi<VideoSourceResult[]>('/search', {
      source,
      keyword,
    });
    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
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
      const eps = await callBackendApi<VideoEpisode[]>('/episodes', {
        source,
        detailUrl,
      });
      setCache(cacheKey, eps);
      return eps;
    } catch (error) {
      console.error('Episodes error:', error);
      return [];
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
    } catch (error) {
      console.error('Video extraction error:', error);
      return null;
    }
};