
export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string; // The audio source
  audioUrl?: string; // Alternative field for stored songs
  genre: 'Ambient' | 'EDM' | 'Rock' | 'Other';
  duration: number; // in seconds
  coverUrl?: string;
  status?: 'ready' | 'playing' | 'paused';
  // Generated metadata additions
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
  createdAt?: number; // Timestamp for when song was generated
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

export interface CreateSongParams {
  prompt: string;
  isCustom: boolean;
  customLyrics: string;
  customStyle: string;
  customTitle: string;
  isInstrumental: boolean;
}
