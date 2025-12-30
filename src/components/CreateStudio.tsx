import React, { useState, useEffect } from 'react';
import { Track, CreateSongParams, Playlist } from '../types';
import { CreateForm } from './CreateForm';
import { GeneratedSongCard } from './GeneratedSongCard';
import { LyricsViewer } from './LyricsViewer';
import { CircularProgress } from './CircularProgress';
import { Music, Sparkles, ListMusic } from 'lucide-react';

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

  // Auto-select the newest track when a new one is created
  useEffect(() => {
    if (generatedTracks.length > 0 && !isGenerating) {
      const newest = generatedTracks[0];
      if (!selectedTrack || newest.id !== selectedTrack.id) {
        // Only auto-select if we just finished generating
        if (newest.createdAt && Date.now() - newest.createdAt < 5000) {
          setSelectedTrack(newest);
          setMobileTab('details');
        }
      }
    }
  }, [generatedTracks, isGenerating]);

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    setMobileTab('details');
  };

  const handlePlay = (track: Track) => {
    setSelectedTrack(track);
    onPlay(track);
  };

  return (
    <div className="h-full relative">
      {/* Generation Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
          <CircularProgress step={generationStep} />
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex bg-surface/50 border-b border-white/5 mb-4 rounded-xl overflow-hidden">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            mobileTab === 'form'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setMobileTab('songs')}
          className={`flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'songs'
              ? 'bg-primary/20 text-primary'
              : 'text-gray-400 hover:text-white'
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
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Details
        </button>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex gap-6 h-[calc(100vh-200px)] md:h-[calc(100vh-160px)]">
        {/* Left Panel - Form */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 ${
            mobileTab !== 'form' ? 'hidden md:block' : ''
          }`}
        >
          <CreateForm onSubmit={onSubmit} isGenerating={isGenerating} hideLoader />
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
                <h3 className="font-bold text-white">Your Creations</h3>
                <p className="text-xs text-gray-500">
                  {generatedTracks.length} song{generatedTracks.length !== 1 ? 's' : ''} generated
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {generatedTracks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Sparkles size={32} className="text-gray-600" />
                </div>
                <h4 className="text-lg font-bold text-white/60 mb-2">No songs yet</h4>
                <p className="text-sm text-gray-500 max-w-xs">
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

        {/* Right Panel - Song Details & Lyrics */}
        <div
          className={`w-full md:w-[340px] lg:w-[380px] flex-shrink-0 ${
            mobileTab !== 'details' ? 'hidden md:block' : ''
          }`}
        >
          {selectedTrack ? (
            <LyricsViewer
              track={selectedTrack}
              isCurrent={currentTrack?.id === selectedTrack.id}
              isPlaying={isPlaying && currentTrack?.id === selectedTrack.id}
              onPlay={() => handlePlay(selectedTrack)}
            />
          ) : (
            <div className="h-full bg-surface/30 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Music size={28} className="text-gray-600" />
              </div>
              <h4 className="text-lg font-bold text-white/60 mb-2">Select a track</h4>
              <p className="text-sm text-gray-500">
                Choose a song from your creations to view lyrics and details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

