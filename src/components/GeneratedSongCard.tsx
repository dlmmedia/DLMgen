import React, { useState } from 'react';
import { Track, Playlist } from '../types';
import { Play, Pause, Music, Clock, Calendar, MoreVertical } from 'lucide-react';
import { SongContextMenu } from './ui/SongContextMenu';

interface GeneratedSongCardProps {
  track: Track;
  isSelected?: boolean;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onDelete?: () => void;
  // Context menu action handlers
  onAddToQueue?: (track: Track) => void;
  onAddToPlaylist?: (track: Track, playlistId: string) => void;
  onCreatePlaylist?: (name: string, track?: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
  playlists?: Playlist[];
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatDurationWithComparison = (
  actual: number,
  expected?: number
): { text: string; hasVariance: boolean; isLonger: boolean } => {
  const actualStr = formatDuration(actual);
  
  if (!expected || Math.abs(expected - actual) <= 5) {
    return { text: actualStr, hasVariance: false, isLonger: false };
  }
  
  const diff = actual - expected;
  const sign = diff > 0 ? '+' : '';
  return {
    text: `${actualStr} (${sign}${diff}s)`,
    hasVariance: true,
    isLonger: diff > 0,
  };
};

export const GeneratedSongCard: React.FC<GeneratedSongCardProps> = ({
  track,
  isSelected,
  isCurrent,
  isPlaying,
  onSelect,
  onPlay,
  onDelete,
  onAddToQueue,
  onAddToPlaylist,
  onCreatePlaylist,
  onShowDetails,
  onDownload,
  onShare,
  playlists = [],
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div
      onClick={onSelect}
      className={`
        relative group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200
        ${
          isSelected
            ? 'bg-primary/10 border border-primary/30'
            : 'bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/10'
        }
      `}
    >
      {/* Cover Art */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-white/5">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={20} className="text-gray-400 dark:text-white/30" />
          </div>
        )}

        {/* Play/Pause Button Overlay */}
        <button
          onClick={handlePlayClick}
          className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
            isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause size={20} className="text-white fill-white" />
          ) : (
            <Play size={18} className="text-white fill-white ml-0.5" />
          )}
        </button>

        {/* Playing Indicator */}
        {isCurrent && isPlaying && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-[2px] items-end h-3">
            <span className="w-[3px] bg-primary rounded-full animate-pulse h-full" />
            <span className="w-[3px] bg-primary rounded-full animate-pulse h-2/3 animation-delay-75" />
            <span className="w-[3px] bg-primary rounded-full animate-pulse h-1/3 animation-delay-150" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-semibold text-sm truncate ${
            isSelected || isCurrent ? 'text-primary' : 'text-gray-900 dark:text-white'
          }`}
        >
          {track.title}
        </h4>
        <p className="text-xs text-gray-500 truncate">{track.artist}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 dark:text-gray-600">
          {(() => {
            const durationInfo = formatDurationWithComparison(
              track.actualDuration || track.duration,
              track.expectedDuration
            );
            return (
              <span 
                className={`flex items-center gap-1 ${
                  durationInfo.hasVariance 
                    ? durationInfo.isLonger 
                      ? 'text-yellow-600 dark:text-yellow-500' 
                      : 'text-blue-600 dark:text-blue-400'
                    : ''
                }`}
                title={durationInfo.hasVariance ? `Expected: ${formatDuration(track.expectedDuration || 0)}` : undefined}
              >
                <Clock size={9} />
                {durationInfo.text}
              </span>
            );
          })()}
          <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-white/5 rounded text-gray-600 dark:text-gray-500">{track.genre}</span>
          {track.isInstrumental && (
            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/10 rounded text-green-700 dark:text-green-500">
              Instrumental
            </span>
          )}
        </div>
      </div>

      {/* Date & Actions */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-600">
          <Calendar size={10} />
          {formatDate(track.createdAt)}
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={handleMenuClick}
            className="p-1 rounded-lg hover:bg-gray-300 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={14} />
          </button>

          {/* Context Menu */}
          <SongContextMenu
            track={track}
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            position="left"
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onAddToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
            onShowDetails={onShowDetails}
            onDownload={onDownload}
            onShare={onShare}
            onDelete={onDelete ? () => onDelete() : undefined}
            playlists={playlists}
          />
        </div>
      </div>

      {/* Style Tags (shown when selected) */}
      {isSelected && track.styleTags && track.styleTags.length > 0 && (
        <div className="absolute -bottom-1 left-3 right-3 flex gap-1 flex-wrap translate-y-full pt-2 pb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {track.styleTags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px] text-primary truncate max-w-[80px]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
