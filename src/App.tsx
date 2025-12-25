import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Player } from './components/Player';
import { HeroVisualizer } from './components/HeroVisualizer';
import { TrackList } from './components/TrackList';
import { TRACKS } from './data/tracks';
import { CreateForm } from './components/CreateForm';
import { generateSongMetadata, generateAlbumArt } from './services/gemini';
import { selectTrackForMetadata } from './utils/mockGenerator';
import { CreateSongParams, Track } from './types';
import { Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load initial state from localStorage
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem('dlm_generated_tracks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load tracks", e);
      return [];
    }
  });

  // Save to localStorage whenever tracks change
  useEffect(() => {
    localStorage.setItem('dlm_generated_tracks', JSON.stringify(generatedTracks));
  }, [generatedTracks]);

  // Initialize with a random track but don't play
  useEffect(() => {
    if (TRACKS.length > 0 && !currentTrack) {
      setCurrentTrack(TRACKS[0]);
    }
  }, []);

  const filteredTracks = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return TRACKS.slice(0, 10); // Show top 10 as "Trending"
      case 'explore':
        return TRACKS.sort(() => Math.random() - 0.5); // Random shuffle
      case 'library':
      case 'liked':
      case 'recent':
        return TRACKS.slice(0, 5); // Mock library
      case 'ambient':
        return TRACKS.filter(t => t.genre === 'Ambient');
      case 'edm':
        return TRACKS.filter(t => t.genre === 'EDM');
      case 'rock':
        return TRACKS.filter(t => t.genre === 'Rock');
      default:
        return TRACKS;
    }
  }, [activeTab]);

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = TRACKS.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % TRACKS.length;
    setCurrentTrack(TRACKS[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (!currentTrack) return;
    const currentIndex = TRACKS.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
    setCurrentTrack(TRACKS[prevIndex]);
    setIsPlaying(true);
  };

  const handleCreateSubmit = async (params: CreateSongParams) => {
    setIsGenerating(true);
    try {
      // 1. Generate Metadata
      const metadata = await generateSongMetadata(
        params.prompt,
        params.isInstrumental,
        params.customLyrics,
        params.customStyle,
        params.customTitle
      );

      // Artificial delay to simulate "Generation" and let the animation play
      // The user requested ~5 seconds.
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 2. Select a matching track
      const selectedTrack = selectTrackForMetadata(
        metadata,
        TRACKS,
        generatedTracks.map(t => t.id) // Pass IDs to exclude
      );

      // 3. Generate Album Art (Async or just placeholder)
      const coverUrl = await generateAlbumArt(metadata.description);

      // 4. Create new Track
      const newTrack: Track = {
        ...selectedTrack,
        id: `gen-${Date.now()}`,
        title: metadata.title,
        artist: 'AI Composer',
        coverUrl: coverUrl,
        lyrics: metadata.lyrics,
        styleTags: metadata.styleTags,
        description: metadata.description,
        isInstrumental: params.isInstrumental
      };

      setGeneratedTracks(prev => [newTrack, ...prev]);
      setCurrentTrack(newTrack);
      setIsPlaying(true);
      setActiveTab('library');

    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to create song. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
      />

      <main className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-white/5 bg-sidebar sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="text-gray-400" />
          </button>
          <span className="ml-4 font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-neon-blue">DLM Gen</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
          {activeTab === 'home' && (
            <div className="p-6 md:p-8">
              <HeroVisualizer isPlaying={isPlaying} />
              <h2 className="text-2xl font-bold mt-8 mb-4">Trending Now</h2>
            </div>
          )}

          <div className="p-6 md:p-8 pt-0">
            {activeTab === 'create' ? (
              <div className="max-w-2xl mx-auto h-[calc(100vh-120px)]">
                <CreateForm onSubmit={handleCreateSubmit} isGenerating={isGenerating} />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6 capitalize">{activeTab.replace('-', ' ')} Tracks</h2>
                <TrackList
                  tracks={activeTab === 'library' ? [...generatedTracks, ...filteredTracks] : filteredTracks}
                  currentTrackId={currentTrack?.id}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <Player
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onNext={handleNext}
        onPrev={handlePrev}
        onEnded={handleNext}
      />
    </div>
  );
}