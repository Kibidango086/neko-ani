import React, { createContext, useContext, useState, useEffect } from 'react';
import { SourceDataList, MediaSource } from './types';

// Type definition for the userscript bridge
declare global {
  interface Window {
    NEKO_ANI_BRIDGE?: {
      version: string;
      fetch: (url: string, options?: any) => Promise<any>;
      searchSource: (source: MediaSource, keyword: string) => Promise<any[]>;
      getEpisodes: (source: MediaSource, detailUrl: string) => Promise<any[]>;
      extractVideoUrl: (source: MediaSource, episodeUrl: string) => Promise<{ videoUrl: string | null; debug?: any }>;
    };
  }
}

interface AppContextType {
  bangumiToken: string;
  setBangumiToken: (token: string) => void;
  mediaSources: MediaSource[];
  setMediaSourceJson: (json: string) => void;
  rawJson: string;
  browserlessEndpoints: string[];
  setBrowserlessEndpoints: (endpoints: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_JSON = `
{
  "exportedMediaSourceDataList": {
    "mediaSources": []
  }
}
`;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bangumiToken, setBangumiToken] = useState(() => localStorage.getItem('bangumi_token') || '');
  const [rawJson, setRawJsonState] = useState(() => localStorage.getItem('source_json') || DEFAULT_JSON);
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
  const [browserlessEndpoints, setBrowserlessEndpoints] = useState<string[]>(() => {
    try {
        const stored = localStorage.getItem('browserless_endpoints');
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  });


  useEffect(() => {
    localStorage.setItem('bangumi_token', bangumiToken);
  }, [bangumiToken]);
  
  useEffect(() => {
    localStorage.setItem('browserless_endpoints', JSON.stringify(browserlessEndpoints));
  }, [browserlessEndpoints]);



  useEffect(() => {
    localStorage.setItem('source_json', rawJson);
    try {
      const parsed: SourceDataList = JSON.parse(rawJson);
      if (parsed.exportedMediaSourceDataList?.mediaSources) {
        setMediaSources(parsed.exportedMediaSourceDataList.mediaSources);
      }
    } catch (e) {
      console.error("Invalid Source JSON");
    }
  }, [rawJson]);

  const setMediaSourceJson = (json: string) => {
    setRawJsonState(json);
  };

  return (
    <AppContext.Provider value={{ 
        bangumiToken, setBangumiToken, 
        mediaSources, setMediaSourceJson, 
        rawJson, 
        browserlessEndpoints, setBrowserlessEndpoints
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
