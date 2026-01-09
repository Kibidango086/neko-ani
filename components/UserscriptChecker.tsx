import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserscriptContextType {
  isInstalled: boolean;
  isLatestVersion: boolean;
  version: string | null;
  checkStatus: () => void;
}

const UserscriptContext = createContext<UserscriptContextType | undefined>(undefined);

const REQUIRED_VERSION = '2.1';

export const UserscriptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLatestVersion, setIsLatestVersion] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    
    const checkInterval = setInterval(() => {
      const bridge = (window as any).NEKO_ANI_BRIDGE;
      
      if (bridge) {
        clearInterval(checkInterval);
        setIsInstalled(true);
        setVersion(bridge.version || 'unknown');
        
        // Check version compatibility
        const currentVersion = bridge.version || '0.0';
        const isLatest = compareVersions(currentVersion, REQUIRED_VERSION) >= 0;
        setIsLatestVersion(isLatest);
        setChecking(false);
      }
    }, 500);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      setIsInstalled(false);
      setVersion(null);
      setIsLatestVersion(false);
      setChecking(false);
    }, 5000);
  };

  const compareVersions = (current: string, required: string): number => {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart > requiredPart) return 1;
      if (currentPart < requiredPart) return -1;
    }
    
    return 0;
  };

  useEffect(() => {
    // Initial check
    checkStatus();
    
    // Re-check every 10 seconds in case userscript is loaded later
    const interval = setInterval(checkStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <UserscriptContext.Provider value={{
      isInstalled,
      isLatestVersion,
      version,
      checkStatus
    }}>
      {children}
    </UserscriptContext.Provider>
  );
};

export const useUserscript = () => {
  const context = useContext(UserscriptContext);
  if (!context) {
    throw new Error('useUserscript must be used within UserscriptProvider');
  }
  return context;
};