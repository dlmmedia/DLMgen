import React, { useState } from 'react';
import { Track } from '../types';
import {
  Play,
  Pause,
  Music,
  Copy,
  Check,
  Clock,
  Tag,
  Calendar,
  Mic,
  FileText,
  X,
} from 'lucide-react';

interface LyricsViewerProps {
  track: Track;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  onClose?: () => void;
}

// Parse lyrics to identify section headers like [Verse], [Chorus], etc.
const parseLyrics = (lyrics: string) => {
  if (!lyrics) return [];

  const lines = lyrics.split('\n');
  const sections: { type: 'header' | 'line'; content: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match section headers like [Verse 1], [Chorus], [Bridge], etc.
    const headerMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (headerMatch) {
      sections.push({ type: 'header', content: headerMatch[1] });
    } else {
      sections.push({ type: 'line', content: trimmed });
    }
  }

  return sections;
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return 'Unknown date';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const LyricsViewer: React.FC<LyricsViewerProps> = ({
  track,
  isCurrent,
  isPlaying,
  onPlay,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const parsedLyrics = parseLyrics(track.lyrics || '');

  const handleCopy = async () => {
    if (!track.lyrics) return;
    try {
      await navigator.clipboard.writeText(track.lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed
    }
  };

  return (
    <div className="h-full bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden">
      {/* Header with Cover Art */}
      <div className="relative">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-colors group"
            title="Close details"
          >
            <X size={16} className="text-white group-hover:scale-110 transition-transform" />
          </button>
        )}
        
        {/* Cover Art Background Blur */}
        <div className="absolute inset-0 overflow-hidden">
          {track.coverUrl && (
            <img
              src={track.coverUrl}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-30 dark:opacity-40 scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white dark:via-surface/80 dark:to-surface" />
        </div>

        {/* Content - Compact Layout */}
        <div className="relative p-4">
          <div className="flex items-center gap-4">
            {/* Cover Art - Smaller */}
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-lg group">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                  <Music size={24} className="text-gray-400 dark:text-white/30" />
                </div>
              )}

              {/* Play Overlay */}
              <button
                onClick={onPlay}
                className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                  isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                  {isCurrent && isPlaying ? (
                    <Pause className="text-white fill-white" size={16} />
                  ) : (
                    <Play className="text-white fill-white ml-0.5" size={16} />
                  )}
                </div>
              </button>
            </div>

            {/* Track Info - Right of cover */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5 truncate">{track.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{track.artist}</p>

              {/* Meta Pills - Inline */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full text-gray-600 dark:text-gray-400">
                  <Clock size={10} />
                  {formatDuration(track.duration)}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full text-gray-600 dark:text-gray-400">
                  <Tag size={10} />
                  {track.genre}
                </span>
                {track.isInstrumental && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-500/20 rounded-full text-green-700 dark:text-green-400">
                    <Music size={10} />
                    Instrumental
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-white/5" />

      {/* Lyrics Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            {track.isInstrumental ? (
              <Music size={14} className="text-green-600 dark:text-green-400" />
            ) : (
              <Mic size={14} className="text-primary" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {track.isInstrumental ? 'Instrumental Track' : 'Lyrics'}
            </span>
          </div>
          {!track.isInstrumental && track.lyrics && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {track.isInstrumental ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mb-3">
                <Music size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Instrumental track
              </p>
            </div>
          ) : parsedLyrics.length > 0 ? (
            <div className="space-y-0.5">
              {parsedLyrics.map((item, index) => {
                if (item.type === 'header') {
                  return (
                    <div
                      key={index}
                      className="text-sm font-bold text-primary uppercase tracking-wide mt-5 mb-2 first:mt-0 flex items-center gap-2"
                    >
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      {item.content}
                    </div>
                  );
                }
                if (!item.content) {
                  return <div key={index} className="h-3" />;
                }
                return (
                  <p key={index} className="text-base text-gray-700 dark:text-gray-200 leading-relaxed pl-3">
                    {item.content}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-3">
                <FileText size={20} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No lyrics available</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Compact */}
      <div className="border-t border-gray-200 dark:border-white/10 px-4 py-2.5 bg-gray-50 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Calendar size={10} />
            <span>{formatDate(track.createdAt)}</span>
          </div>

          {/* Style Tags - Horizontal scroll */}
          {track.styleTags && track.styleTags.length > 0 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {track.styleTags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[10px] text-primary whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
              {track.styleTags.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                  +{track.styleTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
