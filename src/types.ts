export type Genre = 
  | 'Ambient' 
  | 'EDM' 
  | 'Rock' 
  | 'Pop'
  | 'Hip-Hop'
  | 'J-Trap'
  | 'Lo-fi'
  | 'Folk'
  | 'R&B'
  | 'Jazz'
  | 'Classical'
  | 'Country'
  | 'Metal'
  | 'Indie'
  | 'Soul'
  | 'Funk'
  | 'Reggae'
  | 'Blues'
  | 'Punk'
  | 'Electronic'
  | 'Other';

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string; // The audio source
  audioUrl?: string; // Alternative field for stored songs
  genre: Genre;
  duration: number; // in seconds
  coverUrl?: string;
  status?: 'ready' | 'playing' | 'paused';
  // Generated metadata additions
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
  createdAt?: number; // Timestamp for when song was generated
  // Additional stats for Suno-style display
  plays?: number;
  likes?: number;
  comments?: number;
  isVerified?: boolean;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  followers: number;
  isVerified?: boolean;
  isSuggested?: boolean;
}

// Deprecated but kept for compatibility if needed (or we migrate)
export interface Song extends Track {
  createdAt?: number;
  isInstrumental?: boolean;
}

export interface GeneratedMetadata {
  title: string;
  lyrics: string;
  styleTags: string[];
  description: string;
}

export type VocalStyle = 'male' | 'female' | 'duet' | 'choir' | 'auto';

export interface CreateSongParams {
  prompt: string;
  isCustom: boolean;
  customLyrics: string;
  customStyle: string;
  customTitle: string;
  isInstrumental: boolean;
  // New parameters for full ElevenLabs control
  durationSeconds: number; // 10-300 seconds
  vocalStyle: VocalStyle;
  bpm?: number; // Optional tempo
  keySignature?: string; // e.g., "C major", "A minor"
  // Raw components for backend prompt construction
  lyrics?: string;
  style?: string;
  title?: string;
  // Advanced slider controls (0-100)
  creativity: number; // 0 = conventional, 100 = experimental
  energy: number; // 0 = chill/mellow, 100 = energetic/intense
  excludeStyles?: string; // Negative prompting - styles to avoid
  // Language for lyrics
  language?: string;
}

// Playlist management
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  coverUrl?: string;
  isPublic?: boolean;
  createdAt: number;
  updatedAt?: number;
}

// Workspace - organizational folder for songs
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

// History entry for recently played tracks
export interface HistoryEntry {
  trackId: string;
  playedAt: number;
}

// Library data structure for persistence
export interface LibraryData {
  playlists: Playlist[];
  workspaces: Workspace[];
  history: HistoryEntry[];
  likedTrackIds: string[];
}

// Queue item for playback queue
export interface QueueItem {
  track: Track;
  addedAt: number;
}

// Context menu action handlers
export interface SongContextActions {
  onAddToQueue?: (track: Track) => void;
  onAddToPlaylist?: (track: Track, playlistId: string) => void;
  onCreatePlaylist?: (name: string, track?: Track) => void;
  onMoveToWorkspace?: (track: Track, workspaceId: string) => void;
  onCreateWorkspace?: (name: string, track?: Track) => void;
  onLikeToggle?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
  onDelete?: (trackId: string) => void;
}
