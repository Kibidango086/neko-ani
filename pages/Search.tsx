import React, { useState } from 'react';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { searchBangumi } from '../services/bangumiService';
import { BangumiSubject } from '../types';
import { AnimeCard } from '../components/AnimeCard';

export const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BangumiSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchBangumi(query);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
       <div className="flex justify-center pt-4">
           <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
              <div className="relative group">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search anime..."
                    className="w-full bg-surface-container-high text-on-surface rounded-full py-4 pl-14 pr-16 shadow-sm hover:shadow-md focus:shadow-lg focus:bg-surface-container transition-all outline-none border-none text-lg"
                  />
                  <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={24} />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 top-2 bottom-2 bg-primary-container hover:bg-opacity-80 text-on-primary-container px-6 rounded-full font-medium transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Go'}
                  </button>
              </div>
           </form>
       </div>

       {hasSearched && (
         <div className="space-y-6">
            <h3 className="text-xl font-medium text-on-surface-variant px-2">
                Found {results.length} results
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {results.map(subject => (
                    <AnimeCard key={subject.id} subject={subject} />
                ))}
            </div>
            {results.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant/50">
                    <SearchIcon size={48} className="mb-4 opacity-50" />
                    <p>No results found. Try a different keyword.</p>
                </div>
            )}
         </div>
       )}
    </div>
  );
};