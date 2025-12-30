import React, { useState } from 'react';
import { Track, Playlist, Workspace } from '../../types';
import { 
  Play, 
  Pause, 
  Music, 
  Heart, 
  MoreHorizontal,
  Clock,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';
import { SongContextMenu } from '../ui/SongContextMenu';

interface LibrarySongRowProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  playlists: Playlist[];
  workspaces: Workspace[];
  
  // Actions
  onPlay: () => void;
  onDelete?: () => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: (name: string, track?: Track) => void;
  onMoveToWorkspace: (track: Track, workspaceId: string) => void;
  onCreateWorkspace: (name: string, track?: Track) => void;
  onToggleLike: () => void;
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
}

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const LibrarySongRow: React.FC<LibrarySongRowProps> = ({
  track,
  isCurrent,
  isPlaying,
  isLiked,
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
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 cursor-pointer
        ${isCurrent 
          ? 'bg-primary/10 border border-primary/20' 
          : 'hover:bg-white/[0.03] border border-transparent'
        }
      `}
      onClick={onPlay}
    >
      {/* Cover Art with Play Button */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={18} className="text-white/30" />
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        <div
          className={`
            absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity
            ${isHovered || (isCurrent && isPlaying) ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {isCurrent && isPlaying ? (
            <Pause size={16} className="text-white fill-white" />
          ) : (
            <Play size={16} className="text-white fill-white ml-0.5" />
          )}
        </div>

        {/* Playing Animation */}
        {isCurrent && isPlaying && !isHovered && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-[2px] items-end h-2.5">
            <span className="w-[2px] bg-primary rounded-full animate-pulse h-full" />
            <span className="w-[2px] bg-primary rounded-full animate-pulse h-2/3 animation-delay-75" />
            <span className="w-[2px] bg-primary rounded-full animate-pulse h-1/3 animation-delay-150" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium text-sm truncate ${isCurrent ? 'text-primary' : 'text-white'}`}>
            {track.title}
          </h4>
          {track.isVerified && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-medium rounded">v5</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5 max-w-lg">
          {track.description || `${track.genre} track by ${track.artist}`}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
        {track.plays !== undefined && (
          <div className="flex items-center gap-1.5 min-w-[50px]">
            <Play size={12} />
            <span>{track.plays}</span>
          </div>
        )}
        {track.likes !== undefined && (
          <div className="flex items-center gap-1.5 min-w-[50px]">
            <ThumbsUp size={12} />
            <span>{track.likes}</span>
          </div>
        )}
        {track.comments !== undefined && (
          <div className="flex items-center gap-1.5 min-w-[50px]">
            <MessageCircle size={12} />
            <span>{track.comments}</span>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 w-14 justify-end">
        <Clock size={12} />
        <span>{formatDuration(track.duration)}</span>
      </div>

      {/* Date */}
      <div className="hidden md:block text-xs text-gray-600 w-20 text-right">
        {formatDate(track.createdAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Like Button */}
        <button
          onClick={onToggleLike}
          className={`p-2 rounded-lg transition-all ${
            isLiked 
              ? 'text-red-500 hover:bg-red-500/10' 
              : 'text-gray-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={16} className={isLiked ? 'fill-current' : ''} />
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={16} />
          </button>

          <SongContextMenu
            track={track}
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            position="left"
            playlists={playlists}
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onAddToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
            onShowDetails={onShowDetails}
            onDownload={onDownload}
            onShare={onShare}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};

