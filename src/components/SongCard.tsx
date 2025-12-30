import React from 'react';
import { Track } from '../types';
import { Play, Pause, Music } from 'lucide-react';

interface SongCardProps {
    track: Track;
    onPlay: (track: Track) => void;
    isPlaying?: boolean;
    isCurrent?: boolean;
}

const formatNumber = (num: number): string => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
};

export const SongCard: React.FC<SongCardProps> = ({ track, onPlay, isPlaying, isCurrent }) => {
    return (
        <div
            onClick={() => onPlay(track)}
            className="group bg-gray-100 dark:bg-white/[0.03] hover:bg-gray-200 dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/5 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 active:scale-95 shadow-lg hover:shadow-primary/5"
        >
            {/* Cover Image */}
            <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/5 shadow-inner">
                {track.coverUrl ? (
                    <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-white/20">
                        <Music size={40} />
                    </div>
                )}

                {/* Play overlay */}
                <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 ${isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-2xl transform transition-transform duration-300 group-hover:scale-110">
                        {isCurrent && isPlaying ? (
                            <Pause className="text-white fill-current" size={28} />
                        ) : (
                            <Play className="text-white fill-current ml-1" size={28} />
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-1">
                <h3 className={`font-bold text-base truncate ${isCurrent ? 'text-primary' : 'text-gray-900 dark:text-white/90'}`}>
                    {track.title}
                </h3>

                <p className="text-xs text-gray-500 dark:text-white/40 font-medium truncate">
                    {track.artist} • {track.genre}
                </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-white/5 text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                        <Play size={10} className="fill-current" /> {formatNumber(track.plays || 0)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 group-hover:text-accent transition-colors">
                        ❤ {formatNumber(track.likes || 0)}
                    </span>
                </div>
            </div>
        </div>
    );
};
