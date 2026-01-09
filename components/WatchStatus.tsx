import React from 'react';
import { BangumiSubject } from '../types';
import { PlayCircle, Clock, Calendar, Eye } from 'lucide-react';

interface WatchStatusProps {
  subject: BangumiSubject;
  accessToken: string;
  onStatusUpdate?: () => void;
}

export const WatchStatus: React.FC<WatchStatusProps> = ({ subject, accessToken, onStatusUpdate }) => {
  const [watchStatus, setWatchStatus] = React.useState<{
    watching: number;
    total: number;
    loading: boolean;
  }>({ watching: 0, total: 0, loading: false });

  // 获取追番状态
  React.useEffect(() => {
    const fetchStatus = async () => {
      if (!accessToken) return;
      
      setWatchStatus(prev => ({ ...prev, loading: true }));
      
      try {
        const { getSubjectWatchStatus } = await import('../services/bangumiService');
        const status = await getSubjectWatchStatus(accessToken, subject.id);
        setWatchStatus({ watching: status.watching, total: status.total, loading: false });
        
        if (onStatusUpdate) onStatusUpdate();
      } catch (error) {
        console.error('Failed to fetch watch status:', error);
        setWatchStatus({ watching: 0, total: 0, loading: false });
      }
    };

    fetchStatus();
  }, [subject.id, accessToken, onStatusUpdate]);

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
    <div className="flex items-center gap-4 p-2 bg-surface-container rounded-xl">
      <div className="flex items-center justify-center p-2 bg-surface-variant rounded-xl">
        {watchStatus.watching > 0 ? (
          <PlayCircle className="text-green-500" size={20} />
        ) : watchStatus.watching === watchStatus.total && watchStatus.total > 0 ? (
          <Eye className="text-blue-500" size={20} />
        ) : (
          <Calendar className="text-gray-400" size={20} />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm text-on-surface-variant mb-1">
          {getStatusText()}
        </div>
        {watchStatus.total > 1 && (
          <div className="relative h-1 bg-surface rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
              style={{ width: `${(watchStatus.watching / watchStatus.total) * 100}%` }}
            />
          </div>
          <div className="text-xs text-center text-on-surface mt-1">
            {getEpisodeRange().text}
          </div>
        )}
      </div>
    </div>
  );
};