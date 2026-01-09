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
    
    // Multiple detection strategies
    let bridge = (window as any).NEKO_ANI_BRIDGE;
    
    // Strategy 1: Direct bridge check
    if (bridge && bridge.version) {
      console.log('🔍 [Checker] Bridge found via direct check:', bridge.version);
      updateBridgeState(bridge);
      return;
    }
    
    // Strategy 2: Event listener (for scripts that load after page)
    const handleReady = (event: any) => {
      console.log('🔍 [Checker] Bridge found via event:', event.detail);
      if (event.detail && event.detail.version) {
        updateBridgeState({ version: event.detail.version });
      }
      window.removeEventListener('neko-ani-bridge-ready', handleReady);
    };
    
    window.addEventListener('neko-ani-bridge-ready', handleReady);
    
    // Strategy 3: Polling with multiple checks
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds with 500ms intervals
    
    const checkInterval = setInterval(() => {
      attempts++;
      bridge = (window as any).NEKO_ANI_BRIDGE;
      
      // Multiple property checks for reliability
      if (bridge && (
        bridge.version ||
        bridge.searchSource ||
        bridge.getEpisodes ||
        (window as any).NEKO_ANI_BRIDGE_LOADED ||
        (window as any).NEKO_ANI_BRIDGE_VERSION
      )) {
        clearInterval(checkInterval);
        window.removeEventListener('neko-ani-bridge-ready', handleReady);
        console.log('🔍 [Checker] Bridge found via polling after', attempts, 'attempts');
        updateBridgeState(bridge);
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        window.removeEventListener('neko-ani-bridge-ready', handleReady);
        console.log('🔍 [Checker] Bridge not found after', maxAttempts, 'attempts');
        setIsInstalled(false);
        setVersion(null);
        setIsLatestVersion(false);
        setChecking(false);
      }
    }, 500);
    
    // Strategy 4: Additional markers
    setTimeout(() => {
      bridge = (window as any).NEKO_ANI_BRIDGE;
      if ((window as any).NEKO_ANI_BRIDGE_LOADED) {
        console.log('🔍 [Checker] Bridge found via LOADED marker');
        updateBridgeState({ version: (window as any).NEKO_ANI_BRIDGE_VERSION || bridge?.version });
        setChecking(false);
      }
    }, 2000);
  };
  
  const updateBridgeState = (bridge: any) => {
    const currentVersion = bridge.version || bridge.NEKO_ANI_BRIDGE_VERSION || '2.1';
    console.log('🔍 [Checker] Updating bridge state:', { version: currentVersion });
    
    setIsInstalled(true);
    setVersion(currentVersion);
    
    const isLatest = compareVersions(currentVersion, REQUIRED_VERSION) >= 0;
    setIsLatestVersion(isLatest);
    setChecking(false);
    
    console.log('🔍 [Checker] Bridge state updated:', {
      isInstalled: true,
      version: currentVersion,
      isLatest
    });
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
    
    // Only check once, let the checkStatus function handle retries internally
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