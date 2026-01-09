// Bangumi API Types
export interface BangumiSubject {
  id: number;
  name: string;
  name_cn: string;
  summary: string;
  eps: number;
  eps_count: number;
  air_date: string;
  air_weekday: number;
  images: {
    small: string;
    grid: string;
    large: string;
    medium: string;
    common: string;
  };
  rating: {
    score: number;
    total: number;
    rank: number;
  };
  date: string;
  tags: { name: string; count: number }[];
  collection: {
    wish: number;
    collect: number;
    doing: number;
    on_hold: number;
    dropped: number;
  };
}

export interface BangumiSearchResponse {
  list: BangumiSubject[];
  results: number;
}

export interface BangumiCollection {
  data: {
    list: {
      subject_id: number;
      subject_type: number;
      comment: string;
      tags: string[];
      private: boolean;
      updated_at: string;
      rate: number;
      type: number;
      subject: BangumiSubject;
    }[];
    total: number;
    limit: number;
    offset: number;
  };
}

// Custom Source Configuration Types (Partial based on provided JSON)
export interface SearchConfig {
  searchUrl: string;
  searchUseOnlyFirstWord?: boolean;
  selectorSubjectFormatA?: {
    selectLists: string;
  };
  selectorSubjectFormatIndexed?: {
    selectNames: string;
    selectLinks: string;
  };
  subjectFormatId: string;
  channelFormatId: string;
  selectorChannelFormatFlattened?: {
    selectChannelNames: string;
    matchChannelName: string;
    selectEpisodeLists: string;
    selectEpisodesFromList: string;
    matchEpisodeSortFromName?: string;
  };
  selectorChannelFormatNoChannel?: {
    selectEpisodes: string;
    matchEpisodeSortFromName?: string;
  };
  matchVideo?: {
    enableNestedUrl?: boolean;
    matchNestedUrl?: string;
    matchVideoUrl: string;
    cookies?: string;
    // 浏览器渲染选项（用于动态加载的视频 URL）
    useBrowserRender?: boolean; // 强制使用浏览器渲染
    forceBrowserFirst?: boolean;
    waitForSelector?: string; // 等待特定 CSS 选择器出现
    waitMs?: number; // 等待毫秒数
    timeout?: number;
    captureNetworkPattern?: string; // 捕获匹配该正则的网络请求 URL
    extractFunction?: string; // JavaScript snippet to execute in browser context
  };
}

export interface MediaSourceArg {
  name: string;
  iconUrl?: string;
  searchConfig: SearchConfig;
  tier?: number;
}

export interface MediaSource {
  factoryId: string;
  version: number;
  arguments: MediaSourceArg;
}

export interface SourceDataList {
  exportedMediaSourceDataList: {
    mediaSources: MediaSource[];
  };
}

// Internal App Types
export interface VideoEpisode {
  title: string;
  url: string;
  sort?: string;
}

export interface VideoSourceResult {
  sourceName: string;
  sourceId: number;
  title: string;
  url: string; // The link to the detail page
  episodes: VideoEpisode[];
}
