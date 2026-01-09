import React, { useEffect, useState } from 'react';
import { getCalendar } from '../services/bangumiService';
import { BangumiSubject } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { SubjectStatus } from '../components/SubjectStatus';
import { Loader2, User, Calendar, BookOpen } from 'lucide-react';
import { useAppStore } from '../store';

export const Home: React.FC = () => {
  const [trending, setTrending] = useState<BangumiSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'calendar' | 'collection'>('trending');
  const { bangumiToken, userCollection, setBangumiToken, setUserCollection } = useAppStore();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await getCalendar();
        setTrending(data);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchUserCollection = async () => {
      if (!bangumiToken) return;
      setCollectionLoading(true);
      try {
        const { getUserCollectionWithFallback } = await import('../services/bangumiService');
        const collection = await getUserCollectionWithFallback(bangumiToken);
        setUserCollection(collection);
      } catch (error) {
        console.error('Failed to fetch user collection:', error);
      } finally {
        setCollectionLoading(false);
      }
    };

    if (activeTab === 'trending') {
      fetchTrending();
    } else if (activeTab === 'collection') {
      fetchUserCollection();
    }
  }, [activeTab, bangumiToken]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getEpisodeStatus = (subject: BangumiSubject) => {
    const { collection } = subject;
    if (collection?.doing > 0) {
      const current = collection.doing;
      const total = subject.eps || 0;
      return { current, total, text: `在看 ${current}/${total}`, color: 'text-blue-500' };
    } else if (collection?.collect > 0) {
      const current = collection.collect;
      const total = subject.eps_count || 0;
      return { current, total, text: `已看 ${current}/${total}`, color: 'text-green-500' };
    }
    return { current: 0, total: 0, text: '未开始', color: 'text-gray-500' };
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <header className="bg-surface-container shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <BookOpen className="text-primary" size={24} />
              Neko-Ani
            </h1>
            
            {bangumiToken ? (
              <div className="flex items-center gap-2 text-sm text-on-surface">
                <User className="text-primary" size={16} />
                <span>已登录</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const token = prompt('请输入Bangumi Access Token:');
                  if (token) {
                    setBangumiToken(token);
                  }
                }}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                登录 Bangumi
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-surface/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex border-b border-outline/20">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trending' 
                  ? 'text-primary border-primary' 
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              <Calendar className="w-4 h-4" />
              本季新番
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'collection' 
                  ? 'text-primary border-primary' 
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              我的追番
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4">
        {activeTab === 'trending' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-on-surface tracking-tight">
                    Trending Now
              </h2>
            </div>
            
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {trending.map((subject) => (
                  <div key={subject.id} className="relative group">
                    <AnimeCard subject={subject} />
                    
                    {/* Episode Progress Badge */}
                    <div className="absolute top-2 right-2">
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                        subject.air_date ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {subject.air_date ? 
                          `第${subject.air_weekday || 1}集` 
                          : subject.eps ? `${subject.eps}集` : '未知'
                        }
                      </div>
                    </div>

                    {/* Subject Status */}
                    <div className="absolute bottom-2 left-2">
                      <SubjectStatus subject={subject} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'collection' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-on-surface tracking-tight">
                    我的追番
              </h2>
              {userCollection && (
                <span className="text-sm text-on-surface-variant ml-4">
                  共 {userCollection.total || userCollection.list?.length || 0} 部
                </span>
              )}
            </div>
            
            {(!bangumiToken || collectionLoading) ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <User className="w-16 h-16 text-on-surface-variant mb-4" />
                  <p className="text-on-surface-variant">请先登录Bangumi账号</p>
                  <p className="text-sm text-on-surface/80">
                    登录后可同步您的追番列表
                  </p>
                </div>
              </div>
            ) : userCollection && userCollection.list?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userCollection.list?.map((item) => (
                  <div key={item.subject.id} className="bg-surface-container rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <img 
                        src={item.subject.images?.grid || item.subject.images?.large || ''} 
                        alt={item.subject.name}
                        className="w-16 h-16 object-cover rounded-lg bg-surface-variant"
                        onError={(e) => {
                          e.currentTarget.src = '';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-on-surface mb-1">
                          {item.subject.name_cn || item.subject.name}
                        </h3>
                        <p className="text-sm text-on-surface-variant mb-2 line-clamp-2">
                          {item.subject.summary}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${getEpisodeStatus(item.subject).color}`}>
                            {getEpisodeStatus(item.subject).text}
                          </span>
                          <span className="text-xs text-on-surface/80">
                            {item.subject.air_date && `首播: ${formatDate(item.subject.air_date)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-on-surface-variant mb-4 mx-auto" />
                <p className="text-on-surface-variant mb-2">还没有追番记录</p>
                <p className="text-sm text-on-surface/80">
                  在番剧详情页面添加到您的追番列表
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};