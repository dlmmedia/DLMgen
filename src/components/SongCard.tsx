import React from 'react';
import { Song } from '../types';
import { Play, Pause, MoreHorizontal, Heart } from 'lucide-react';

interface SongCardProps {
  song: Song;
  isPlaying: boolean;
  isActive: boolean;
  onPlay: (song: Song) => void;
  onPause: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, isPlaying, isActive, onPlay, onPause }) => {
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive && isPlaying) {
      onPause();
    } else {
      onPlay(song);
    }
  };

  return (
    <div className={`group relative flex items-center p-3 rounded-md hover:bg-white/5 transition-colors cursor-pointer ${isActive ? 'bg-white/10' : ''}`}>
      {/* Image / Play Overlay */}
      <div className="relative w-16 h-16 flex-shrink-0 mr-4">
        <img 
          src={song.imageUrl} 
          alt={song.title} 
          className="w-full h-full object-cover rounded-md shadow-lg"
        />
        <div 
          onClick={handlePlayClick}
          className={`absolute inset-0 bg-black/40 flex items-center justify-center rounded-md transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {isActive && isPlaying ? (
            <Pause className="text-white w-8 h-8 fill-current" />
          ) : (
            <Play className="text-white w-8 h-8 fill-current" />
          )}
        </div>
        {song.status === 'generating' && (
           <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md">
             <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-bold text-base truncate ${isActive ? 'text-primary' : 'text-white'}`}>
          {song.title || 'Untitled Song'}
        </h3>
        <p className="text-sm text-gray-400 truncate hover:underline cursor-pointer">
          {song.artist}
        </p>
        <div className="flex gap-2 mt-1">
          {song.style && song.style.split(',').slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
              {tag.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 ml-4 text-gray-400">
        <span className="text-xs hidden sm:block">
           {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
        </span>
        <button className="hover:text-white hover:scale-110 transition-transform">
            <Heart className="w-5 h-5" />
        </button>
        <button className="hover:text-white">
            <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
