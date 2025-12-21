import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Save, AlertTriangle, CheckCircle, Plus, Trash2, Server, Download, Copy, ShieldCheck, ExternalLink } from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    bangumiToken, setBangumiToken, 
    rawJson, setMediaSourceJson, 
    browserlessEndpoints, setBrowserlessEndpoints,
    useUserscript, setUseUserscript 
  } = useAppStore();
  
  const [localJson, setLocalJson] = useState(rawJson);
  const [localToken, setLocalToken] = useState(bangumiToken);
  const [localEndpoints, setLocalEndpoints] = useState<string[]>(browserlessEndpoints);
  const [localUseUserscript, setLocalUseUserscript] = useState(useUserscript);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const USERSCRIPT_CODE = `// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    https://github.com/neko-stream/neko-ani
// @version      1.3
// @description  CORS bypass bridge with enhanced logging
// @author       Neko-Ani
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @connect      *
// ==/UserScript==

(function() {
    'use strict';
    const bridge = {
        fetch: (url, options = {}) => {
            return new Promise((resolve, reject) => {
                const requestOptions = {
                    method: options.method || 'GET',
                    url: url,
                    headers: options.headers || {},
                    data: options.body,
                    responseType: options.responseType || 'arraybuffer',
                    onload: (res) => resolve({
                        status: res.status,
                        data: res.response,
                        headers: res.responseHeaders,
                        finalUrl: res.finalUrl
                    }),
                    onerror: reject
                };
                if (requestOptions.headers['X-Neko-Referer']) {
                    requestOptions.headers['Referer'] = requestOptions.headers['X-Neko-Referer'];
                    delete requestOptions.headers['X-Neko-Referer'];
                }
                GM_xmlhttpRequest(requestOptions);
            });
        }
    };
    window.NEKO_ANI_BRIDGE = bridge;
    if (typeof unsafeWindow !== 'undefined') unsafeWindow.NEKO_ANI_BRIDGE = bridge;
    console.log('🐾 [Neko-Ani] Bridge Ready v1.3');
})();`;

  const handleSave = () => {
    try {
        JSON.parse(localJson); // Validate JSON
        setMediaSourceJson(localJson);
        setBangumiToken(localToken);
        setBrowserlessEndpoints(localEndpoints);
        setUseUserscript(localUseUserscript);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
    } catch (e) {
        setMessage({ type: 'error', text: 'Invalid JSON format in Source Configuration.' });
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(USERSCRIPT_CODE);
    setMessage({ type: 'success', text: 'Script copied to clipboard!' });
    setTimeout(() => setMessage(null), 2000);
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
        <h1 className="text-4xl font-normal text-on-surface tracking-tight">Settings</h1>
        
        {/* Playback Method */}
        <div className="space-y-4">
            <label className="block text-base font-medium text-on-surface flex items-center gap-2">
                Playback Mode
                {!localUseUserscript && <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase">CORS Restricted</span>}
                {localUseUserscript && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full uppercase">Helper Active</span>}
            </label>
            
            <div className="bg-surface-container rounded-3xl overflow-hidden border border-outline/10">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-on-surface">Use Userscript Helper</h3>
                            <p className="text-sm text-on-surface-variant text-pretty">Bypass all CORS restrictions by fetching video segments directly from your browser. Highly recommended for all users.</p>
                        </div>
                        <button 
                            onClick={() => setLocalUseUserscript(!localUseUserscript)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localUseUserscript ? 'bg-primary' : 'bg-surface-variant'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localUseUserscript ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-outline/10">
                        <div className="flex items-start gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <ShieldCheck className="text-primary shrink-0" size={20} />
                            <div className="text-sm text-on-surface-variant leading-relaxed">
                                <p className="font-bold text-primary mb-1">One-Click Setup</p>
                                1. Install <a href="https://www.tampermonkey.net/" target="_blank" className="underline font-medium text-primary inline-flex items-center gap-1">Tampermonkey <ExternalLink size={12} /></a> extension.<br />
                                2. Click "Install Helper Script" below.<br />
                                3. Toggle "Use Userscript Helper" to <strong>ON</strong> and save.
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <a 
                                href="/api/helper.user.js" 
                                target="_blank"
                                className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-xl transition-all text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                            >
                                <Download size={16} />
                                Install Helper Script
                            </a>
                            <button 
                                onClick={copyScript}
                                title="Copy code manually"
                                className="px-4 bg-surface-container-high hover:bg-surface-variant text-on-surface py-3 rounded-xl transition-all"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
            <label className="block text-base font-medium text-on-surface">Browserless API Key Pool</label>
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
                        No API Keys configured. Video extraction will not work.
                    </div>
                )}
            </div>
            <p className="text-sm text-on-surface-variant px-2 leading-relaxed">
                <strong>Mandatory for Video Extraction:</strong> This project uses Browserless.io to resolve video links. Enter your API Key(s) above. Multiple keys will be rotated automatically.
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
                Requests are proxied via <code>allorigins.win</code> to bypass CORS.
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