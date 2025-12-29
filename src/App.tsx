import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Player } from './components/Player';
import { HeroVisualizer } from './components/HeroVisualizer';
import { TrackList } from './components/TrackList';
import { TRACKS } from './data/tracks';
import { CreateForm } from './components/CreateForm';
import { generateSongMetadata, generateAlbumArt } from './services/gemini';
import { selectTrackForMetadata } from './utils/mockGenerator';
import { saveSong, loadSongs, storedSongToTrack, trackToSaveParams } from './services/songStorage';
import { generateElevenLabsTrack } from './services/elevenlabs';
import { CreateSongParams, Track } from './types';
import { Menu } from 'lucide-react';
import { SongCard } from './components/SongCard';
import { CreatorCard } from './components/CreatorCard';
import { CREATORS } from './data/tracks';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const handlePlay = (track: Track) => {
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
    }
  };

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
    try {
      // Ensure the analyser exists during the user gesture that starts generation,
      // so auto-play can reliably drive visualizers when generation completes.
      await ensureAudioGraph();

      // 1. Generate Metadata
      const metadata = await generateSongMetadata(
        params.prompt,
        params.isInstrumental,
        params.customLyrics,
        params.customStyle,
        params.customTitle
      );

      let audioUrl = "";
      let selectedTrackString = "";

      if (params.isCustom) {
        // Real Generation via ElevenLabs
        const blob = await generateElevenLabsTrack(params);
        audioUrl = URL.createObjectURL(blob);
        selectedTrackString = "Custom Generated Track";
      } else {
        // Mock selection for Simple Mode (or could use 11Labs too if desired, but sticking to plan)
        // Actually, let's use 11Labs for everything if we can, but per plan "in the custom mode we use eleveblabs"
        // So preserve mock for simple mode if desired, BUT the user request said "integrate a full ElevenLabs api music generation system... but in the custom mode we use eleveblabs music generation"
        // Let's assume Simple mode stays as is (mock) for now unless user specified otherwise, or use 11Labs for custom. 
        // Wait, user said "integrate a full ElevenLabs api music generation system we will keep the url system intact. but in the custom mode we use eleveblabs music generation."
        // This implies Simple might still stick to URLs? Or maybe Simple should also use it?
        // Let's adhere strictly: "in the custom mode we use eleveblabs".

        await new Promise(resolve => setTimeout(resolve, 5000)); // Mock delay
        const selectedTrack = selectTrackForMetadata(
          metadata,
          TRACKS,
          generatedTracks.map(t => t.id)
        );
        audioUrl = selectedTrack.url;
        selectedTrackString = selectedTrack.title;
      }

      // 3. Generate Album Art (Async or just placeholder)
      const coverUrl = await generateAlbumArt(metadata.description);

      // Check if coverUrl is base64 (generated) or URL
      const isBase64Cover = coverUrl.startsWith('data:');

      // 4. Create new Track
      const newTrackId = `gen-${Date.now()}`;
      const newTrack: Track = {
        id: newTrackId,
        title: metadata.title,
        artist: 'AI Composer',
        url: audioUrl, // Use the generated or selected URL
        audioUrl: audioUrl, // Duplicate for safety
        genre: metadata.styleTags?.[0] as any || 'Other', // Approximate genre
        duration: params.isCustom ? params.durationSeconds : 180, // Use selected duration for ElevenLabs
        coverUrl: coverUrl,
        lyrics: metadata.lyrics,
        styleTags: metadata.styleTags,
        description: metadata.description,
        isInstrumental: params.isInstrumental,
        createdAt: Date.now()
      };

      // 5. Save to Vercel Blob storage
      try {
        const saveParams = trackToSaveParams(newTrack, isBase64Cover ? coverUrl : undefined);
        const savedSong = await saveSong(saveParams);
        // Update track with blob-stored cover URL if it was uploaded
        if (savedSong.coverUrl) {
          newTrack.coverUrl = savedSong.coverUrl;
        }
        console.log('Song saved to Vercel Blob:', savedSong);
      } catch (saveError) {
        console.error('Failed to save to Blob storage, keeping in local state:', saveError);
        // Still continue - song will work locally even if cloud save fails
      }

      setGeneratedTracks(prev => [newTrack, ...prev]);
      setCurrentTrack(newTrack);
      setIsPlaying(true);
      setActiveTab('library');

    } catch (error) {
      console.error("Generation failed", error);
      
      // Provide more helpful error messages
      let errorMessage = "Failed to create song. Please try again.";
      
      if (error instanceof Error) {
        // Check if it's a connection error
        if (error.message.includes("Cannot connect to the API server") || 
            error.message.includes("connection refused") ||
            error.message.includes("ERR_CONNECTION_REFUSED") ||
            error.message.includes("Failed to fetch")) {
          errorMessage = "Cannot connect to the API server. Make sure:\n\n1. The dev server is running (npm run dev or npx vercel dev)\n2. You have ELEVENLABS_API_KEY in your .env.local file\n3. The server is accessible at http://localhost:3000";
        } 
        // Check if it's an API key error
        else if (error.message.includes("Invalid API key") || error.message.includes("401")) {
          errorMessage = error.message || "Invalid API key error. Please check your ELEVENLABS_API_KEY environment variable. See README for setup instructions.";
        } 
        else if (error.message.includes("Server configuration error") || error.message.includes("MISSING_API_KEY")) {
          errorMessage = "Server configuration error: ELEVENLABS_API_KEY is not set. Please add it to your .env.local file or Vercel environment variables.";
        } 
        else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      alert(errorMessage);
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
        isPlaying={isPlaying}
        analyser={analyser}
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
        onNext={handleNext}
        onPrev={handlePrev}
        onEnded={handleNext}
        audioRef={audioRef}
      />
    </div>
  );
}
