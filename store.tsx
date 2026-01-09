import React, { createContext, useContext, useState, useEffect } from 'react';
import { SourceDataList, MediaSource, BangumiCollection } from './types';

interface AppContextType {
  bangumiToken: string;
  setBangumiToken: (token: string) => void;
  mediaSources: MediaSource[];
  setMediaSourceJson: (json: string) => void;
  rawJson: string;
  browserlessEndpoints: string[];
  setBrowserlessEndpoints: (endpoints: string[]) => void;
  userCollection: BangumiCollection | null;
  setUserCollection: (collection: BangumiCollection | null) => void;
  collectionLoading: boolean;
  setCollectionLoading: (loading: boolean) => void;
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
  const [userCollection, setUserCollection] = useState<BangumiCollection | null>(() => {
    try {
        const stored = localStorage.getItem('user_collection');
        return stored ? JSON.parse(stored) : null;
    } catch (e) { return null; }
  });
  const [collectionLoading, setCollectionLoading] = useState(false);

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

  useEffect(() => {
    if (userCollection) {
      localStorage.setItem('user_collection', JSON.stringify(userCollection));
    }
  }, [userCollection]);

  const setMediaSourceJson = (json: string) => {
    setRawJsonState(json);
  };

  const fetchUserCollection = async (token: string) => {
    if (!token) return;
    
    setCollectionLoading(true);
    try {
      const { getUserCollection } = await import('./services/bangumiService');
      const collection = await getUserCollection(token);
      setUserCollection(collection);
    } catch (error) {
      console.error('Failed to fetch user collection:', error);
    } finally {
      setCollectionLoading(false);
    }
  };

  useEffect(() => {
    if (bangumiToken) {
      fetchUserCollection(bangumiToken);
    }
  }, [bangumiToken]);

  return (
    <AppContext.Provider value={{ 
        bangumiToken, setBangumiToken, 
        mediaSources, setMediaSourceJson, 
        rawJson, 
        browserlessEndpoints, setBrowserlessEndpoints,
        userCollection, setUserCollection,
        collectionLoading, setCollectionLoading
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