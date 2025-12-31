import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Player } from './components/Player';
import { HeroVisualizer } from './components/HeroVisualizer';
import { TrackList } from './components/TrackList';
import { TRACKS } from './data/tracks';
import { CreateStudio } from './components/CreateStudio';
import { generateSongMetadata, generateAlbumArt } from './services/gemini';
import { 
  saveSong, 
  loadSongs, 
  storedSongToTrack, 
  trackToSaveParams, 
  deleteSong,
} from './services/songStorage';
import { getCachedSongs, getCachedLibraryData } from './services/localStorageService';
import {
  loadLibraryData,
  createPlaylist as createPlaylistAPI,
  addTrackToPlaylist as addTrackToPlaylistAPI,
  deletePlaylist as deletePlaylistAPI,
  updatePlaylist as updatePlaylistAPI,
  createWorkspace as createWorkspaceAPI,
  moveTrackToWorkspace as moveTrackToWorkspaceAPI,
  deleteWorkspace as deleteWorkspaceAPI,
  updateWorkspace as updateWorkspaceAPI,
  addToHistory as addToHistoryAPI,
  clearHistory as clearHistoryAPI,
  likeTrack as likeTrackAPI,
  unlikeTrack as unlikeTrackAPI,
} from './services/libraryService';
import { generateElevenLabsTrack } from './services/elevenlabs';
import { downloadTrack, shareTrack } from './services/downloadService';
import { CreateSongParams, Track, Playlist, QueueItem, Workspace, HistoryEntry } from './types';
import { Menu } from 'lucide-react';
import { SongCard } from './components/SongCard';
import { CreatorCard } from './components/CreatorCard';
import { CREATORS } from './data/tracks';
import { SongDetailsModal } from './components/ui/SongDetailsModal';
import { LibraryView } from './components/library';

/**
 * Sanitize lyrics to remove mock content, metadata tags, and prompt fragments
 * Ensures only clean, displayable lyrics are stored
 */
