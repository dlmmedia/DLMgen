import React from 'react';
import { Track, Playlist, Workspace } from '../../types';
import { LibrarySongRow } from './LibrarySongRow';
import { Clock, Trash2 } from 'lucide-react';

interface HistoryTrackItem {
  track: Track;
  playedAt: number;
}

interface LibraryHistoryViewProps {
  historyTracks: HistoryTrackItem[];
  currentTrackId?: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  playlists: Playlist[];
  workspaces: Workspace[];
  
  // Track actions
  onPlay: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: (name: string, track?: Track) => void;
  onMoveToWorkspace: (track: Track, workspaceId: string) => void;
  onCreateWorkspace: (name: string, track?: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
  onClearHistory?: () => void;
}

const formatPlayedAt = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
};

// Group history by time periods
const groupHistoryByPeriod = (historyTracks: HistoryTrackItem[]) => {
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const thisWeek = today - 7 * 86400000;
  const thisMonth = today - 30 * 86400000;

  const groups: { label: string; items: HistoryTrackItem[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'This Month', items: [] },
    { label: 'Older', items: [] },
  ];

  historyTracks.forEach((item) => {
    const playedAt = item.playedAt;
    if (playedAt >= today) {
      groups[0].items.push(item);
    } else if (playedAt >= yesterday) {
      groups[1].items.push(item);
    } else if (playedAt >= thisWeek) {
      groups[2].items.push(item);
    } else if (playedAt >= thisMonth) {
      groups[3].items.push(item);
    } else {
      groups[4].items.push(item);
    }
  });

  return groups.filter(g => g.items.length > 0);
};

export const LibraryHistoryView: React.FC<LibraryHistoryViewProps> = ({
  historyTracks,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  playlists,
  workspaces,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onCreatePlaylist,
  onMoveToWorkspace,
  onCreateWorkspace,
  onToggleLike,
  onAddToQueue,
  onShowDetails,
  onDownload,
  onShare,
  onClearHistory,
}) => {
  const groupedHistory = groupHistoryByPeriod(historyTracks);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
        <div className="text-sm text-gray-500">
          {historyTracks.length} {historyTracks.length === 1 ? 'track' : 'tracks'} in history
        </div>
        {historyTracks.length > 0 && onClearHistory && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {historyTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Clock size={24} className="text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No listening history</h3>
            <p className="text-sm text-gray-500">Songs you play will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedHistory.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">{group.label}</h3>
                <div className="space-y-1">
                  {group.items.map((item, index) => (
                    <div key={`${item.track.id}-${item.playedAt}-${index}`} className="relative">
                      {/* Time Badge */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-3 hidden xl:block">
                        <span className="text-[10px] text-gray-600 whitespace-nowrap">
                          {formatPlayedAt(item.playedAt)}
                        </span>
                      </div>
                      
                      <LibrarySongRow
                        track={item.track}
                        isCurrent={currentTrackId === item.track.id}
                        isPlaying={isPlaying && currentTrackId === item.track.id}
                        isLiked={likedTrackIds.includes(item.track.id)}
                        playlists={playlists}
                        workspaces={workspaces}
                        onPlay={() => onPlay(item.track)}
                        onDelete={onDelete ? () => onDelete(item.track.id) : undefined}
                        onAddToPlaylist={onAddToPlaylist}
                        onCreatePlaylist={onCreatePlaylist}
                        onMoveToWorkspace={onMoveToWorkspace}
                        onCreateWorkspace={onCreateWorkspace}
                        onToggleLike={() => onToggleLike(item.track)}
                        onAddToQueue={onAddToQueue}
                        onShowDetails={onShowDetails}
                        onDownload={onDownload}
                        onShare={onShare}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

