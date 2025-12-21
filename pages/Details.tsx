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
        
        if (Hls.isSupported()) {
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
                            const tload = performance.now();
                            this.stats.tfirst = Math.max(this.stats.trequest + 1, tload - 1);
                            this.stats.tload = tload;
                            this.stats.loading.first = this.stats.tfirst;
                            this.stats.loading.end = tload;
                            this.stats.loaded = res.data?.byteLength || res.data?.length || 0;
                            this.stats.total = this.stats.loaded;
                            
                            // 模拟 parsing 和 buffering 的耗时
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
                if (data.fatal) {
                   setVideoError(`Playback failed: ${data.details || data.type}. Check console for details.`);
                }
            });
            hlsRef.current = hls;
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = videoUrl;
            videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
        } else {
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
    
    const resultsPromises = mediaSources.map(source => searchSource(source, keyword));
    const resultsArray = await Promise.all(resultsPromises);
    const flatResults = resultsArray.flat();
    
    setSourceResults(flatResults);
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
    <div className="pb-20">
        {/* Banner with Material design touch */}
        <div className="relative h-[45vh] w-full overflow-hidden rounded-b-[2.5rem] shadow-lg mb-8">
             <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
             <div className="absolute inset-0 bg-black/30 z-0" />
             <img src={subject.images?.large || subject.images?.common} className="w-full h-full object-cover" alt="Banner" />
             
             <div className="absolute top-4 left-4 z-20">
                 <button onClick={() => navigate(-1)} className="bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/60 transition-colors">
                     <ArrowLeft />
                 </button>
             </div>

             <div className="absolute bottom-0 left-0 p-6 md:p-10 z-20 max-w-4xl w-full">
                 <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-md">{subject.name_cn || subject.name}</h1>
                 <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200 mb-6">
                     <div className="flex items-center gap-1 bg-yellow-400/90 text-black px-3 py-1 rounded-full font-bold">
                         <Star size={14} fill="currentColor" /> {subject.rating?.score || 'N/A'}
                     </div>
                     <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{subject.date}</span>
                 </div>
                 
                 {!selectedResult && (
                    <button 
                        onClick={handleSearchSources}
                        disabled={searchingSources}
                        className="bg-primary-container text-on-primary-container hover:bg-primary/90 px-8 py-4 rounded-full font-medium text-lg flex items-center gap-3 transition-all shadow-lg hover:shadow-primary/20"
                    >
                        {searchingSources ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                        {searchingSources ? 'Searching Sources...' : 'Find Available Sources'}
                    </button>
                 )}
             </div>
        </div>

        {/* Content Area */}
        <div className="px-4 md:px-8 space-y-10 max-w-7xl mx-auto">
            
            {/* Video Player Section */}
            {currentEpisode && (
                <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-surface-container relative group">
                    {loadingVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                            <div className="text-center">
                                <Loader2 className="animate-spin w-12 h-12 mx-auto mb-4 text-primary" />
                                <p className="text-on-surface">Parsing video stream...</p>
                            </div>
                        </div>
                    )}
                    
                    {videoError ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high z-10">
                            <div className="text-center p-8 bg-surface-variant/30 rounded-2xl">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
                                <p className="text-error font-medium mb-2">{videoError}</p>
                                <p className="text-sm text-on-surface-variant">Please try a different source or episode.</p>
                            </div>
                        </div>
                    ) : (
                        <video ref={videoRef} controls className="w-full h-full" crossOrigin="anonymous" />
                    )}
                </div>
            )}

            {/* Episode List Container */}
            {selectedResult && (
                <div className="bg-surface-container p-6 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary-container rounded-xl text-on-secondary-container">
                                <Database size={20} />
                            </div>
                            <div>
                                <span className="block text-xs text-on-surface-variant">Current Source</span>
                                <span className="font-bold text-lg text-on-surface">{selectedResult.sourceName}</span>
                            </div>
                         </div>
                         <button 
                            onClick={() => { setSelectedResult(null); setVideoUrl(null); setVideoError(null); }} 
                            className="text-sm font-medium text-primary hover:text-primary-container px-4 py-2 rounded-full hover:bg-primary/10 transition-colors"
                         >
                            Change Source
                         </button>
                    </div>

                    {loadingEpisodes ? (
                        <div className="py-12 text-center text-on-surface-variant flex flex-col items-center">
                            <Loader2 className="animate-spin mb-2" /> 
                            Fetching episodes...
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {episodes.map((ep, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handlePlayEpisode(ep)}
                                    className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                                        currentEpisode?.url === ep.url 
                                        ? 'bg-primary text-on-primary shadow-md' 
                                        : 'bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-white'
                                    }`}
                                >
                                    {ep.sort || ep.title}
                                </button>
                            ))}
                            {episodes.length === 0 && <div className="col-span-full text-center text-on-surface-variant py-8">No episodes found.</div>}
                        </div>
                    )}
                </div>
            )}

            {/* Source Selection List */}
            {sourceResults.length > 0 && !selectedResult && (
                <div className="space-y-4">
                    <h3 className="text-xl font-medium flex items-center gap-2 text-on-surface">
                        Available Sources
                        <span className="text-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full ml-2">{sourceResults.length}</span>
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sourceResults.map(res => (
                            <div key={res.sourceId.toString()} 
                                className="bg-surface-container p-5 rounded-2xl hover:bg-surface-container-high transition-all cursor-pointer group border border-transparent hover:border-primary/20" 
                                onClick={() => handleSelectSource(res)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-on-surface group-hover:text-primary truncate pr-2">{res.title}</h4>
                                    <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{res.sourceName}</span>
                                </div>
                                <div className="text-xs text-on-surface-variant/70 truncate font-mono">{res.url}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {subject.tags?.map(tag => (
                    <span key={tag.name} className="px-4 py-1.5 rounded-lg bg-surface-container-high border border-outline/20 text-sm text-on-surface-variant hover:bg-surface-variant transition-colors cursor-default">
                        #{tag.name}
                    </span>
                ))}
            </div>

            {/* Summary */}
            <div className="bg-surface-container/50 p-6 rounded-3xl">
                <h3 className="text-lg font-bold mb-3 text-on-surface">Overview</h3>
                <p className="text-on-surface-variant leading-relaxed">{subject.summary || "No summary available."}</p>
            </div>
            
        </div>
    </div>
  );
};