function sanitizeLyrics(lyrics: string): string {
  if (!lyrics) return '';
  
  // If instrumental, keep it simple
  if (lyrics.trim() === '[Instrumental]' || lyrics.toLowerCase().includes('instrumental')) {
    return '[Instrumental]';
  }
  
  let cleaned = lyrics;
  
  // Remove metadata tags like [Title: ...], [Genre: ...], [Style: ...], etc.
  // But keep structure tags like [Verse], [Chorus], [Bridge]
  const metadataTags = [
    /\[Title:.*?\]/gi,
    /\[Genre:.*?\]/gi,
    /\[Style:.*?\]/gi,
    /\[Language:.*?\]/gi,
    /\[Mood:.*?\]/gi,
    /\[Target BPM:.*?\]/gi,
    /\[Structure Template:.*?\]/gi,
    /\[Vocal Style:.*?\]/gi,
    /\[Delivery:.*?\]/gi,
    /\[BPM:.*?\]/gi,
  ];
  
  for (const pattern of metadataTags) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove mock/placeholder patterns
  const mockPatterns = [
    /\(Mock lyrics.*?\)/gi,
    /\(Generated for prompt.*?\)/gi,
    /\(Placeholder.*?\)/gi,
    /Imagine a great song here.*/gi,
    /With a catchy melody.*/gi,
  ];
  
  for (const pattern of mockPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove any lines that look like they contain the raw prompt
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    // Keep empty lines for spacing
    if (!trimmed) return true;
    // Keep section headers
    if (trimmed.match(/^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook)\s*\d?\]$/i)) {
      return true;
    }
    // Remove lines that look like prompts or instructions
    if (trimmed.toLowerCase().startsWith('create a song')) return false;
    if (trimmed.toLowerCase().startsWith('generate')) return false;
    if (trimmed.toLowerCase().startsWith('write a')) return false;
    if (trimmed.toLowerCase().includes('prompt:')) return false;
    return true;
  });
  
  // Clean up excessive blank lines
  let result = filteredLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();
  
  // If nothing left after cleaning, return a default message
  if (!result || result.length < 10) {
    return '';
  }
  
  return result;
}

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
  // Initialize with cached data for instant UI rendering
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>(() => {
    try {
      const cached = getCachedSongs();
      return cached.map(storedSongToTrack);
    } catch {
      return [];
    }
  });
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);

  // Playlist, Workspace, History, and Queue state
  // Initialize with cached data for instant UI rendering
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      return getCachedLibraryData().playlists;
    } catch {
      return [];
    }
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      return getCachedLibraryData().workspaces;
    } catch {
      return [{
        id: 'workspace-default',
        name: 'My Songs',
        description: 'Default workspace for all your songs',
        trackIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
    }
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return getCachedLibraryData().history;
    } catch {
      return [];
    }
  });
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    try {
      return getCachedLibraryData().likedTrackIds;
    } catch {
      return [];
    }
  });
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

  // No need for persist effect - all changes are immediately saved via API calls

  // Load songs from Neon Postgres on mount
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoadingSongs(true);
        const songs = await loadSongs();
        const tracks = songs.map(storedSongToTrack);
        setGeneratedTracks(tracks);
      } catch (e) {
        console.error("Failed to load tracks from storage", e);
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
    // Prefer audioUrl if available (persisted URL from cloud storage)
    const audioSource = track.audioUrl || track.url;
    
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseNow();
        setIsPlaying(false);
      } else {
        void playUrlNow(audioSource);
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      void playUrlNow(audioSource);
      setIsPlaying(true);
      
      // Add to history - update local state and persist to API
      const newEntry: HistoryEntry = {
        trackId: track.id,
        playedAt: Date.now(),
      };
      setHistory(prev => {
        const updated = [newEntry, ...prev].slice(0, 100);
        return updated;
      });
      // Persist to database (fire and forget)
      addToHistoryAPI(track.id).catch(e => console.warn('Failed to add to history:', e));
    }
  }, [currentTrack, isPlaying, pauseNow, playUrlNow]);

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = TRACKS.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % TRACKS.length;
    const next = TRACKS[nextIndex];
    setCurrentTrack(next);
    void playUrlNow(next.audioUrl || next.url);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (!currentTrack) return;
    const currentIndex = TRACKS.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
    const prev = TRACKS[prevIndex];
    setCurrentTrack(prev);
    void playUrlNow(prev.audioUrl || prev.url);
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

      // Step 3: Generating vocals (or instrumental) via ElevenLabs
      setGenerationStep(2);
      
      // Build params for ElevenLabs - use Gemini-generated content for Simple mode
      const elevenLabsParams: CreateSongParams = {
        ...params,
        // For Simple mode, use Gemini-generated lyrics/style/title
        customLyrics: params.customLyrics || metadata.lyrics,
        customStyle: params.customStyle || metadata.styleTags?.join(', '),
        customTitle: params.customTitle || metadata.title,
      };
      
      const blob = await generateElevenLabsTrack(elevenLabsParams);
      audioUrl = URL.createObjectURL(blob);

      // Step 4: Mastering audio / generating album art
      setGenerationStep(3);
      const coverUrl = await generateAlbumArt(metadata.description);
      const isBase64Cover = coverUrl.startsWith('data:');

      // Step 5: Finalizing
      setGenerationStep(4);
      const newTrackId = `gen-${Date.now()}`;
      
      // Sanitize lyrics to remove any mock content or metadata tags
      const cleanedLyrics = sanitizeLyrics(metadata.lyrics);
      
      // Use custom title if provided, otherwise use generated title
      const finalTitle = params.customTitle || metadata.title;
      
      const newTrack: Track = {
        id: newTrackId,
        title: finalTitle,
        artist: 'AI Composer',
        url: audioUrl,
        audioUrl: audioUrl,
        genre: metadata.styleTags?.[0] as any || 'Other',
        duration: params.isCustom ? params.durationSeconds : 180,
        coverUrl: coverUrl,
        lyrics: cleanedLyrics,
        styleTags: metadata.styleTags,
        description: metadata.description,
        isInstrumental: params.isInstrumental,
        createdAt: Date.now()
      };

      // Save to Vercel Blob storage
      try {
        const saveParams = trackToSaveParams(newTrack, isBase64Cover ? coverUrl : undefined);
        const savedSong = await saveSong(saveParams);
        
        // Update track with persisted URLs from cloud storage
        if (savedSong.coverUrl) {
          newTrack.coverUrl = savedSong.coverUrl;
        }
        if (savedSong.audioUrl && !savedSong.audioUrl.startsWith('blob:')) {
          // Update to the permanent URL from cloud storage
          newTrack.url = savedSong.audioUrl;
          newTrack.audioUrl = savedSong.audioUrl;
          console.log('Audio URL updated to permanent storage:', savedSong.audioUrl);
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

      // Delete from Neon + Vercel Blob storage
      await deleteSong(trackId);
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
      void playUrlNow(nextItem.track.audioUrl || nextItem.track.url);
      setIsPlaying(true);
      return;
    }
    // Fall back to normal next behavior
    handleNext();
  }, [queue, playUrlNow, handleNext]);

  // Playlist management - with API persistence
  const handleCreatePlaylist = useCallback(async (name: string, initialTrack?: Track) => {
    try {
      const newPlaylist = await createPlaylistAPI(name, initialTrack?.id);
      setPlaylists(prev => [...prev, newPlaylist]);
      console.log(`Created playlist "${name}"`);
    } catch (e) {
      console.error('Failed to create playlist:', e);
      // Optimistic fallback
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name,
        trackIds: initialTrack ? [initialTrack.id] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPlaylists(prev => [...prev, newPlaylist]);
    }
  }, []);

  const handleAddToPlaylist = useCallback(async (track: Track, playlistId: string) => {
    // Optimistic update
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.trackIds.includes(track.id)) {
        return { ...p, trackIds: [...p.trackIds, track.id], updatedAt: Date.now() };
      }
      return p;
    }));
    const playlist = playlists.find(p => p.id === playlistId);
    console.log(`Added "${track.title}" to "${playlist?.name || 'playlist'}"`);
    
    // Persist to API
    try {
      await addTrackToPlaylistAPI(track.id, playlistId);
    } catch (e) {
      console.error('Failed to add track to playlist:', e);
    }
  }, [playlists]);

  const handleDeletePlaylist = useCallback(async (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    console.log(`Deleted playlist`);
    
    try {
      await deletePlaylistAPI(playlistId);
    } catch (e) {
      console.error('Failed to delete playlist:', e);
    }
  }, []);

  const handleUpdatePlaylist = useCallback(async (playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, ...updates, updatedAt: Date.now() };
      }
      return p;
    }));
    
    try {
      await updatePlaylistAPI(playlistId, updates);
    } catch (e) {
      console.error('Failed to update playlist:', e);
    }
  }, []);

  // Workspace management - with API persistence
  const handleCreateWorkspace = useCallback(async (name: string, initialTrack?: Track) => {
    try {
      const newWorkspace = await createWorkspaceAPI(name, initialTrack?.id);
      setWorkspaces(prev => [...prev, newWorkspace]);
      console.log(`Created workspace "${name}"`);
    } catch (e) {
      console.error('Failed to create workspace:', e);
      // Optimistic fallback
      const newWorkspace: Workspace = {
        id: `workspace-${Date.now()}`,
        name,
        trackIds: initialTrack ? [initialTrack.id] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setWorkspaces(prev => [...prev, newWorkspace]);
    }
  }, []);

  const handleMoveToWorkspace = useCallback(async (track: Track, workspaceId: string) => {
    // Optimistic update
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
    
    // Persist to API
    try {
      await moveTrackToWorkspaceAPI(track.id, workspaceId);
    } catch (e) {
      console.error('Failed to move track to workspace:', e);
    }
  }, [workspaces]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    // Don't delete default workspace
    if (workspaceId === 'workspace-default') return;
    
    // Optimistic update - move tracks to default workspace
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
    
    try {
      await deleteWorkspaceAPI(workspaceId);
    } catch (e) {
      console.error('Failed to delete workspace:', e);
    }
  }, []);

  const handleUpdateWorkspace = useCallback(async (workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => {
      if (w.id === workspaceId) {
        return { ...w, ...updates, updatedAt: Date.now() };
      }
      return w;
    }));
    
    try {
      await updateWorkspaceAPI(workspaceId, updates);
    } catch (e) {
      console.error('Failed to update workspace:', e);
    }
  }, []);

  // Liked songs management - with API persistence
  const handleToggleLike = useCallback(async (track: Track) => {
    const isCurrentlyLiked = likedTrackIds.includes(track.id);
    
    // Optimistic update
    setLikedTrackIds(prev => {
      if (isCurrentlyLiked) {
        console.log(`Unliked "${track.title}"`);
        return prev.filter(id => id !== track.id);
      } else {
        console.log(`Liked "${track.title}"`);
        return [...prev, track.id];
      }
    });
    
    // Persist to API
    try {
      if (isCurrentlyLiked) {
        await unlikeTrackAPI(track.id);
      } else {
        await likeTrackAPI(track.id);
      }
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  }, [likedTrackIds]);

  // History management - with API persistence
  const handleClearHistory = useCallback(async () => {
    setHistory([]);
    console.log('History cleared');
    
    try {
      await clearHistoryAPI();
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
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
    <div className="flex h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white overflow-hidden font-sans transition-colors">
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
        <div className="md:hidden flex items-center p-4 border-b border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-sidebar sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="text-gray-500 dark:text-gray-400" />
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Trending Now</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">The most popular tracks today</p>
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
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Fresh Finds</h2>
                      <p className="text-sm text-gray-500 dark:text-white/40">New tracks you might like</p>
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
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Top Creators</h2>
                      <p className="text-sm text-gray-500 dark:text-white/40">AI Artisans to follow</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-200 dark:divide-white/5">
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
              <h2 className="text-2xl font-bold mb-6 capitalize text-gray-900 dark:text-white">{activeTab.replace('-', ' ')} Tracks</h2>
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
          const audioSource = currentTrack.audioUrl || currentTrack.url;
          if (isPlaying) {
            pauseNow();
            setIsPlaying(false);
          } else {
            void playUrlNow(audioSource);
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
