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
} from 'lucide-react';

interface LyricsViewerProps {
  track: Track;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
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
    <div className="h-full bg-surface/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
      {/* Header with Cover Art */}
      <div className="relative">
        {/* Cover Art Background Blur */}
        <div className="absolute inset-0 overflow-hidden">
          {track.coverUrl && (
            <img
              src={track.coverUrl}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-30 scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-surface" />
        </div>

        {/* Content */}
        <div className="relative p-5">
          {/* Cover Art */}
          <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-4 rounded-xl overflow-hidden shadow-2xl group">
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Music size={48} className="text-white/30" />
              </div>
            )}

            {/* Play Overlay */}
            <button
              onClick={onPlay}
              className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                {isCurrent && isPlaying ? (
                  <Pause className="text-white fill-white" size={24} />
                ) : (
                  <Play className="text-white fill-white ml-1" size={24} />
                )}
              </div>
            </button>
          </div>

          {/* Track Info */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1 truncate">{track.title}</h2>
            <p className="text-sm text-gray-400 mb-3">{track.artist}</p>

            {/* Meta Pills */}
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full text-gray-400">
                <Clock size={10} />
                {formatDuration(track.duration)}
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full text-gray-400">
                <Tag size={10} />
                {track.genre}
              </span>
              {track.isInstrumental && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-green-400">
                  <Music size={10} />
                  Instrumental
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Lyrics Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            {track.isInstrumental ? (
              <Music size={14} className="text-green-400" />
            ) : (
              <Mic size={14} className="text-primary" />
            )}
            <span className="text-sm font-medium text-white">
              {track.isInstrumental ? 'Instrumental Track' : 'Lyrics'}
            </span>
          </div>
          {!track.isInstrumental && track.lyrics && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-green-400" />
                  <span className="text-green-400">Copied</span>
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
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Music size={28} className="text-green-400" />
              </div>
              <p className="text-gray-400 text-sm">
                This is an instrumental track with no vocals
              </p>
            </div>
          ) : parsedLyrics.length > 0 ? (
            <div className="space-y-1">
              {parsedLyrics.map((item, index) => {
                if (item.type === 'header') {
                  return (
                    <div
                      key={index}
                      className="text-xs font-bold text-primary uppercase tracking-wider mt-4 mb-2 first:mt-0"
                    >
                      [{item.content}]
                    </div>
                  );
                }
                if (!item.content) {
                  return <div key={index} className="h-2" />;
                }
                return (
                  <p key={index} className="text-sm text-gray-300 leading-relaxed font-mono">
                    {item.content}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <FileText size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">No lyrics available</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Date & Description */}
      <div className="border-t border-white/5 p-4 space-y-3">
        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={12} />
          <span>Created {formatDate(track.createdAt)}</span>
        </div>

        {/* Style Tags */}
        {track.styleTags && track.styleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {track.styleTags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {track.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {track.description}
          </p>
        )}
      </div>
    </div>
  );
};

