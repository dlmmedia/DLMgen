/**
 * Song Storage Service - Client-side API for managing songs
 * All data is persisted in Neon Postgres via Vercel Edge Functions
 * Audio files are stored in Vercel Blob IMMEDIATELY during generation
 * Cover files are uploaded when saving metadata
 * With localStorage backup for offline resilience
 * 
 * IMPORTANT: Audio is now saved to Vercel Blob during the generation step,
 * ensuring songs are never lost. This service primarily handles metadata
 * persistence with retry logic for reliability.
 */

import { Track } from '../types';
import {
  cacheSongs,
  getCachedSongs,
  addSongToCache,
  removeSongFromCache,
  mergeSongs,
} from './localStorageService';

// Get API base URL
const getApiBase = () => '/api';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Storage key for failed saves that need manual recovery
const FAILED_SAVES_KEY = 'dlm-failed-saves';

export interface StoredSong extends Track {
  createdAt: number;
  bpm?: number;
  keySignature?: string;
  vocalStyle?: string;
  expectedDuration?: number;
  actualDuration?: number;
}

export interface SaveSongParams {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  genre: string;
  duration: number;
  expectedDuration?: number;
  actualDuration?: number;
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
 * Helper to delay execution (for retry backoff)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Store a failed save for later recovery
 */
function storeFailedSave(params: SaveSongParams, error: string): void {
  try {
    const failedSaves = JSON.parse(localStorage.getItem(FAILED_SAVES_KEY) || '[]');
    // Avoid duplicates
    const existing = failedSaves.findIndex((s: SaveSongParams) => s.id === params.id);
    if (existing >= 0) {
      failedSaves[existing] = { ...params, failedAt: Date.now(), error };
    } else {
      failedSaves.push({ ...params, failedAt: Date.now(), error });
    }
    // Keep only last 50 failed saves
    const limited = failedSaves.slice(-50);
    localStorage.setItem(FAILED_SAVES_KEY, JSON.stringify(limited));
    console.warn(`[SongStorage] Stored failed save for recovery: ${params.id}`);
  } catch (e) {
    console.error('[SongStorage] Could not store failed save:', e);
  }
}

/**
 * Get failed saves for manual recovery
 */
export function getFailedSaves(): SaveSongParams[] {
  try {
    return JSON.parse(localStorage.getItem(FAILED_SAVES_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear a failed save after successful retry
 */
function clearFailedSave(id: string): void {
  try {
    const failedSaves = JSON.parse(localStorage.getItem(FAILED_SAVES_KEY) || '[]');
    const filtered = failedSaves.filter((s: SaveSongParams) => s.id !== id);
    localStorage.setItem(FAILED_SAVES_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[SongStorage] Could not clear failed save:', e);
  }
}

/**
 * Save a generated song to Neon Postgres database
 * 
 * IMPORTANT: Audio should already be stored in Vercel Blob from the generate endpoint.
 * This function saves metadata and cover images with retry logic for reliability.
 * 
 * The function will:
 * 1. Cache locally immediately for offline resilience
 * 2. Attempt to save to the server with retries
 * 3. Store failed saves for later recovery if all retries fail
 * 4. THROW an error if save fails (no silent failures)
 */
export async function saveSong(params: SaveSongParams): Promise<StoredSong> {
  const createdAt = Date.now();
  
  // Validate that audio URL is not a temporary blob URL
  if (params.audioUrl && params.audioUrl.startsWith('blob:')) {
    console.error('[SongStorage] CRITICAL: Received temporary blob URL - audio should be saved during generation');
    throw new Error('Cannot save song with temporary blob URL. Audio must be stored permanently first.');
  }
  
  // Create an optimistic local song object
  const localSong: StoredSong = {
    id: params.id,
    title: params.title,
    artist: params.artist || 'AI Composer',
    url: params.audioUrl,
    audioUrl: params.audioUrl,
    genre: params.genre as Track['genre'],
    duration: params.duration,
    expectedDuration: params.expectedDuration,
    actualDuration: params.actualDuration,
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
  
  // Save to local cache immediately for persistence
  addSongToCache(localSong);
  console.log('[SongStorage] Song cached locally:', localSong.id);
  
  // Attempt to save with retries
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[SongStorage] Saving song ${params.id} (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const response = await fetch(`${getApiBase()}/songs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          createdAt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API returned status ${response.status}`;
        
        // Don't retry client errors (4xx) - they won't succeed on retry
        if (response.status >= 400 && response.status < 500) {
          throw new Error(errorMessage);
        }
        
        // Server errors (5xx) may be transient, so retry
        lastError = new Error(errorMessage);
        console.warn(`[SongStorage] Save attempt ${attempt} failed:`, errorMessage);
        
        if (attempt < MAX_RETRIES) {
          const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[SongStorage] Retrying in ${retryDelay}ms...`);
          await delay(retryDelay);
          continue;
        }
      } else {
        // Success!
        const data = await response.json();
        const savedSong = data.song as StoredSong;
        
        // Ensure url field is set
        savedSong.url = savedSong.audioUrl || savedSong.url;
        
        // Update local cache with server response (may have different URLs for cover)
        addSongToCache(savedSong);
        
        // Clear any previous failed save for this song
        clearFailedSave(savedSong.id);
        
        console.log('[SongStorage] Song saved successfully:', savedSong.id);
        console.log('[SongStorage] Audio URL:', savedSong.audioUrl);
        
        return savedSong;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[SongStorage] Save attempt ${attempt} error:`, lastError.message);
      
      // Don't retry for certain error types
      if (lastError.message.includes('temporary blob URL') ||
          lastError.message.includes('Missing required') ||
          lastError.message.includes('INVALID_AUDIO_URL')) {
        break;
      }
      
      if (attempt < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[SongStorage] Retrying in ${retryDelay}ms...`);
        await delay(retryDelay);
      }
    }
  }
  
  // All retries exhausted - store for manual recovery and throw
  console.error(`[SongStorage] CRITICAL: All save attempts failed for song ${params.id}`);
  storeFailedSave(params, lastError?.message || 'Unknown error');
  
  // IMPORTANT: We throw here instead of silently returning the local song
  // This ensures the caller knows the save failed
  throw new Error(`Failed to save song after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Retry saving a failed song (for manual recovery)
 */
export async function retrySaveSong(params: SaveSongParams): Promise<StoredSong> {
  console.log(`[SongStorage] Retrying save for song: ${params.id}`);
  return saveSong(params);
}

/**
 * Retry all failed saves
 * Returns array of results: { id, success, error? }
 */
export async function retryAllFailedSaves(): Promise<Array<{ id: string; success: boolean; error?: string }>> {
  const failedSaves = getFailedSaves();
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  
  console.log(`[SongStorage] Retrying ${failedSaves.length} failed saves...`);
  
  for (const save of failedSaves) {
    try {
      await retrySaveSong(save);
      results.push({ id: save.id, success: true });
    } catch (error) {
      results.push({ 
        id: save.id, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`[SongStorage] Retry complete: ${successful}/${failedSaves.length} successful`);
  
  return results;
}

/**
 * Load all generated songs from Neon Postgres
 * Falls back to localStorage cache if server is unavailable
 */
export async function loadSongs(): Promise<StoredSong[]> {
  // Always get local cache first as fallback
  const cachedSongs = getCachedSongs();
  
  try {
    const response = await fetch(`${getApiBase()}/songs/list?limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load songs: ${response.status}`);
    }

    const data = await response.json();
    const serverSongs = data.songs as StoredSong[];
    
    // Merge server songs with any local-only songs (in case of pending sync)
    const mergedSongs = mergeSongs(serverSongs, cachedSongs);
    
    // Update cache with merged data
    cacheSongs(mergedSongs);
    
    console.log(`Loaded ${serverSongs.length} songs from database, merged with ${cachedSongs.length} cached songs`);
    return mergedSongs;
  } catch (error) {
    console.error('Failed to load songs from server, using cache:', error);
    console.log(`Using ${cachedSongs.length} cached songs`);
    return cachedSongs;
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
 * Also removes from local cache
 */
export async function deleteSong(id: string): Promise<boolean> {
  // Remove from local cache immediately
  removeSongFromCache(id);
  console.log('Song removed from cache:', id);
  
  try {
    const response = await fetch(`${getApiBase()}/songs/delete?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('Song deleted from server:', id);
      return true;
    }
    
    console.warn('Failed to delete song from server:', id);
    return true; // Still return true since cache is updated
  } catch (error) {
    console.error('Error deleting song from server:', error);
    return true; // Return true since cache is already updated
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
    expectedDuration: track.expectedDuration,
    actualDuration: track.actualDuration,
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
    duration: song.actualDuration || song.duration,
    expectedDuration: song.expectedDuration,
    actualDuration: song.actualDuration,
    coverUrl: song.coverUrl,
    lyrics: song.lyrics,
    styleTags: song.styleTags,
    description: song.description,
    isInstrumental: song.isInstrumental,
    createdAt: song.createdAt,
  };
}
