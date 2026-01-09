import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Save, AlertTriangle, CheckCircle, Plus, Trash2, Server, Download, ShieldCheck, ExternalLink, X } from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    bangumiToken, setBangumiToken, 
    rawJson, setMediaSourceJson, 
    browserlessEndpoints, setBrowserlessEndpoints
  } = useAppStore();
  
  const [localJson, setLocalJson] = useState(rawJson);
  const [localToken, setLocalToken] = useState(bangumiToken);
  const [localEndpoints, setLocalEndpoints] = useState<string[]>(browserlessEndpoints);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showUserscriptBanner, setShowUserscriptBanner] = useState(false);
  const [userscriptInstalled, setUserscriptInstalled] = useState(false);

  // Check if userscript is installed
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (window.NEKO_ANI_BRIDGE) {
        setUserscriptInstalled(true);
        setShowUserscriptBanner(false);
        clearInterval(checkInterval);
      }
    }, 500);

    // Show banner after 3 seconds if not found
    setTimeout(() => {
      if (!window.NEKO_ANI_BRIDGE) {
        setShowUserscriptBanner(true);
        clearInterval(checkInterval);
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleSave = () => {
    try {
        JSON.parse(localJson); // Validate JSON
        setMediaSourceJson(localJson);
        setBangumiToken(localToken);
        setBrowserlessEndpoints(localEndpoints);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
    } catch (e) {
        setMessage({ type: 'error', text: 'Invalid JSON format in Source Configuration.' });
    }
  };

  const addEndpoint = () => {
    if (newEndpoint.trim() && !localEndpoints.includes(newEndpoint.trim())) {
        setLocalEndpoints([...localEndpoints, newEndpoint.trim()]);
        setNewEndpoint('');
    }
  };

  const removeEndpoint = (index: number) => {
    setLocalEndpoints(localEndpoints.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 p-4 md:p-8">
        {/* Userscript Banner */}
        {showUserscriptBanner && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 relative">
                <button
                    onClick={() => setShowUserscriptBanner(false)}
                    className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
                >
                    <X size={16} />
                </button>
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                        <ShieldCheck className="text-blue-500" size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-on-surface mb-2">Install Userscript for Better Experience</h3>
                        <p className="text-sm text-on-surface-variant mb-4">
                            Install the Tampermonkey script to bypass all restrictions and get faster video extraction. This is highly recommended for the best experience.
                        </p>
                        <div className="flex items-center gap-3">
                            <a 
                                href="/api/helper.user.js" 
                                target="_blank"
                                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <Download size={14} />
                                Install Script
                            </a>
                            <span className="text-xs text-on-surface-variant">
                                Requires <a href="https://www.tampermonkey.net/" target="_blank" className="underline inline-flex items-center gap-1">Tampermonkey <ExternalLink size={10} /></a>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Status */}
        {userscriptInstalled && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="text-green-500" size={20} />
                <div>
                    <p className="font-medium text-on-surface">Userscript Active</p>
                    <p className="text-sm text-on-surface-variant">Version {window.NEKO_ANI_BRIDGE?.version} - All features enabled</p>
                </div>
            </div>
        )}
        
        <h1 className="text-4xl font-normal text-on-surface tracking-tight">Settings</h1>

        {/* Bangumi Token */}
        <div className="space-y-4">
            <label className="block text-base font-medium text-on-surface">Bangumi Access Token</label>
            <div className="bg-surface-container rounded-2xl p-1">
                <input 
                    type="password"
                    value={localToken}
                    onChange={(e) => setLocalToken(e.target.value)}
                    placeholder="Paste your token here..."
                    className="w-full bg-transparent border-none rounded-xl p-4 text-on-surface placeholder-on-surface-variant/50 focus:ring-0 focus:bg-surface-variant/20 transition-all outline-none"
                />
            </div>
            <p className="text-sm text-on-surface-variant px-2">Required only for user-specific features like collection syncing.</p>
        </div>

        {/* Browserless Endpoints */}
        <div className="space-y-4">
            <label className="block text-base font-medium text-on-surface">
                Browserless API Keys
                {!userscriptInstalled && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase ml-2">Fallback Mode</span>}
            </label>
            <div className="bg-surface-container rounded-2xl p-4 space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={newEndpoint}
                        onChange={(e) => setNewEndpoint(e.target.value)}
                        placeholder="Enter Browserless API Key..."
                        className="flex-1 bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 border-none focus:ring-2 focus:ring-primary/20 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && addEndpoint()}
                    />
                    <button 
                        onClick={addEndpoint}
                        className="bg-primary text-on-primary p-3 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                
                {localEndpoints.length > 0 ? (
                    <div className="space-y-2">
                        {localEndpoints.map((ep, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-surface-container-high p-3 rounded-xl group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                                        <Server size={16} />
                                    </div>
                                    <span className="text-sm font-mono truncate text-on-surface">{ep}</span>
                                </div>
                                <button 
                                    onClick={() => removeEndpoint(idx)}
                                    className="text-on-surface-variant hover:text-error p-2 rounded-lg hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-on-surface-variant text-sm border border-dashed border-outline/20 rounded-xl">
                        Required: API Keys for video extraction (Browserless service)
                    </div>
                )}
            </div>
            <p className="text-sm text-on-surface-variant px-2 leading-relaxed">
                <strong>Mandatory for Video Extraction:</strong> All video extraction uses Browserless service. Multiple keys will be rotated automatically for better reliability.
            </p>
        </div>

        {/* Source JSON */}
        <div className="space-y-4">
            <label className="block text-base font-medium text-on-surface">Source Configuration (JSON)</label>
            <div className="bg-surface-container rounded-3xl p-1 overflow-hidden">
                <textarea 
                    value={localJson}
                    onChange={(e) => setLocalJson(e.target.value)}
                    className="w-full h-96 bg-transparent border-none p-4 text-xs font-mono text-on-surface focus:ring-0 focus:bg-surface-variant/20 transition-all outline-none resize-none custom-scrollbar"
                    spellCheck={false}
                />
            </div>
            <p className="text-sm text-on-surface-variant px-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                Source configuration for video sites and parsing rules. Video extraction uses Browserless service.
            </p>
        </div>

        {/* Save Button - Sticky Bottom Bar for Mobile */}
        <div className="sticky bottom-4 left-0 right-0 z-30 px-4 pb-4 md:static md:px-0 md:pb-0 md:flex md:justify-end md:pt-4">
            <div className="flex flex-col md:flex-row items-center gap-4 bg-background/80 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 md:bg-transparent md:backdrop-blur-none md:p-0 md:shadow-none md:ring-0">
                {message && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-error/10 text-error'} animate-in fade-in zoom-in duration-300 w-full md:w-auto justify-center`}>
                        {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {message.text}
                    </div>
                )}
                <button 
                    onClick={handleSave}
                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-primary text-on-primary hover:shadow-xl hover:shadow-primary/30 px-10 py-5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg"
                >
                    <Save size={20} />
                    Save Configuration
                </button>
            </div>
        </div>
    </div>
  );
};