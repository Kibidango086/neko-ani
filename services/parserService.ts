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


export const searchSource = async (
  source: MediaSource,
  keyword: string
): Promise<VideoSourceResult[]> => {
  try {
    return await callBackendApi<VideoSourceResult[]>('/search', {
      source,
      keyword,
    });
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};


export const getEpisodes = async (
    source: MediaSource,
    detailUrl: string
): Promise<VideoEpisode[]> => {
    try {
      return await callBackendApi<VideoEpisode[]>('/episodes', {
        source,
        detailUrl,
      });
    } catch (error) {
      console.error('Episodes error:', error);
      return [];
    }
};


export const extractVideoUrl = async (
    source: MediaSource,
    episodeUrl: string
): Promise<string | null> => {
    try {
      const browserlessEndpoint = getBrowserlessEndpoint();
      const result = await callBackendApi<{ videoUrl: string | null }>('/extract-video', {
        source,
        episodeUrl,
        browserlessEndpoint,
      });
      return result.videoUrl;
    } catch (error) {
      console.error('Video extraction error:', error);
      return null;
    }
};