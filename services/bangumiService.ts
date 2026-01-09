import { BangumiSubject, BangumiSearchResponse, BangumiCollection } from '../types';

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
        `${BASE_URL}/calendar/${currentYear}`
      );

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Bangumi Calendar Error:', error);
      return [];
    }
};

export const getUserCollection = async (accessToken: string, subjectType: number = 2, limit: number = 20): Promise<BangumiCollection> => {
    try {
      const response = await fetch(`${BASE_URL}/user/collection/${subjectType}?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user collection: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Bangumi Collection Error:', error);
      return {
        list: [],
        total: 0,
        limit: 0,
        offset: 0,
        subject: {
          id: 0,
          url: '',
          type: 0,
          name: '',
          name_cn: '',
          summary: '',
          images: { small: '', grid: '', large: '', medium: '', common: '' },
          rating: { score: 0, total: 0, rank: 0 },
          collection: { wish: 0, collect: 0, doing: 0, on_hold: 0, dropped: 0 },
          tags: []
        }
      };
    }
};

// 更新追番状态API
export const updateCollectionStatus = async (
  accessToken: string, 
  subjectId: number, 
  type: number, 
  comment?: string
): Promise<void> => {
    try {
      const body: any = { type };
      if (comment) {
        body.comment = comment;
      }

      const response = await fetch(`${BASE_URL}/collection/${subjectId}/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to update collection status: ${response.status}`);
      }

      console.log('Collection status updated successfully');
    } catch (error) {
      console.error('Bangumi Collection Update Error:', error);
      throw error;
    }
  };

// 保持原有的跨域解决方案：先尝试油猴，失败后使用后端
export const getUserCollectionWithFallback = async (accessToken: string, subjectType: number = 2, limit: number = 20): Promise<BangumiCollection> => {
    try {
      // 优先使用油猴脚本
      const { callUserscriptBridge } = await import('./parserService');
      const collection = await callUserscriptBridge<BangumiCollection>('getUserCollection', {
        accessToken,
        subjectType,
        limit
      });
      
      if (collection && collection.list && collection.list.total > 0) {
        return collection;
      }
      
      // 回退到后端API
      console.log('Fallback to backend API for user collection');
      const response = await fetch(`${BASE_URL}/user/collection/${subjectType}?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user collection: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('User collection error:', error);
      return {
        list: [],
        total: 0,
        limit: 0,
        offset: 0,
        subject: {
          id: 0,
          url: '',
          type: 0,
          name: '',
          name_cn: '',
          summary: '',
          images: { small: '', grid: '', large: '', medium: '', common: '' },
          rating: { score: 0, total: 0, rank: 0 },
          collection: { wish: 0, collect: 0, doing: 0, on_hold: 0, dropped: 0 },
          tags: []
        }
      };
    }
  };

// 检查追番状态的辅助函数（带跨域保护）
export const getSubjectWatchStatusWithFallback = async (
  accessToken: string, 
  subjectId: number
): Promise<{ watching: number; total: number }> => {
    try {
      // 优先使用油猴脚本
      const { callUserscriptBridge } = await import('./parserService');
      const status = await callUserscriptBridge<{ watching: number; total: number }>('getSubjectWatchStatus', {
        accessToken,
        subjectId
      });
      
      if (status && (status.watching > 0 || status.total > 0)) {
        return status;
      }
      
      // 回退到后端API
      console.log('Fallback to backend API for watch status');
      const response = await fetch(`${BASE_URL}/user/subject/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get watch status: ${response.status}`);
      }

      const data = await response.json();
      return {
        watching: data.watching || 0,
        total: data.total || 0
      };
    } catch (error) {
      console.error('Watch status error:', error);
      return { watching: 0, total: 0 };
    }
  };

// 更新追番状态（带跨域保护）
export const updateCollectionStatusWithFallback = async (
  accessToken: string, 
  subjectId: number, 
  type: number, 
  comment?: string
): Promise<void> => {
    try {
      // 优先使用油猴脚本
      const { callUserscriptBridge } = await import('./parserService');
      const success = await callUserscriptBridge<boolean>('updateCollectionStatus', {
        accessToken,
        subjectId,
        type,
        comment
      });
      
      if (success) {
        console.log('Collection status updated via userscript');
        return;
      }
      
      // 回退到后端API
      console.log('Fallback to backend API for collection update');
      const body: any = { type };
      if (comment) {
        body.comment = comment;
      }

      const response = await fetch(`${BASE_URL}/collection/${subjectId}/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to update collection status: ${response.status}`);
      }

      console.log('Collection status updated via backend API');
    } catch (error) {
      console.error('Collection Update Error:', error);
    }
  };

