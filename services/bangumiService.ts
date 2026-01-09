import { BangumiSubject, BangumiSearchResponse } from '../types';

const BASE_URL = 'https://api.bgm.tv';

export const searchBangumi = async (keyword: string): Promise<BangumiSubject[]> => {
  try {
    const response = await fetch(`${BASE_URL}/search/subject/${encodeURIComponent(keyword)}?type=2&responseGroup=medium`);
    if (!response.ok) throw new Error('Failed to fetch from Bangumi');
    const data: BangumiSearchResponse = await response.json();
    return data.list || [];
  } catch (error) {
    console.error('Bangumi Search Error:', error);
    return [];
  }
};

export const getBangumiSubject = async (id: number): Promise<BangumiSubject | null> => {
  try {
    const response = await fetch(`${BASE_URL}/v0/subjects/${id}`);
    if (!response.ok) throw new Error('Failed to fetch subject details');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Bangumi Details Error:', error);
    return null;
  }
};

export const getCalendar = async (): Promise<BangumiSubject[]> => {
  try {
    const currentYear = new Date().getFullYear(); // 动态年份

    const response = await fetch(
      `${BASE_URL}/search/subject/${currentYear}?type=2&responseGroup=medium&max_results=10`
    );

    const data = await response.json();
    return data.list || [];
  } catch (error) {
    console.error('Bangumi Calendar Error:', error);
    return [];
  }
};

