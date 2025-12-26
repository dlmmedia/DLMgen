import { Track } from '../types';

// Get API base URL - in production it's the same origin, in dev we might need to specify
const getApiBase = () => {
  // In production (Vercel), API routes are at /api
  // In development, you'd run `vercel dev` or mock the endpoints
  return '/api';
};

export interface StoredSong extends Track {
  createdAt: number;
}

export interface SaveSongParams {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  genre: string;
  duration: number;
  coverUrl?: string;
  coverBase64?: string;
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
}

/**
 * Save a generated song to Vercel Blob storage
 */
export async function saveSong(params: SaveSongParams): Promise<StoredSong> {
  const response = await fetch(`${getApiBase()}/songs/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const contentType = response.headers.get('content-type');
  if (!response.ok || (contentType && contentType.includes('text/html'))) {
    console.warn('API unavailable, saving to localStorage');
    const newSong: StoredSong = {
      ...params,
      url: params.audioUrl, // Map audioUrl to url required by Track/StoredSong
      createdAt: Date.now()
    };
    const existing = JSON.parse(localStorage.getItem('dlm_gen_songs') || '[]');
    existing.unshift(newSong);
    localStorage.setItem('dlm_gen_songs', JSON.stringify(existing));
    return newSong;
  }


  const data = await response.json();
  return data.song as StoredSong;
}

/**
 * Load all generated songs from Vercel Blob storage
 */
export async function loadSongs(): Promise<StoredSong[]> {
  try {
    const response = await fetch(`${getApiBase()}/songs/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle HTML response (Vite 404 fallback) or non-ok status
    const contentType = response.headers.get('content-type');
    if (!response.ok || (contentType && contentType.includes('text/html'))) {
      console.warn('API unavailable, falling back to localStorage');
      const localSongs = localStorage.getItem('dlm_gen_songs');
      return localSongs ? JSON.parse(localSongs) : [];
    }

    // Check if response is actually JSON before parsing
    const text = await response.text();
    if (!text || !text.trim().startsWith('{')) {
      console.warn('API returned non-JSON response, falling back to localStorage');
      const localSongs = localStorage.getItem('dlm_gen_songs');
      return localSongs ? JSON.parse(localSongs) : [];
    }

    try {
      const data = JSON.parse(text);
      return data.songs as StoredSong[];
    } catch (parseError) {
      console.warn('Failed to parse API response as JSON, falling back to localStorage', parseError);
      const localSongs = localStorage.getItem('dlm_gen_songs');
      return localSongs ? JSON.parse(localSongs) : [];
    }
  } catch (error) {
    console.error('Error loading songs:', error);
    // Fallback to localStorage on any error
    try {
      const localSongs = localStorage.getItem('dlm_gen_songs');
      return localSongs ? JSON.parse(localSongs) : [];
    } catch (localError) {
      console.error('Failed to load from localStorage:', localError);
      return [];
    }
  }
}

/**
 * Delete a song from Vercel Blob storage
 */
export async function deleteSong(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/songs/delete?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting song:', error);
    return false;
  }
}

/**
 * Convert a Track to SaveSongParams format
 */
export function trackToSaveParams(
  track: Track,
  coverBase64?: string
): SaveSongParams {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    audioUrl: track.url,
    genre: track.genre,
    duration: track.duration,
    coverUrl: coverBase64 ? undefined : track.coverUrl,
    coverBase64: coverBase64,
    lyrics: track.lyrics,
    styleTags: track.styleTags,
    description: track.description,
    isInstrumental: track.isInstrumental,
  };
}

/**
 * Convert a StoredSong back to Track format
 */
export function storedSongToTrack(song: StoredSong): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    url: song.audioUrl || song.url,
    genre: song.genre as Track['genre'],
    duration: song.duration,
    coverUrl: song.coverUrl,
    lyrics: song.lyrics,
    styleTags: song.styleTags,
    description: song.description,
    isInstrumental: song.isInstrumental,
    createdAt: song.createdAt,
  };
}
