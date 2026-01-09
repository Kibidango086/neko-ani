import React, { useEffect, useState } from 'react';
import { getCalendar } from '../services/bangumiService';
import { BangumiSubject } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { Loader2, User, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store';

export const Home: React.FC = () => {
  const [trending, setTrending] = useState<BangumiSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'calendar'>('trending');
  const { bangumiToken, setBangumiToken } = useAppStore();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await getCalendar();
        setTrending(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
        setTrending([]);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'trending') {
      fetchTrending();
    }
  }, [activeTab, bangumiToken, setBangumiToken]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <header className="bg-surface-container-high shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-container text-on-primary-container rounded-2xl shadow-lg">
                <BookOpen className="text-primary" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-on-surface">Neko-Ani</h1>
            </div>
            
            {bangumiToken ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-2xl">
                <User className="text-primary" size={16} />
                <span className="text-sm font-medium text-on-surface-variant">已登录</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const token = prompt('请输入Bangumi Access Token:');
                  if (token) {
                    setBangumiToken(token);
                  }
                }}
                className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-primary/30 flex items-center gap-2"
              >
                登录 Bangumi
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-surface-container-high sticky top-0 z-40 backdrop-blur-md border-b border-outline/20">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex-1 py-4 px-6 border-b-4 font-medium text-sm transition-all duration-200 ${
                activeTab === 'trending'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className={`${activeTab === 'trending' ? 'text-primary' : 'text-on-surface-variant'}`} size={18} />
                <span>本季新番</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 py-4 px-6 border-b-4 font-medium text-sm transition-all duration-200 ${
                activeTab === 'calendar'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className={`${activeTab === 'calendar' ? 'text-primary' : 'text-on-surface-variant'}`} size={18} />
                <span>时间表</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'trending' && (
          <section className="space-y-8">
            <div className="mb-6">
              <h2 className="text-3xl font-medium text-on-surface tracking-tight">
                本季新番
              </h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <Loader2 className="animate-spin text-primary mx-auto" size={32} />
                  <p className="mt-4 text-on-surface-variant">加载中...</p>
                </div>
              </div>
            ) : Array.isArray(trending) && trending.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {trending.map((subject) => (
                  <div key={subject.id} className="group">
                    <AnimeCard subject={subject} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-surface-container rounded-2xl mb-4">
                    <Calendar className="text-on-surface-variant" size={32} />
                  </div>
                  <h3 className="text-xl font-medium text-on-surface mb-2">暂无本季新番</h3>
                  <p className="text-sm text-on-surface-variant max-w-md">
                    请稍后重试或检查网络连接
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'calendar' && (
          <section className="space-y-8">
            <div className="mb-6">
              <h2 className="text-3xl font-medium text-on-surface tracking-tight">
                放送时间表
              </h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <Loader2 className="animate-spin text-primary mx-auto" size={32} />
                  <p className="mt-4 text-on-surface-variant">加载中...</p>
                </div>
              </div>
            ) : Array.isArray(trending) && trending.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {trending.map((subject) => (
                  <div key={subject.id} className="group">
                    <AnimeCard subject={subject} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-surface-container rounded-2xl mb-4">
                    <Calendar className="text-on-surface-variant" size={32} />
                  </div>
                  <h3 className="text-xl font-medium text-on-surface mb-2">暂无放送数据</h3>
                  <p className="text-sm text-on-surface-variant max-w-md">
                    请稍后重试或检查网络连接
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};