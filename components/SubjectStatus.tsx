import React from 'react';
import { BangumiSubject } from '../types';
import { Plus, Check, Eye, Play, Clock, BookOpen, X } from 'lucide-react';

interface SubjectStatusProps {
  subject: BangumiSubject;
  onStatusChange?: () => void;
}

export const SubjectStatus: React.FC<SubjectStatusProps> = ({ subject, onStatusChange }) => {
  const { collection } = subject;

  const getStatusColor = () => {
    if (collection.doing > 0) return 'text-blue-500';
    if (collection.collect > 0) return 'text-green-500';
    if (collection.on_hold > 0) return 'text-orange-500';
    if (collection.dropped > 0) return 'text-gray-500';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (collection.doing > 0) return '在看';
    if (collection.collect > 0) return '已看';
    if (collection.on_hold > 0) return '搁置';
    if (collection.dropped > 0) return '放弃';
    return '未标记';
  };

  const updateStatus = async (type: number, comment?: string) => {
    // This would call the updateCollectionStatus API
    // For now, just log the action
    console.log(`Update status for ${subject.id}: ${type} - ${comment || ''}`);
    if (onStatusChange) onStatusChange();
  };

  return (
    <div className="relative group">
      <button
        onClick={() => {
          if (collection.doing > 0) {
            updateStatus(1); // Mark as completed
          } else if (collection.collect > 0) {
            updateStatus(2); // Mark as watching
          } else {
            updateStatus(1); // Mark as watching by default
          }
        }}
        className="flex items-center gap-2 p-2 bg-surface-container-high rounded-xl hover:bg-surface-variant transition-all"
      >
        {collection.doing > 0 ? (
          <Play className="text-blue-500" size={16} />
        ) : collection.collect > 0 ? (
          <Eye className="text-green-500" size={16} />
        ) : collection.on_hold > 0 ? (
          <Clock className="text-orange-500" size={16} />
        ) : collection.dropped > 0 ? (
          <X className="text-gray-500" size={16} />
        ) : (
          <Plus className="text-gray-400" size={16} />
        )}
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </button>
      
      {/* Progress indicator */}
      {(collection.doing > 0 || collection.collect > 0) && (
        <div className="absolute -bottom-1 left-0 right-0">
          <div className="bg-surface-container-high rounded-xl p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant">进度:</span>
                <span className="font-mono text-on-surface">
                  {collection.doing > 0 ? `${collection.doing}/${subject.eps || '?'}` : `${collection.collect}/${subject.eps_count || '?'}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant">状态:</span>
                <select 
                  onChange={(e) => updateStatus(parseInt(e.target.value))}
                  className="bg-surface rounded-lg px-2 py-1 text-xs font-mono text-on-surface border border-outline/20"
                  defaultValue={collection.doing > 0 ? '1' : collection.collect > 0 ? '2' : '3'}
                >
                  <option value="1">在看</option>
                  <option value="2">已看</option>
                  <option value="3">搁置</option>
                  <option value="4">抛弃</option>
                  <option value="0">取消标记</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};