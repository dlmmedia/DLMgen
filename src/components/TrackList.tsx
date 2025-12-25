import React from 'react';
import { Play, Pause, Music, Clock } from 'lucide-react';
import { Track } from '../data/tracks';

interface TrackListProps {
    tracks: Track[];
    onPlay: (track: Track) => void;
    currentTrackId?: string;
    isPlaying?: boolean;
}

export const TrackList: React.FC<TrackListProps> = ({ tracks, onPlay, currentTrackId, isPlaying }) => {
    return (
        <div className="w-full">
            <div className="flex items-center text-sm font-medium text-gray-500 pb-3 border-b border-white/5 px-4 mb-2">
                <div className="w-12">#</div>
                <div className="flex-1">Title</div>
                <div className="hidden md:block w-48">Artist</div>
                <div className="w-20 text-right"><Clock size={16} className="inline" /></div>
            </div>

            <div className="space-y-1">
                {tracks.map((track, index) => {
                    const isCurrent = currentTrackId === track.id;
                    return (
                        <div
                            key={track.id}
                            onClick={() => onPlay(track)}
                            className={`
                  group flex items-center py-2 px-4 rounded-md cursor-pointer transition-all duration-200
                  ${isCurrent ? 'bg-white/10 text-primary' : 'hover:bg-white/5 text-gray-300 hover:text-white'}
                `}
                        >
                            <div className="w-12 flex items-center">
                                {isCurrent && isPlaying ? (
                                    <div className="flex gap-[2px] items-end h-4 w-4 overflow-hidden">
                                        <span className="w-1 bg-primary animate-pulse h-full"></span>
                                        <span className="w-1 bg-primary animate-pulse h-2/3 animation-delay-75"></span>
                                        <span className="w-1 bg-primary animate-pulse h-1/3 animation-delay-150"></span>
                                    </div>
                                ) : (
                                    <span className="group-hover:hidden">{index + 1}</span>
                                )}
                                <Play size={14} className={`hidden group-hover:block ${isCurrent ? 'text-primary' : 'text-white'}`} />
                            </div>

                            <div className="flex-1 flex items-center gap-3">
                                <div className="w-10 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                                    {track.coverUrl ? (
                                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-600">
                                            <Music size={16} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className={`font-medium ${isCurrent ? 'text-primary' : 'text-white'}`}>{track.title}</div>
                                    <div className="md:hidden text-xs text-gray-500">{track.artist}</div>
                                </div>
                            </div>

                            <div className="hidden md:block w-48 text-sm text-gray-500 group-hover:text-gray-400">
                                {track.artist}
                            </div>

                            <div className="w-20 text-right text-sm text-gray-500">
                                {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
