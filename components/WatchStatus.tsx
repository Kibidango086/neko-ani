import React, { useState, useEffect } from 'react';
import { BangumiSubject } from '../types';
import { PlayCircle, Eye, Clock, Calendar } from 'lucide-react';

interface WatchStatusProps {
  subject: BangumiSubject;
  accessToken: string;
  onStatusUpdate?: () => void;
}

export const WatchStatus: React.FC<WatchStatusProps> = ({ subject, accessToken, onStatusUpdate }) => {
  const [watchStatus, setWatchStatus] = useState({
    watching: 0,
    total: 0,
    loading: false
  });

  // 获取追番状态
  const fetchWatchStatus = async () => {
    if (!accessToken) return;
    
    setWatchStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // 使用原有的跨域解决方案
      const { getSubjectWatchStatusWithFallback } = await import('../services/bangumiService');
      const status = await getSubjectWatchStatusWithFallback(accessToken, subject.id);
      setWatchStatus({ watching: status.watching, total: status.total, loading: false });
      
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error('Failed to fetch watch status:', error);
      setWatchStatus({ watching: 0, total: 0, loading: false });
    }
  };

  useEffect(() => {
    fetchWatchStatus();
  }, [subject.id, accessToken, onStatusUpdate]);

  const updateWatchStatus = async (newStatus: number) => {
    try {
      // 使用原有的跨域解决方案
      const { updateCollectionStatusWithFallback } = await import('../services/bangumiService');
      await updateCollectionStatusWithFallback(accessToken, subject.id, newStatus);
      
      setWatchStatus(prev => ({ ...prev, watching: newStatus }));
      console.log(`Watch status updated to ${newStatus}/${subject.eps || 0}`);
      
      // Refresh the status after update
      await fetchWatchStatus();
    } catch (error) {
      console.error('Failed to update watch status:', error);
    }
  };

  const getEpisodeRange = () => {
    if (subject.eps && subject.eps > 0) {
      return {
        start: 1,
        end: subject.eps,
        current: Math.min(watchStatus.watching, watchStatus.total),
        text: `${watchStatus.watching}/${subject.eps}集`
      };
    }
    return { start: 0, end: 0, current: 0, text: '0集' };
  };

  const getStatusColor = () => {
    if (watchStatus.loading) return 'text-gray-500';
    if (watchStatus.watching > 0) return 'text-blue-500';
    if (watchStatus.watching === watchStatus.total && watchStatus.total > 0) return 'text-green-500';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (watchStatus.loading) return '获取状态中...';
    if (watchStatus.watching === 0 && watchStatus.total > 0) return '未开始';
    if (watchStatus.watching > 0 && watchStatus.watching < watchStatus.total) return `看到第${watchStatus.watching}集`;
    if (watchStatus.watching === watchStatus.total && watchStatus.total > 0) return '已看完';
    return '未知状态';
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-surface-container rounded-xl">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center p-2 bg-surface-variant rounded-xl">
          {watchStatus.watching > 0 ? (
            <PlayCircle className="text-blue-500" size={20} />
          ) : watchStatus.watching === watchStatus.total && watchStatus.total > 0 ? (
            <Eye className="text-green-500" size={20} />
          ) : (
            <Calendar className="text-gray-400" size={20} />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm text-on-surface-variant mb-1">
            {getStatusText()}
          </div>
          {subject.air_date && (
            <div className="text-xs text-on-surface/80 flex items-center gap-2">
              <Clock size={12} />
              <span>首播: {subject.air_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {watchStatus.total > 1 && (
        <div className="space-y-2">
          <div className="relative h-2 bg-surface-variant rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
              style={{ width: `${(watchStatus.watching / watchStatus.total) * 100}%` }}
            />
          </div>
          <div className="text-xs text-center text-on-surface-variant">
            {getEpisodeRange().text}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {accessToken && (
        <div className="flex gap-2">
          <button
            onClick={() => updateWatchStatus(Math.max(0, watchStatus.watching - 1))}
            className="px-3 py-1 text-xs bg-surface-variant text-on-surface-variant rounded-md hover:bg-surface-variant/80 transition-colors"
          >
            -1集
          </button>
          <button
            onClick={() => updateWatchStatus(Math.min(watchStatus.total, watchStatus.watching + 1))}
            className="px-3 py-1 text-xs bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            +1集
          </button>
          <button
            onClick={() => updateWatchStatus(watchStatus.total)}
            className="px-3 py-1 text-xs bg-surface-variant text-on-surface-variant rounded-md hover:bg-surface-variant/80 transition-colors"
          >
            标记完成
          </button>
        </div>
      )}
    </div>
  );
};