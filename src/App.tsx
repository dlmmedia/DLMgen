import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Player } from './components/Player';
import { HeroVisualizer } from './components/HeroVisualizer';
import { TrackList } from './components/TrackList';
import { TRACKS } from './data/tracks';
import { CreateStudio } from './components/CreateStudio';
import { generateSongMetadata, generateAlbumArt } from './services/gemini';
import { selectTrackForMetadata } from './utils/mockGenerator';
import { 
  saveSong, 
  loadSongs, 
  storedSongToTrack, 
  trackToSaveParams, 
  deleteSong,
  loadLibraryData,
  saveLibraryData,
  addToHistory as addToHistoryStorage,
  clearHistory as clearHistoryStorage,
} from './services/songStorage';
import { generateElevenLabsTrack } from './services/elevenlabs';
import { downloadTrack, shareTrack } from './services/downloadService';
import { CreateSongParams, Track, Playlist, QueueItem, Workspace, HistoryEntry } from './types';
import { Menu } from 'lucide-react';
import { SongCard } from './components/SongCard';
import { CreatorCard } from './components/CreatorCard';
import { CREATORS } from './data/tracks';
import { SongDetailsModal } from './components/ui/SongDetailsModal';
import { LibraryView } from './components/library';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const ensureAudioGraph = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        const context: AudioContext = new AudioContextClass();
        const mainAnalyser = context.createAnalyser();
        mainAnalyser.fftSize = 1024;
        mainAnalyser.smoothingTimeConstant = 0.85;

        const source = context.createMediaElementSource(audioRef.current);
        source.connect(mainAnalyser);
        mainAnalyser.connect(context.destination);

        audioContextRef.current = context;
        sourceRef.current = source;
        setAnalyser(mainAnalyser);
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (err) {
      console.error("Failed to initialize/resume audio context:", err);
    }
  }, []);

  const playUrlNow = useCallback((url: string) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // Important: don't `await` here; keep `play()` on the user-gesture call stack
    // to avoid autoplay restrictions (esp. Safari/iOS).
    void ensureAudioGraph();

    try {
      // Force the media element to have the right source *within the user gesture*
      // so `play()` isn't blocked and the analyser receives data immediately.
      if (audioEl.getAttribute('src') !== url) {
        audioEl.setAttribute('src', url);
        audioEl.load();
      }
      void audioEl.play();
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }, [ensureAudioGraph]);

  const pauseNow = useCallback(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    try {
      audioEl.pause();
    } catch (e) {
      console.warn('Audio pause failed:', e);
    }
  }, []);

  // If the graph already exists, keep it resumed while playing (covers tab focus / OS suspend).
  useEffect(() => {
    if (!isPlaying) return;
    audioContextRef.current?.resume().catch(() => {
      // Ignore: some browsers require a user gesture; ensureAudioGraph handles that on interaction.
    });
  }, [isPlaying]);

  // Load songs from Vercel Blob storage
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);

  // Playlist, Workspace, History, and Queue state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  
  // Song Details Modal state
  const [detailsModalTrack, setDetailsModalTrack] = useState<Track | null>(null);

  // Load library data on mount
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const data = await loadLibraryData();
        setPlaylists(data.playlists);
        setWorkspaces(data.workspaces);
        setHistory(data.history);
        setLikedTrackIds(data.likedTrackIds);
        setLibraryLoaded(true);
      } catch (e) {
        console.error('Failed to load library data:', e);
        setLibraryLoaded(true);
      }
    };
    loadLibrary();
  }, []);

  // Persist library data when it changes
  useEffect(() => {
    if (!libraryLoaded) return;
    
    const saveData = async () => {
      try {
        await saveLibraryData({
          playlists,
          workspaces,
          history,
          likedTrackIds,
        });
      } catch (e) {
        console.error('Failed to save library data:', e);
      }
    };
    saveData();
  }, [playlists, workspaces, history, likedTrackIds, libraryLoaded]);

  // Load songs from Blob storage on mount
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoadingSongs(true);
        const songs = await loadSongs();
        const tracks = songs.map(storedSongToTrack);
        setGeneratedTracks(tracks);
      } catch (e) {
        console.error("Failed to load tracks from storage", e);
        // Fallback to localStorage if Blob storage fails
        try {
          const saved = localStorage.getItem('dlm_generated_tracks');
          if (saved) setGeneratedTracks(JSON.parse(saved));
        } catch (localErr) {
          console.error("Failed to load from localStorage", localErr);
        }
      } finally {
        setIsLoadingSongs(false);
      }
    };
    fetchSongs();
  }, []);

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

  const handlePlay = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseNow();
        setIsPlaying(false);
      } else {
        void playUrlNow(track.url);
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      void playUrlNow(track.url);
      setIsPlaying(true);
      
      // Add to history
      const newEntry: HistoryEntry = {
        trackId: track.id,
        playedAt: Date.now(),
      };
      setHistory(prev => {
        const updated = [newEntry, ...prev].slice(0, 100);
        return updated;
      });
    }
  }, [currentTrack, isPlaying, pauseNow, playUrlNow]);

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = TRACKS.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % TRACKS.length;
    const next = TRACKS[nextIndex];
    setCurrentTrack(next);
    void playUrlNow(next.url);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (!currentTrack) return;
    const currentIndex = TRACKS.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
    const prev = TRACKS[prevIndex];
    setCurrentTrack(prev);
    void playUrlNow(prev.url);
    setIsPlaying(true);
  };

  const handleCreateSubmit = async (params: CreateSongParams) => {
    setIsGenerating(true);
    setGenerationStep(0);
    try {
      // Ensure the analyser exists during the user gesture that starts generation,
      // so auto-play can reliably drive visualizers when generation completes.
      await ensureAudioGraph();

      // Step 1: Analyzing prompt
      setGenerationStep(0);
      const metadata = await generateSongMetadata(
        params.prompt,
        params.isInstrumental,
        params.customLyrics,
        params.customStyle,
        params.customTitle
      );

      // Step 2: Composing melody
      setGenerationStep(1);
      let audioUrl = "";

      if (params.isCustom) {
        // Step 3: Generating vocals (or instrumental)
        setGenerationStep(2);
        const blob = await generateElevenLabsTrack(params);
        audioUrl = URL.createObjectURL(blob);
      } else {
        // Mock selection for Simple Mode
        await new Promise(resolve => setTimeout(resolve, 3000));
        setGenerationStep(2);
        const selectedTrack = selectTrackForMetadata(
          metadata,
          TRACKS,
          generatedTracks.map(t => t.id)
        );
        audioUrl = selectedTrack.url;
      }

      // Step 4: Mastering audio / generating album art
      setGenerationStep(3);
      const coverUrl = await generateAlbumArt(metadata.description);
      const isBase64Cover = coverUrl.startsWith('data:');

      // Step 5: Finalizing
      setGenerationStep(4);
      const newTrackId = `gen-${Date.now()}`;
      const newTrack: Track = {
        id: newTrackId,
        title: metadata.title,
        artist: 'AI Composer',
        url: audioUrl,
        audioUrl: audioUrl,
        genre: metadata.styleTags?.[0] as any || 'Other',
        duration: params.isCustom ? params.durationSeconds : 180,
        coverUrl: coverUrl,
        lyrics: metadata.lyrics,
        styleTags: metadata.styleTags,
        description: metadata.description,
        isInstrumental: params.isInstrumental,
        createdAt: Date.now()
      };

      // Save to Vercel Blob storage
      try {
        const saveParams = trackToSaveParams(newTrack, isBase64Cover ? coverUrl : undefined);
        const savedSong = await saveSong(saveParams);
        if (savedSong.coverUrl) {
          newTrack.coverUrl = savedSong.coverUrl;
        }
        console.log('Song saved to Vercel Blob:', savedSong);
      } catch (saveError) {
        console.error('Failed to save to Blob storage, keeping in local state:', saveError);
      }

      setGeneratedTracks(prev => [newTrack, ...prev]);
      setCurrentTrack(newTrack);
      setIsPlaying(true);
      // Stay on create tab - don't navigate away!

    } catch (error) {
      console.error("Generation failed", error);
      
      let errorMessage = "Failed to create song. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("Cannot connect to the API server") || 
            error.message.includes("connection refused") ||
            error.message.includes("ERR_CONNECTION_REFUSED") ||
            error.message.includes("Failed to fetch")) {
          errorMessage = "Cannot connect to the API server. Make sure:\n\n1. The dev server is running (npm run dev or npx vercel dev)\n2. You have ELEVENLABS_API_KEY in your .env.local file\n3. The server is accessible at http://localhost:3000";
        } 
        else if (error.message.includes("Invalid API key") || error.message.includes("401")) {
          errorMessage = error.message || "Invalid API key error. Please check your ELEVENLABS_API_KEY environment variable.";
        } 
        else if (error.message.includes("Server configuration error") || error.message.includes("MISSING_API_KEY")) {
          errorMessage = "Server configuration error: ELEVENLABS_API_KEY is not set.";
        } 
        else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      // Remove from state immediately for responsiveness
      setGeneratedTracks(prev => prev.filter(t => t.id !== trackId));
      
      // If it's the current track, stop playing
      if (currentTrack?.id === trackId) {
        setCurrentTrack(null);
        setIsPlaying(false);
      }

      // Delete from storage
      await deleteSong(trackId);
      
      // Also remove from localStorage backup
      try {
        const localSongs = localStorage.getItem('dlm_gen_songs');
        if (localSongs) {
          const songs = JSON.parse(localSongs);
          const filtered = songs.filter((s: any) => s.id !== trackId);
          localStorage.setItem('dlm_gen_songs', JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Failed to remove from localStorage:', e);
      }
    } catch (error) {
      console.error('Failed to delete track:', error);
    }
  };

  // Queue management
  const handleAddToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, { track, addedAt: Date.now() }]);
    // Show a toast notification (simple alert for now)
    console.log(`Added "${track.title}" to queue`);
  }, []);

  // Play next from queue when current track ends (enhanced handleNext)
  const handleNextWithQueue = useCallback(() => {
    if (queue.length > 0) {
      const [nextItem, ...rest] = queue;
      setQueue(rest);
      setCurrentTrack(nextItem.track);
      void playUrlNow(nextItem.track.url);
      setIsPlaying(true);
      return;
    }
    // Fall back to normal next behavior
    handleNext();
  }, [queue, playUrlNow, handleNext]);

  // Playlist management
  const handleCreatePlaylist = useCallback((name: string, initialTrack?: Track) => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      trackIds: initialTrack ? [initialTrack.id] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    console.log(`Created playlist "${name}"`);
  }, []);

  const handleAddToPlaylist = useCallback((track: Track, playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.trackIds.includes(track.id)) {
        return { ...p, trackIds: [...p.trackIds, track.id], updatedAt: Date.now() };
      }
      return p;
    }));
    const playlist = playlists.find(p => p.id === playlistId);
    console.log(`Added "${track.title}" to "${playlist?.name || 'playlist'}"`);
  }, [playlists]);

  const handleDeletePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    console.log(`Deleted playlist`);
  }, []);

  const handleUpdatePlaylist = useCallback((playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, ...updates, updatedAt: Date.now() };
      }
      return p;
    }));
  }, []);

  // Workspace management
  const handleCreateWorkspace = useCallback((name: string, initialTrack?: Track) => {
    const newWorkspace: Workspace = {
      id: `workspace-${Date.now()}`,
      name,
      trackIds: initialTrack ? [initialTrack.id] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    console.log(`Created workspace "${name}"`);
  }, []);

  const handleMoveToWorkspace = useCallback((track: Track, workspaceId: string) => {
    setWorkspaces(prev => prev.map(w => {
      // Remove from all workspaces first
      const filtered = w.trackIds.filter(id => id !== track.id);
      // Add to target workspace
      if (w.id === workspaceId) {
        return { ...w, trackIds: [...filtered, track.id], updatedAt: Date.now() };
      }
      return { ...w, trackIds: filtered, updatedAt: Date.now() };
    }));
    const workspace = workspaces.find(w => w.id === workspaceId);
    console.log(`Moved "${track.title}" to "${workspace?.name || 'workspace'}"`);
  }, [workspaces]);

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    // Don't delete default workspace
    if (workspaceId === 'workspace-default') return;
    
    // Move tracks to default workspace
    setWorkspaces(prev => {
      const toDelete = prev.find(w => w.id === workspaceId);
      if (!toDelete) return prev;
      
      return prev
        .filter(w => w.id !== workspaceId)
        .map(w => {
          if (w.id === 'workspace-default') {
            return {
              ...w,
              trackIds: [...w.trackIds, ...toDelete.trackIds],
              updatedAt: Date.now(),
            };
          }
          return w;
        });
    });
    console.log(`Deleted workspace`);
  }, []);

  const handleUpdateWorkspace = useCallback((workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => {
      if (w.id === workspaceId) {
        return { ...w, ...updates, updatedAt: Date.now() };
      }
      return w;
    }));
  }, []);

  // Liked songs management
  const handleToggleLike = useCallback((track: Track) => {
    setLikedTrackIds(prev => {
      if (prev.includes(track.id)) {
        console.log(`Unliked "${track.title}"`);
        return prev.filter(id => id !== track.id);
      } else {
        console.log(`Liked "${track.title}"`);
        return [...prev, track.id];
      }
    });
  }, []);

  // History management
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    console.log('History cleared');
  }, []);

  // Download handler
  const handleDownload = useCallback(async (track: Track, format: 'mp3' | 'wav') => {
    try {
      await downloadTrack(track, format);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download track. Please try again.');
    }
  }, []);

  // Share handler
  const handleShare = useCallback(async (track: Track) => {
    await shareTrack(track);
  }, []);

  // Song details modal
  const handleShowDetails = useCallback((track: Track) => {
    setDetailsModalTrack(track);
  }, []);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        isPlaying={isPlaying}
        analyser={analyser}
        playlists={playlists}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
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
            <div className="p-6 md:p-8 space-y-10">
              <HeroVisualizer
                isPlaying={isPlaying}
                analyser={analyser}
                trackTitle={currentTrack?.title}
              />

              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Trending Now</h2>
                    <p className="text-sm text-white/40">The most popular tracks today</p>
                  </div>
                  <button onClick={() => setActiveTab('explore')} className="text-sm font-bold text-primary hover:text-accent transition-colors uppercase tracking-widest">
                    View All
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {TRACKS.slice(0, 5).map(track => (
                    <SongCard
                      key={track.id}
                      track={track}
                      onPlay={handlePlay}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                    />
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">Fresh Finds</h2>
                      <p className="text-sm text-white/40">New tracks you might like</p>
                    </div>
                  </div>
                  <TrackList
                    tracks={TRACKS.slice(5, 12)}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                  />
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Top Creators</h2>
                      <p className="text-sm text-white/40">AI Artisans to follow</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                    {CREATORS.map(creator => (
                      <CreatorCard key={creator.id} creator={creator} />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'create' ? (
            <div className="p-6 md:p-8 pt-4 h-full">
              <CreateStudio
                generatedTracks={generatedTracks}
                onSubmit={handleCreateSubmit}
                isGenerating={isGenerating}
                generationStep={generationStep}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onDelete={handleDeleteTrack}
                onAddToQueue={handleAddToQueue}
                onAddToPlaylist={handleAddToPlaylist}
                onCreatePlaylist={handleCreatePlaylist}
                onShowDetails={handleShowDetails}
                onDownload={handleDownload}
                onShare={handleShare}
                playlists={playlists}
              />
            </div>
          ) : activeTab === 'library' ? (
            <LibraryView
              tracks={[...generatedTracks, ...TRACKS]}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              playlists={playlists}
              workspaces={workspaces}
              history={history}
              likedTrackIds={likedTrackIds}
              onPlay={handlePlay}
              onDelete={handleDeleteTrack}
              onAddToPlaylist={handleAddToPlaylist}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onUpdatePlaylist={handleUpdatePlaylist}
              onMoveToWorkspace={handleMoveToWorkspace}
              onCreateWorkspace={handleCreateWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              onUpdateWorkspace={handleUpdateWorkspace}
              onToggleLike={handleToggleLike}
              onAddToQueue={handleAddToQueue}
              onShowDetails={handleShowDetails}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ) : activeTab !== 'home' && (
            <div className="p-6 md:p-8 pt-0">
              <h2 className="text-2xl font-bold mb-6 capitalize">{activeTab.replace('-', ' ')} Tracks</h2>
              <TrackList
                tracks={filteredTracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlay={handlePlay}
              />
            </div>
          )}
        </div>
      </main>

      <Player
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (!currentTrack) return;
          if (isPlaying) {
            pauseNow();
            setIsPlaying(false);
          } else {
            void playUrlNow(currentTrack.url);
            setIsPlaying(true);
          }
        }}
        onNext={handleNextWithQueue}
        onPrev={handlePrev}
        onEnded={handleNextWithQueue}
        audioRef={audioRef}
      />

      {/* Song Details Modal */}
      {detailsModalTrack && (
        <SongDetailsModal
          track={detailsModalTrack}
          isOpen={!!detailsModalTrack}
          onClose={() => setDetailsModalTrack(null)}
          isCurrent={currentTrack?.id === detailsModalTrack.id}
          isPlaying={isPlaying && currentTrack?.id === detailsModalTrack.id}
          onPlay={() => handlePlay(detailsModalTrack)}
          onDownload={() => handleDownload(detailsModalTrack, 'mp3')}
          onShare={() => handleShare(detailsModalTrack)}
        />
      )}
    </div>
  );
}
