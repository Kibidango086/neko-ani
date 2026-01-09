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
        // 确保 data 是数组
        setTrending(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
        setTrending([]);
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
  }, [activeTab, bangumiToken, setUserCollection]);

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
    if (!collection) {
      return { current: 0, total: 0, text: '未开始', color: 'text-gray-500' };
    }
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

      {/* Tab Navigation */}
      <div className="bg-surface/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('trending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'trending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              本季新番
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              时间表
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'collection'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              我的追番
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'trending' && (
          <section>
            <h2 className="text-2xl font-medium text-on-surface tracking-tight">
              本季新番
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : Array.isArray(trending) && trending.length > 0 ? (
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
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-on-surface-variant mb-4 mx-auto" />
                <p className="text-on-surface-variant mb-2">暂无本季新番数据</p>
                <p className="text-sm text-on-surface/80">
                  请稍后重试或检查网络连接
                </p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'calendar' && (
          <section>
            <h2 className="text-2xl font-medium text-on-surface tracking-tight">
              放送时间表
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
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
                  共 {userCollection.data?.total || userCollection.data?.list?.length || 0} 部
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
            ) : userCollection && userCollection.data && Array.isArray(userCollection.data.list) && userCollection.data.list.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">
                  共 {userCollection.data.total || userCollection.data.list.length} 部追番记录
                </p>
                <div className="text-center py-8 text-on-surface-variant">
                  <BookOpen className="w-16 h-16 text-on-surface-variant mb-4 mx-auto" />
                  <p className="mb-2">追番列表功能正在开发中</p>
                  <p className="text-sm text-on-surface/80">
                    当前显示 {userCollection.data.list.length} 条记录
                  </p>
                </div>
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