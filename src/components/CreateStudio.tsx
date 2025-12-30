import React, { useState, useEffect } from 'react';
import { Track, CreateSongParams, Playlist } from '../types';
import { CreateForm } from './CreateForm';
import { GeneratedSongCard } from './GeneratedSongCard';
import { LyricsViewer } from './LyricsViewer';
import { CircularProgress } from './CircularProgress';
import { Music, Sparkles, ListMusic, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';

interface CreateStudioProps {
  generatedTracks: Track[];
  onSubmit: (params: CreateSongParams) => Promise<void>;
  isGenerating: boolean;
  generationStep?: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  // New context menu action handlers
  onAddToQueue?: (track: Track) => void;
  onAddToPlaylist?: (track: Track, playlistId: string) => void;
  onCreatePlaylist?: (name: string, track?: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
  playlists?: Playlist[];
}

export const CreateStudio: React.FC<CreateStudioProps> = ({
  generatedTracks,
  onSubmit,
  isGenerating,
  generationStep = 0,
  currentTrack,
  isPlaying,
  onPlay,
  onDelete,
  onAddToQueue,
  onAddToPlaylist,
  onCreatePlaylist,
  onShowDetails,
  onDownload,
  onShare,
  playlists = [],
}) => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [mobileTab, setMobileTab] = useState<'form' | 'songs' | 'details'>('form');
  
  // Collapsible panel states
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Auto-select the newest track when a new one is created
  useEffect(() => {
    if (generatedTracks.length > 0 && !isGenerating) {
      const newest = generatedTracks[0];
      if (!selectedTrack || newest.id !== selectedTrack.id) {
        // Only auto-select if we just finished generating
        if (newest.createdAt && Date.now() - newest.createdAt < 5000) {
          setSelectedTrack(newest);
          setIsDetailsOpen(true);
          setMobileTab('details');
        }
      }
    }
  }, [generatedTracks, isGenerating]);

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    setIsDetailsOpen(true);
    setMobileTab('details');
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedTrack(null);
  };

  const handlePlay = (track: Track) => {
    setSelectedTrack(track);
    onPlay(track);
  };

  return (
    <div className="h-full relative">
      {/* Generation Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center">
          <CircularProgress step={generationStep} />
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex bg-gray-100 dark:bg-surface border-b border-gray-200 dark:border-white/5 mb-4 rounded-xl overflow-hidden">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            mobileTab === 'form'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setMobileTab('songs')}
          className={`flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'songs'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Songs
          {generatedTracks.length > 0 && (
            <span className="bg-primary/30 text-primary text-xs px-1.5 py-0.5 rounded-full">
              {generatedTracks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileTab('details')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            mobileTab === 'details'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Details
        </button>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-160px)]">
        {/* Left Panel - Form (Collapsible) */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
            mobileTab !== 'form' ? 'hidden md:flex' : 'flex'
          } ${isFormCollapsed ? 'w-14' : 'w-full md:w-[380px] lg:w-[420px]'}`}
        >
          {isFormCollapsed ? (
            // Collapsed Form View - Compact Toolbar
            <div className="h-full bg-white dark:bg-surface border border-gray-200 dark:border-white/5 rounded-2xl flex flex-col items-center py-4 gap-3">
              <button
                onClick={() => setIsFormCollapsed(false)}
                className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors group"
                title="Expand form"
              >
                <ChevronRight size={18} className="text-primary group-hover:scale-110 transition-transform" />
              </button>
              <div className="w-8 h-px bg-gray-200 dark:bg-white/10" />
              <button
                onClick={() => setIsFormCollapsed(false)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-red-700 hover:from-primary/90 hover:to-red-600 flex items-center justify-center shadow-lg hover:shadow-primary/30 transition-all group"
                title="Create new song"
              >
                <PlusCircle size={20} className="text-white group-hover:scale-110 transition-transform" />
              </button>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium writing-mode-vertical transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>
                Create
              </span>
            </div>
          ) : (
            // Expanded Form View
            <div className="relative w-full">
              <CreateForm onSubmit={onSubmit} isGenerating={isGenerating} hideLoader />
              {/* Collapse Button */}
              <button
                onClick={() => setIsFormCollapsed(true)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-r-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10 shadow-sm"
                title="Collapse form"
              >
                <ChevronLeft size={14} className="text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Center Panel - Generated Songs List */}
        <div
          className={`flex-1 min-w-0 ${
            mobileTab !== 'songs' ? 'hidden md:flex' : 'flex'
          } flex-col`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <ListMusic size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Your Creations</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {generatedTracks.length} song{generatedTracks.length !== 1 ? 's' : ''} generated
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {generatedTracks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
                  <Sparkles size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h4 className="text-lg font-bold text-gray-600 dark:text-white/80 mb-2">No songs yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Create your first AI-generated track using the form on the left
                </p>
              </div>
            ) : (
              generatedTracks.map((track) => (
                <GeneratedSongCard
                  key={track.id}
                  track={track}
                  isSelected={selectedTrack?.id === track.id}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  onSelect={() => handleTrackSelect(track)}
                  onPlay={() => handlePlay(track)}
                  onDelete={onDelete ? () => onDelete(track.id) : undefined}
                  onAddToQueue={onAddToQueue}
                  onAddToPlaylist={onAddToPlaylist}
                  onCreatePlaylist={onCreatePlaylist}
                  onShowDetails={onShowDetails}
                  onDownload={onDownload}
                  onShare={onShare}
                  playlists={playlists}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Song Details & Lyrics (Auto-collapsible) */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
            mobileTab !== 'details' ? 'hidden md:block' : ''
          } ${isDetailsOpen && selectedTrack ? 'w-full md:w-[340px] lg:w-[380px]' : 'w-0 md:w-0'}`}
        >
          {selectedTrack && isDetailsOpen && (
            <div className="relative h-full w-[340px] lg:w-[380px]">
              <LyricsViewer
                track={selectedTrack}
                isCurrent={currentTrack?.id === selectedTrack.id}
                isPlaying={isPlaying && currentTrack?.id === selectedTrack.id}
                onPlay={() => handlePlay(selectedTrack)}
                onClose={handleCloseDetails}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
