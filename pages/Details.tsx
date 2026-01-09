import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBangumiSubject } from '../services/bangumiService';
import { searchSource, getEpisodes, extractVideoUrl } from '../services/parserService';
import { useAppStore } from '../store';
import { BangumiSubject, VideoSourceResult, VideoEpisode } from '../types';
import { Play, Loader2, Database, ArrowLeft, Star, AlertTriangle } from 'lucide-react';
import Hls from 'hls.js';

export const Details: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mediaSources, useUserscript } = useAppStore();
  
  const [subject, setSubject] = useState<BangumiSubject | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Aggregator States
  const [sourceResults, setSourceResults] = useState<VideoSourceResult[]>([]);
  const [searchingSources, setSearchingSources] = useState(false);
  const [selectedResult, setSelectedResult] = useState<VideoSourceResult | null>(null);
  
  // Episode States
  const [episodes, setEpisodes] = useState<VideoEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<VideoEpisode | null>(null);
  
  // Player States
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getBangumiSubject(parseInt(id)).then(data => {
        setSubject(data);
        setLoading(false);
      });
    }
  }, [id]);

  // Handle Video Player HLS
  useEffect(() => {
    if (videoUrl && videoRef.current) {
        setVideoError(null);
        
        // 更严谨的 HLS 判断：排除常见视频后缀
        const isMp4 = videoUrl.toLowerCase().includes('.mp4') || videoUrl.toLowerCase().includes('.m4v');
        const isHls = (videoUrl.includes('.m3u8') || videoUrl.includes('playlist')) && !isMp4;
        
        if (isHls && Hls.isSupported()) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
            
            const hlsConfig: any = {};

            if (useUserscript) {
                console.log('🚀 [Player] Initializing Userscript Bridge Loader');
                
                class UserscriptLoader {
                    stats: any;
                    context: any;
                    callbacks: any;

                    constructor() {
                        this.stats = {
                            trequest: 0,
                            tfirst: 0,
                            tload: 0,
                            loaded: 0,
                            total: 0,
                            retry: 0,
                            loading: { start: 0, first: 0, end: 0 },
                            parsing: { start: 0, end: 0 },
                            buffering: { start: 0, end: 0 }
                        };
                    }

                    load(context: any, config: any, callbacks: any) {
                        this.context = context;
                        this.callbacks = callbacks;
                        const bridge = (window as any).NEKO_ANI_BRIDGE;

                        if (!bridge) {
                            console.error('❌ [Player] Bridge not found!');
                            callbacks.onError({ code: 0, text: 'Bridge missing' }, context, null);
                            return;
                        }

                        const now = performance.now();
                        this.stats.trequest = now;
                        this.stats.loading.start = now;
                        
                        const headers: any = {};
                        const currentSource = (window as any).CURRENT_SOURCE_URL;
                        if (currentSource) headers['X-Neko-Referer'] = currentSource;

                        bridge.fetch(context.url, { 
                            responseType: context.responseType === 'arraybuffer' ? 'arraybuffer' : 'text',
                            headers
                        })
                        .then((res: any) => {
                            // 处理 400 等错误状态，不让 hls.js 尝试解析错误页面
                            if (res.status >= 400) {
                                throw new Error(`HTTP Error ${res.status}`);
                            }

                            const tload = performance.now();
                            this.stats.tfirst = Math.max(this.stats.trequest + 1, tload - 1);
                            this.stats.tload = tload;
                            this.stats.loading.first = this.stats.tfirst;
                            this.stats.loading.end = tload;
                            this.stats.loaded = res.data?.byteLength || res.data?.length || 0;
                            this.stats.total = this.stats.loaded;
                            
                            this.stats.parsing = { start: tload, end: tload };
                            this.stats.buffering = { start: tload, end: tload };

                            let data = res.data;
                            if (context.responseType === 'text' && typeof data !== 'string') {
                                data = new TextDecoder().decode(res.data);
                            }

                            callbacks.onSuccess({ 
                                data, 
                                url: res.finalUrl || context.url,
                                code: res.status
                            }, this.stats, context, res);
                        })
                        .catch((err: any) => {
                            console.error('❌ [Player] Bridge fetch failed:', context.url, err);
                            callbacks.onError({ code: 0, text: String(err) }, context, null);
                        });
                    }

                    abort() { }
                    destroy() { }
                }
                hlsConfig.fLoader = UserscriptLoader;
                hlsConfig.pLoader = UserscriptLoader;
            }
            
            const hls = new Hls(hlsConfig);
            hls.loadSource(videoUrl);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
               console.log('✅ [Player] Manifest parsed, attempting play');
               videoRef.current?.play().catch(e => console.log('Autoplay blocked', e));
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('🔥 [HLS Error]:', data.details, data);
                
                // 关键改进：如果 HLS 解析失败且看起来是 MP4，自动切换到原生播放器
                if (data.details === 'manifestParsingError' && videoUrl.includes('.mp4')) {
                    console.log('🔄 [Player] HLS parsing failed for MP4, falling back to native player');
                    hls.destroy();
                    if (videoRef.current) videoRef.current.src = videoUrl;
                    return;
                }

                if (data.fatal) {
                   setVideoError(`Playback failed: ${data.details || data.type}. Check console for details.`);
                }
            });
            hlsRef.current = hls;
        } else {
            // Native Player for MP4 or non-Hls browsers
            console.log('🎬 [Player] Using Native Video Player');
            videoRef.current.src = videoUrl;
            videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
        }
    }
    return () => {
        if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [videoUrl, useUserscript]);

  const handleSearchSources = async () => {
    if (!subject) return;
    setSearchingSources(true);
    setSourceResults([]);
    setVideoError(null);
    
    const keyword = subject.name_cn || subject.name;
    
    for (const source of mediaSources) {
        try {
            const results = await searchSource(source, keyword);
            setSourceResults(prev => [...prev, ...results]);
        } catch (e) {
            console.error('Source search failed:', source.arguments.name, e);
        }
    }
    setSearchingSources(false);
  };

  const handleSelectSource = async (result: VideoSourceResult) => {
      setSelectedResult(result);
      (window as any).CURRENT_SOURCE_URL = result.url;
      setLoadingEpisodes(true);
      setEpisodes([]);
      setCurrentEpisode(null);
      setVideoUrl(null);
      setVideoError(null);
      
      const sourceConfig = mediaSources.find(s => s.arguments.name === result.sourceName);
      if (sourceConfig) {
          const eps = await getEpisodes(sourceConfig, result.url);
          setEpisodes(eps);
      }
      setLoadingEpisodes(false);
  };

  const handlePlayEpisode = async (ep: VideoEpisode) => {
      if (!selectedResult) return;
      setCurrentEpisode(ep);
      setLoadingVideo(true);
      setVideoUrl(null);
      setVideoError(null);

      const sourceConfig = mediaSources.find(s => s.arguments.name === selectedResult.sourceName);
      if (sourceConfig) {
          const url = await extractVideoUrl(sourceConfig, ep.url);
          if (url) {
              setVideoUrl(url);
          } else {
              setVideoError("Could not extract video URL from this source. Try another.");
          }
      }
      setLoadingVideo(false);
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!subject) return <div className="p-8 text-center text-red-400">Subject not found</div>;

  return (
    <div className="pb-20 max-w-6xl mx-auto px-4 pt-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-8">
             <button onClick={() => navigate(-1)} className="bg-surface-container-high text-on-surface p-3 rounded-2xl hover:bg-surface-variant transition-all active:scale-95">
                 <ArrowLeft size={20} />
             </button>
             <h2 className="text-xl font-medium text-on-surface truncate">{subject.name_cn || subject.name}</h2>
        </div>

        {/* Compact Header Layout */}
        <div className="grid md:grid-cols-[240px_1fr] gap-8 mb-12">
            {/* Poster Card */}
            <div className="relative group">
                <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <img src={subject.images?.large || subject.images?.common} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Poster" />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-black px-4 py-2 rounded-2xl font-bold shadow-xl flex items-center gap-1.5 ring-4 ring-background">
                    <Star size={16} fill="currentColor" /> {subject.rating?.score || 'N/A'}
                </div>
            </div>

            {/* Info and Actions */}
            <div className="flex flex-col justify-center space-y-6">
                 <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-on-surface mb-2">{subject.name_cn || subject.name}</h1>
                    {subject.name_cn && subject.name !== subject.name_cn && (
                        <p className="text-lg text-on-surface-variant opacity-70">{subject.name}</p>
                    )}
                 </div>

                 <div className="flex flex-wrap items-center gap-2">
                     <span className="bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-xl text-sm font-medium">{subject.date}</span>
                     {subject.tags?.slice(0, 5).map(tag => (
                         <span key={tag.name} className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-xl text-xs">
                             #{tag.name}
                         </span>
                     ))}
                 </div>

                 {!selectedResult && (
                    <div className="pt-4">
                        <button 
                            onClick={handleSearchSources}
                            disabled={searchingSources}
                            className="bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/30 px-10 py-5 rounded-[2rem] font-bold text-lg flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {searchingSources ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                            {searchingSources ? 'Searching Sources...' : 'Start Watching'}
                        </button>
                    </div>
                 )}
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-12">
            
            {/* Video Player Section */}
            {currentEpisode && (
                <div className="w-full aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl ring-8 ring-surface-container relative">
                    {loadingVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                            <div className="text-center">
                                <Loader2 className="animate-spin w-12 h-12 mx-auto mb-4 text-primary" />
                                <p className="text-on-surface">Initializing Stream...</p>
                            </div>
                        </div>
                    )}
                    
                    {videoError ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high z-10">
                            <div className="text-center p-8">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
                                <p className="text-error font-medium mb-4">{videoError}</p>
                                <button onClick={() => setCurrentEpisode(null)} className="text-primary font-bold">Try Another Episode</button>
                            </div>
                        </div>
                    ) : (
                        <video ref={videoRef} controls className="w-full h-full" crossOrigin="anonymous" />
                    )}
                </div>
            )}

            {/* Episode List Container */}
            {selectedResult && (
                <div className="bg-surface-container p-8 rounded-[3rem] shadow-sm border border-outline/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                <Database size={24} />
                            </div>
                            <div>
                                <span className="block text-xs text-on-surface-variant uppercase tracking-widest font-bold">Source Provider</span>
                                <span className="font-bold text-xl text-on-surface">{selectedResult.sourceName}</span>
                            </div>
                         </div>
                         <button 
                            onClick={() => { setSelectedResult(null); setVideoUrl(null); setVideoError(null); }} 
                            className="bg-surface-container-highest text-primary font-bold px-6 py-3 rounded-2xl hover:bg-primary/10 transition-colors"
                         >
                            Switch Source
                         </button>
                    </div>

                    {loadingEpisodes ? (
                        <div className="py-12 text-center text-on-surface-variant flex flex-col items-center">
                            <Loader2 className="animate-spin mb-4 w-8 h-8 text-primary" /> 
                            <p>Loading playlist...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
                            {episodes.map((ep, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handlePlayEpisode(ep)}
                                    className={`py-4 px-2 rounded-2xl text-sm font-bold transition-all active:scale-90 ${
                                        currentEpisode?.url === ep.url 
                                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105' 
                                        : 'bg-surface-container-high hover:bg-surface-variant text-on-surface'
                                    }`}
                                >
                                    {ep.sort || ep.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Source Selection List */}
            {sourceResults.length > 0 && !selectedResult && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-on-surface">Available Sources</h3>
                        {searchingSources && <div className="flex items-center gap-2 text-sm text-primary font-medium"><Loader2 size={16} className="animate-spin" /> Searching...</div>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sourceResults.map((res, i) => (
                            <div key={`${res.sourceName}-${i}`} 
                                className="bg-surface-container p-6 rounded-[2rem] hover:bg-surface-container-high transition-all cursor-pointer group border border-outline/5 hover:border-primary/30 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500" 
                                onClick={() => handleSelectSource(res)}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-lg text-on-surface group-hover:text-primary truncate pr-2">{res.title}</h4>
                                    <span className="text-[10px] uppercase tracking-tighter font-black bg-primary/10 text-primary px-3 py-1 rounded-full">{res.sourceName}</span>
                                </div>
                                <div className="text-xs text-on-surface-variant/50 truncate font-mono bg-black/5 p-2 rounded-lg">{res.url}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};