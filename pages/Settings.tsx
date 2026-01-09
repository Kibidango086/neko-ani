import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useUserscript } from '../components/UserscriptChecker';
import { Save, AlertTriangle, CheckCircle, Plus, Trash2, Server, Download, ShieldCheck, ExternalLink } from 'lucide-react';

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
  
  const { isInstalled, isLatestVersion, version } = useUserscript();

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
        {/* Status - Now handled by global banner */}

        {/* Status */}
        {isInstalled && isLatestVersion && (
            <div className="bg-primary-container text-on-primary-container rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl">
                    <CheckCircle className="text-on-primary" size={20} />
                </div>
                <div>
                    <p className="font-medium text-on-primary-container">Userscript active</p>
                    <p className="text-sm text-on-primary-container/80">Version {version} - All features enabled</p>
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
                {(!isInstalled || !isLatestVersion) && <span className="text-[10px] bg-error-container text-on-error px-2 py-0.5 rounded-full uppercase ml-2">Limited</span>}
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
                            <div key={idx} className="flex items-center justify-between bg-surface-container-high p-3 rounded-2xl group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-secondary-container rounded-xl text-on-secondary-container">
                                        <Server size={16} />
                                    </div>
                                    <span className="text-sm font-mono truncate text-on-surface">{ep}</span>
                                </div>
                                <button 
                                    onClick={() => removeEndpoint(idx)}
                                    className="text-on-surface-variant hover:text-error p-2 rounded-xl hover:bg-error-container/10 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-on-surface-variant text-sm border border-dashed border-outline/20 rounded-2xl">
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