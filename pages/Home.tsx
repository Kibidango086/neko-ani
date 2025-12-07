import React, { useEffect, useState } from 'react';
import { getCalendar } from '../services/bangumiService';
import { BangumiSubject } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { Loader2 } from 'lucide-react';

export const Home: React.FC = () => {
  const [trending, setTrending] = useState<BangumiSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await getCalendar();
        setTrending(data);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <section>
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-medium text-on-surface tracking-tight">
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
              <AnimeCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};