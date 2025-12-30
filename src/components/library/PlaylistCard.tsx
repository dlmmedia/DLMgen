import React, { useState } from 'react';
import { Playlist } from '../../types';
import { Music2, Play, MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface PlaylistCardProps {
  playlist: Playlist;
  trackCount: number;
  coverUrls: string[];
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  trackCount,
  coverUrls,
  onClick,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Create mosaic of up to 4 covers
  const validCovers = coverUrls.filter(url => url && url.trim());
  const showMosaic = validCovers.length >= 4;

  return (
    <div
      className="group relative bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-3 hover:bg-gray-200 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/10 transition-all cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Art */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-purple-600/20 mb-3">
        {showMosaic ? (
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            {validCovers.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-full object-cover"
              />
            ))}
          </div>
        ) : validCovers.length > 0 ? (
          <img
            src={validCovers[0]}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={32} className="text-gray-400 dark:text-white/30" />
          </div>
        )}

        {/* Play Overlay */}
        <div
          className={`
            absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <Play size={20} className="text-white fill-white ml-1" />
          </div>
        </div>
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate mb-1">
        {playlist.name}
      </h3>
      <p className="text-xs text-gray-500">
        {trackCount} {trackCount === 1 ? 'song' : 'songs'}
      </p>

      {/* Menu Button */}
      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`p-1.5 rounded-lg bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm text-white transition-opacity ${
            isHovered || showMenu ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <MoreVertical size={14} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
