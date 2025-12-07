import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Save, AlertTriangle, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { bangumiToken, setBangumiToken, rawJson, setMediaSourceJson } = useAppStore();
  
  const [localJson, setLocalJson] = useState(rawJson);
  const [localToken, setLocalToken] = useState(bangumiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSave = () => {
    try {
        JSON.parse(localJson); // Validate JSON
        setMediaSourceJson(localJson);
        setBangumiToken(localToken);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
    } catch (e) {
        setMessage({ type: 'error', text: 'Invalid JSON format in Source Configuration.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 p-4 md:p-8">
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

        {/* Save Button */}
        <div className="fixed bottom-6 right-6 md:static md:flex md:justify-end md:pt-4">
            <div className="flex items-center gap-4">
                {message && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-surface-container ${message.type === 'success' ? 'text-green-400' : 'text-error'}`}>
                        {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {message.text}
                    </div>
                )}
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:shadow-lg hover:bg-primary/90 px-8 py-4 rounded-2xl font-medium transition-all"
                >
                    <Save size={20} />
                    Save Changes
                </button>
            </div>
        </div>
    </div>
  );
};