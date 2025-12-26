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
}
