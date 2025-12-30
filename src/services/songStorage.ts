/**
 * Song Storage Service - Client-side API for managing songs
 * All data is persisted in Neon Postgres via Vercel Edge Functions
 * Audio and cover files are stored in Vercel Blob
 */

import { Track } from '../types';

// Get API base URL
const getApiBase = () => '/api';

export interface StoredSong extends Track {
  createdAt: number;
  bpm?: number;
  keySignature?: string;
  vocalStyle?: string;
}

export interface SaveSongParams {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  audioBlob?: Blob;
  audioBase64?: string;
  genre: string;
  duration: number;
  coverUrl?: string;
  coverBase64?: string;
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
  bpm?: number;
  keySignature?: string;
  vocalStyle?: string;
}

/**
 * Convert blob URL to base64 for storage
 */
async function blobUrlToBase64(blobUrl: string): Promise<string | null> {
  try {
    if (!blobUrl.startsWith('blob:')) return null;
    
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to convert blob URL to base64:', e);
    return null;
  }
}

/**
 * Save a generated song to Neon Postgres + Vercel Blob storage
 */
export async function saveSong(params: SaveSongParams): Promise<StoredSong> {
  const createdAt = Date.now();
  
  // Convert audio blob URL to base64 if it's a blob URL
  let audioBase64: string | null = null;
  if (params.audioUrl && params.audioUrl.startsWith('blob:')) {
    console.log('Converting audio blob to base64 for persistence...');
    audioBase64 = await blobUrlToBase64(params.audioUrl);
    if (audioBase64) {
      console.log('Audio converted to base64 successfully, size:', Math.round(audioBase64.length / 1024), 'KB');
    }
  }
  
  try {
    const response = await fetch(`${getApiBase()}/songs/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        audioBase64: audioBase64 || params.audioBase64,
        createdAt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned status ${response.status}`);
    }

    const data = await response.json();
    const savedSong = data.song as StoredSong;
    
    // Ensure url field is set
    savedSong.url = savedSong.audioUrl || savedSong.url;
    
    console.log('Song saved successfully:', savedSong.id);
    console.log('Audio URL:', savedSong.audioUrl);
    
    return savedSong;
  } catch (error) {
    console.error('Failed to save song:', error);
    
    // Return a minimal song object so the app can still function
    return {
      id: params.id,
      title: params.title,
      artist: params.artist,
      url: params.audioUrl,
      audioUrl: params.audioUrl,
      genre: params.genre as Track['genre'],
      duration: params.duration,
      coverUrl: params.coverUrl || '',
      lyrics: params.lyrics,
      styleTags: params.styleTags,
      description: params.description,
      isInstrumental: params.isInstrumental,
      bpm: params.bpm,
      keySignature: params.keySignature,
      vocalStyle: params.vocalStyle,
      createdAt,
    };
  }
}

/**
 * Load all generated songs from Neon Postgres
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
      throw new Error(`Failed to load songs: ${response.status}`);
    }

    const data = await response.json();
    const songs = data.songs as StoredSong[];
    
    console.log(`Loaded ${songs.length} songs from database`);
    return songs;
  } catch (error) {
    console.error('Failed to load songs:', error);
    return [];
  }
}

/**
 * Get a single song by ID
 */
export async function getSong(id: string): Promise<StoredSong | null> {
  try {
    const response = await fetch(`${getApiBase()}/songs/get?id=${encodeURIComponent(id)}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get song: ${response.status}`);
    }

    const data = await response.json();
    return data.song as StoredSong;
  } catch (error) {
    console.error('Failed to get song:', error);
    return null;
  }
}

/**
 * Search songs by title/lyrics
 */
export async function searchSongs(query: string, limit = 20): Promise<StoredSong[]> {
  try {
    const response = await fetch(
      `${getApiBase()}/songs/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to search songs: ${response.status}`);
    }

    const data = await response.json();
    return data.songs as StoredSong[];
  } catch (error) {
    console.error('Failed to search songs:', error);
    return [];
  }
}

/**
 * Delete a song from Neon Postgres + Vercel Blob storage
 */
export async function deleteSong(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/songs/delete?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('Song deleted:', id);
      return true;
    }
    
    console.warn('Failed to delete song:', id);
    return false;
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
    audioUrl: song.audioUrl || song.url,
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
