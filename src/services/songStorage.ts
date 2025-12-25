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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to save song');
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

    if (!response.ok) {
      console.error('Failed to load songs from storage');
      return [];
    }

    const data = await response.json();
    return data.songs as StoredSong[];
  } catch (error) {
    console.error('Error loading songs:', error);
    return [];
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
  };
}
