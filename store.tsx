import React, { createContext, useContext, useState, useEffect } from 'react';
import { SourceDataList, MediaSource } from './types';

interface AppContextType {
  bangumiToken: string;
  setBangumiToken: (token: string) => void;
  mediaSources: MediaSource[];
  setMediaSourceJson: (json: string) => void;
  rawJson: string;
  browserlessEndpoints: string[];
  setBrowserlessEndpoints: (endpoints: string[]) => void;
  useUserscript: boolean;
  setUseUserscript: (use: boolean) => void;
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
  const [useUserscript, setUseUserscript] = useState(() => localStorage.getItem('use_userscript') === 'true');

  useEffect(() => {
    localStorage.setItem('bangumi_token', bangumiToken);
  }, [bangumiToken]);
  
  useEffect(() => {
    localStorage.setItem('browserless_endpoints', JSON.stringify(browserlessEndpoints));
  }, [browserlessEndpoints]);

  useEffect(() => {
    localStorage.setItem('use_userscript', useUserscript.toString());
  }, [useUserscript]);

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
        browserlessEndpoints, setBrowserlessEndpoints,
        useUserscript, setUseUserscript
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
