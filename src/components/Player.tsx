import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Heart } from 'lucide-react';
import { Track } from '../types';

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
  const [isAudioReady, setIsAudioReady] = useState(false);
  
  // Track the ID of the audio currently loaded to prevent mismatch
  const loadedTrackIdRef = useRef<string | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);

  // Get the audio source URL from the current track
  const audioSource = currentTrack?.audioUrl || currentTrack?.url || '';

  // Handle track changes - ensure audio source matches current track
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !currentTrack) return;
    
    // Only update source if track actually changed
    if (lastTrackIdRef.current !== currentTrack.id) {
      console.log(`Player: Loading new track ${currentTrack.id}`);
      lastTrackIdRef.current = currentTrack.id;
      loadedTrackIdRef.current = null; // Mark as loading
      setIsAudioReady(false);
      
      // Reset progress when loading new track
      setProgress(0);
      setDuration(0);
      
      // Set the audio source directly
      const newSource = currentTrack.audioUrl || currentTrack.url;
      if (newSource && audioEl.src !== newSource) {
        console.log(`Player: Setting audio source for track ${currentTrack.id}`);
        audioEl.src = newSource;
        audioEl.load();
      }
    }
  }, [currentTrack, audioRef]);

  // Handle play/pause - only when audio is ready
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    
    // Don't try to play if there's no source
    if (!audioEl.src || audioEl.src === window.location.href) {
      return;
    }
    
    if (isPlaying) {
      // Use canplay event to ensure audio is ready before playing
      const playWhenReady = () => {
        audioEl.play().catch(e => {
          console.error("Playback failed:", e);
        });
      };
      
      // If audio is already ready, play immediately
      if (audioEl.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        playWhenReady();
      } else {
        // Wait for canplay event
        audioEl.addEventListener('canplay', playWhenReady, { once: true });
        return () => audioEl.removeEventListener('canplay', playWhenReady);
      }
    } else {
      audioEl.pause();
    }
  }, [isPlaying, audioRef, audioSource]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  }, [audioRef]);
  
  // Verify the correct audio is loaded
  const handleLoadedData = useCallback(() => {
    if (currentTrack && audioRef.current) {
      loadedTrackIdRef.current = currentTrack.id;
      setDuration(audioRef.current.duration || 0);
      setIsAudioReady(true);
      console.log(`Player: Track ${currentTrack.id} loaded, duration: ${audioRef.current.duration}s`);
    }
  }, [currentTrack, audioRef]);
  
  // Handle canplaythrough for smooth playback
  const handleCanPlayThrough = useCallback(() => {
    setIsAudioReady(true);
  }, []);
  
  // Handle audio errors
  const handleError = useCallback((e: Event) => {
    const audioEl = audioRef.current;
    const errorDetails = audioEl?.error 
      ? `Code ${audioEl.error.code}: ${audioEl.error.message}` 
      : 'Unknown error';
    console.error(`Player: Audio error for track ${currentTrack?.id}:`, errorDetails);
    loadedTrackIdRef.current = null;
    setIsAudioReady(false);
  }, [currentTrack, audioRef]);

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
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 px-4 md:px-8 flex items-center justify-between z-50">
      <audio
        ref={audioRef}
        src={audioSource || undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={handleLoadedData}
        onCanPlayThrough={handleCanPlayThrough}
        onError={handleError as any}
        onEnded={onEnded}
        data-track-id={currentTrack?.id || ''}
      />

      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="w-14 h-14 rounded-md bg-gray-200 dark:bg-zinc-800 overflow-hidden relative group">
          {currentTrack?.coverUrl && (
            <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          )}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
            <SkipBack size={20} className="text-white fill-white" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">{currentTrack?.title || 'No Song Selected'}</div>
          <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">{currentTrack?.artist || 'Choose a track to play'}</div>
        </div>
        <Heart size={18} className="text-gray-400 dark:text-zinc-500 hover:text-primary cursor-pointer transition-colors" />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center gap-6 mb-2">
          <Shuffle size={16} className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white cursor-pointer" />
          <button onClick={onPrev} className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <SkipBack size={20} className="fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={20} className="text-white dark:text-black fill-current" /> : <Play size={20} className="text-white dark:text-black fill-current ml-1" />}
          </button>

          <button onClick={onNext} className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <SkipForward size={20} className="fill-current" />
          </button>
          <Repeat size={16} className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white cursor-pointer" />
        </div>

        <div className="w-full flex items-center gap-3 text-[10px] text-gray-500 dark:text-white/30 font-bold uppercase tracking-widest">
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
            <div className="absolute inset-0 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all relative"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/30 to-transparent" />
              </div>
            </div>
            <div
              className="absolute w-3 h-3 bg-gray-900 dark:bg-white rounded-full -top-[3px] shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200"
              style={{ left: `calc(${(progress / (duration || 1)) * 100}% - 6px)` }}
            />
          </div>
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume / Extra */}
      <div className="flex items-center justify-end gap-2 w-1/3 text-gray-500 dark:text-zinc-400">
        <Volume2 size={20} />
        <div className="w-24 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-gray-400 dark:bg-zinc-500 hover:bg-gray-900 dark:hover:bg-white transition-colors" />
        </div>
      </div>
    </div>
  );
};
