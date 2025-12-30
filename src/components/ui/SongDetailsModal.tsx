import React, { useEffect } from 'react';
import { Track } from '../../types';
import {
  X,
  Play,
  Pause,
  Music,
  Clock,
  Tag,
  Calendar,
  Mic,
  FileText,
  Copy,
  Check,
  Download,
  Share2,
} from 'lucide-react';

interface SongDetailsModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return 'Unknown date';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'long',
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

// Parse lyrics to identify section headers like [Verse], [Chorus], etc.
const parseLyrics = (lyrics: string) => {
  if (!lyrics) return [];

  const lines = lyrics.split('\n');
  const sections: { type: 'header' | 'line'; content: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (headerMatch) {
      sections.push({ type: 'header', content: headerMatch[1] });
    } else {
      sections.push({ type: 'line', content: trimmed });
    }
  }

  return sections;
};

export const SongDetailsModal: React.FC<SongDetailsModalProps> = ({
  track,
  isOpen,
  onClose,
  isCurrent,
  isPlaying,
  onPlay,
  onDownload,
  onShare,
}) => {
  const [copied, setCopied] = React.useState(false);
  const parsedLyrics = parseLyrics(track.lyrics || '');

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleCopyLyrics = async () => {
    if (!track.lyrics) return;
    try {
      await navigator.clipboard.writeText(track.lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header with Cover Art */}
        <div className="relative">
          {/* Cover Art Background Blur */}
          <div className="absolute inset-0 overflow-hidden">
            {track.coverUrl && (
              <img
                src={track.coverUrl}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-30 scale-125"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 dark:via-[#0d0d0d]/50 to-white dark:to-[#0d0d0d]" />
          </div>

          {/* Content */}
          <div className="relative flex gap-6 p-6 pb-4">
            {/* Cover Art */}
            <div className="relative w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl group">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                  <Music size={48} className="text-gray-400 dark:text-white/30" />
                </div>
              )}

              {/* Play Overlay */}
              {onPlay && (
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
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Song</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{track.title}</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{track.artist}</p>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full text-gray-700 dark:text-gray-300">
                  <Clock size={12} />
                  {formatDuration(track.duration)}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full text-gray-700 dark:text-gray-300">
                  <Tag size={12} />
                  {track.genre}
                </span>
                {track.isInstrumental && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-500/20 rounded-full text-green-700 dark:text-green-400">
                    <Music size={12} />
                    Instrumental
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                {onPlay && (
                  <button
                    onClick={onPlay}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-colors"
                  >
                    {isCurrent && isPlaying ? (
                      <>
                        <Pause size={16} className="fill-white" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play size={16} className="fill-white ml-0.5" />
                        Play
                      </>
                    )}
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={onDownload}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-full transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={onShare}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-full transition-colors"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Lyrics Section */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {track.isInstrumental ? (
                  <Music size={16} className="text-green-600 dark:text-green-400" />
                ) : (
                  <Mic size={16} className="text-primary" />
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {track.isInstrumental ? 'Instrumental Track' : 'Lyrics'}
                </h3>
              </div>
              {!track.isInstrumental && track.lyrics && (
                <button
                  onClick={handleCopyLyrics}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {track.isInstrumental ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mb-4">
                  <Music size={28} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  This is an instrumental track with no vocals
                </p>
              </div>
            ) : parsedLyrics.length > 0 ? (
              <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
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
                    <p key={index} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {item.content}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <FileText size={28} className="text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-gray-500">No lyrics available</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h3>

            {/* Style Tags */}
            {track.styleTags && track.styleTags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Style Tags</p>
                <div className="flex flex-wrap gap-2">
                  {track.styleTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {track.description && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {track.description}
                </p>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar size={14} />
              <span>Created {formatDate(track.createdAt)}</span>
            </div>

            {/* Stats if available */}
            {(track.plays !== undefined || track.likes !== undefined) && (
              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                {track.plays !== undefined && (
                  <span>{track.plays.toLocaleString()} plays</span>
                )}
                {track.likes !== undefined && (
                  <span>{track.likes.toLocaleString()} likes</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
