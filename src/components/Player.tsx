import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Heart } from 'lucide-react';
import { Track } from '../types'; // Updated types

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onEnded?: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const Player: React.FC<PlayerProps> = ({ currentTrack, isPlaying, onPlayPause, onNext, onPrev, onEnded, audioRef: externalAudioRef }) => {
  const internalAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalAudioRef || internalAudioRef;
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 md:px-8 flex items-center justify-between z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded} // Auto-play next
      />

      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="w-14 h-14 rounded-md bg-zinc-800 overflow-hidden relative group">
          {currentTrack?.coverUrl && (
            <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          )}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
            <SkipBack size={20} className="text-white fill-white" /> {/* Just a placeholder interaction */}
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-medium text-white truncate">{currentTrack?.title || 'No Song Selected'}</div>
          <div className="text-xs text-zinc-400 truncate">{currentTrack?.artist || 'Choose a track to play'}</div>
        </div>
        <Heart size={18} className="text-zinc-500 hover:text-primary cursor-pointer transition-colors" />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center gap-6 mb-2">
          <Shuffle size={16} className="text-zinc-500 hover:text-white cursor-pointer" />
          <button onClick={onPrev} className="text-zinc-400 hover:text-white transition-colors">
            <SkipBack size={20} className="fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={20} className="text-black fill-black" /> : <Play size={20} className="text-black fill-black ml-1" />}
          </button>

          <button onClick={onNext} className="text-zinc-400 hover:text-white transition-colors">
            <SkipForward size={20} className="fill-current" />
          </button>
          <Repeat size={16} className="text-zinc-500 hover:text-white cursor-pointer" />
        </div>

        <div className="w-full flex items-center gap-3 text-[10px] text-white/30 font-bold uppercase tracking-widest">
          <span className="w-10 text-right">{formatTime(progress)}</span>
          <div className="relative flex-1 group h-1.5">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all relative"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/30 to-transparent" />
              </div>
            </div>
            <div
              className="absolute w-3 h-3 bg-white rounded-full -top-[3px] shadow-[0_0_10px_rgba(255,255,255,0.5)] transform scale-0 group-hover:scale-100 transition-transform duration-200"
              style={{ left: `calc(${(progress / (duration || 1)) * 100}% - 6px)` }}
            />
          </div>
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume / Extra */}
      <div className="flex items-center justify-end gap-2 w-1/3 text-zinc-400">
        <Volume2 size={20} />
        <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-zinc-500 hover:bg-white transition-colors" />
        </div>
      </div>
    </div>
  );
};
