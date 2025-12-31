/**
 * Local Storage Service - Provides persistent backup storage for songs, playlists, and workspaces
 * This ensures data doesn't disappear on refresh even when API calls fail
 */

import { Track, Playlist, Workspace, HistoryEntry, LibraryData } from '../types';
import { StoredSong } from './songStorage';

// Storage keys
const STORAGE_KEYS = {
  SONGS: 'dlm-gen-songs',
  LIBRARY: 'dlm-gen-library',
  LAST_SYNC: 'dlm-gen-last-sync',
} as const;

// Maximum number of songs to store locally
const MAX_LOCAL_SONGS = 100;
const MAX_HISTORY_ENTRIES = 100;

/**
 * Safely get data from localStorage with JSON parsing
 */
function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Safely set data in localStorage with JSON stringification
 */
function setStorageItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to save to localStorage key "${key}":`, e);
    // Try to clear old data if we hit quota
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data...');
      try {
        // Clear oldest songs
        const songs = getStorageItem<StoredSong[]>(STORAGE_KEYS.SONGS, []);
        if (songs.length > MAX_LOCAL_SONGS / 2) {
          const reduced = songs.slice(0, MAX_LOCAL_SONGS / 2);
          localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(reduced));
          // Retry original save
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        }
      } catch {
        // Give up
      }
    }
    return false;
  }
}

// ============================================================================
// SONGS CACHE
// ============================================================================

/**
 * Save songs to localStorage cache
 */
export function cacheSongs(songs: StoredSong[]): void {
  // Keep most recent songs up to the limit
  const sorted = [...songs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const limited = sorted.slice(0, MAX_LOCAL_SONGS);
  setStorageItem(STORAGE_KEYS.SONGS, limited);
}

/**
 * Get songs from localStorage cache
 */
export function getCachedSongs(): StoredSong[] {
  return getStorageItem<StoredSong[]>(STORAGE_KEYS.SONGS, []);
}

/**
 * Add a single song to the cache (for newly created songs)
 */
export function addSongToCache(song: StoredSong): void {
  const existing = getCachedSongs();
  // Remove if already exists (update)
  const filtered = existing.filter(s => s.id !== song.id);
  // Add to beginning
  const updated = [song, ...filtered].slice(0, MAX_LOCAL_SONGS);
  setStorageItem(STORAGE_KEYS.SONGS, updated);
}

/**
 * Remove a song from the cache
 */
export function removeSongFromCache(songId: string): void {
  const existing = getCachedSongs();
  const filtered = existing.filter(s => s.id !== songId);
  setStorageItem(STORAGE_KEYS.SONGS, filtered);
}

/**
 * Update a song in the cache
 */
export function updateSongInCache(songId: string, updates: Partial<StoredSong>): void {
  const existing = getCachedSongs();
  const updated = existing.map(s => s.id === songId ? { ...s, ...updates } : s);
  setStorageItem(STORAGE_KEYS.SONGS, updated);
}

// ============================================================================
// LIBRARY DATA CACHE (Playlists, Workspaces, History, Likes)
// ============================================================================

const DEFAULT_LIBRARY_DATA: LibraryData = {
  playlists: [],
  workspaces: [
    {
      id: 'workspace-default',
      name: 'My Songs',
      description: 'Default workspace for all your songs',
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  ],
  history: [],
  likedTrackIds: [],
};

/**
 * Save library data to localStorage cache
 */
export function cacheLibraryData(data: LibraryData): void {
  // Limit history entries
  const limitedData: LibraryData = {
    ...data,
    history: data.history.slice(0, MAX_HISTORY_ENTRIES),
  };
  setStorageItem(STORAGE_KEYS.LIBRARY, limitedData);
  setStorageItem(STORAGE_KEYS.LAST_SYNC, Date.now());
}

/**
 * Get library data from localStorage cache
 */
export function getCachedLibraryData(): LibraryData {
  return getStorageItem<LibraryData>(STORAGE_KEYS.LIBRARY, DEFAULT_LIBRARY_DATA);
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): number {
  return getStorageItem<number>(STORAGE_KEYS.LAST_SYNC, 0);
}

// ============================================================================
// PLAYLIST CACHE OPERATIONS
// ============================================================================

/**
 * Add playlist to cache
 */
export function addPlaylistToCache(playlist: Playlist): void {
  const data = getCachedLibraryData();
  const exists = data.playlists.find(p => p.id === playlist.id);
  if (exists) {
    data.playlists = data.playlists.map(p => p.id === playlist.id ? playlist : p);
  } else {
    data.playlists.push(playlist);
  }
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Remove playlist from cache
 */
export function removePlaylistFromCache(playlistId: string): void {
  const data = getCachedLibraryData();
  data.playlists = data.playlists.filter(p => p.id !== playlistId);
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Update playlist in cache
 */
export function updatePlaylistInCache(playlistId: string, updates: Partial<Playlist>): void {
  const data = getCachedLibraryData();
  data.playlists = data.playlists.map(p => 
    p.id === playlistId ? { ...p, ...updates, updatedAt: Date.now() } : p
  );
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Add track to playlist in cache
 */
export function addTrackToPlaylistInCache(trackId: string, playlistId: string): void {
  const data = getCachedLibraryData();
  data.playlists = data.playlists.map(p => {
    if (p.id === playlistId && !p.trackIds.includes(trackId)) {
      return { ...p, trackIds: [...p.trackIds, trackId], updatedAt: Date.now() };
    }
    return p;
  });
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

// ============================================================================
// WORKSPACE CACHE OPERATIONS
// ============================================================================

/**
 * Add workspace to cache
 */
export function addWorkspaceToCache(workspace: Workspace): void {
  const data = getCachedLibraryData();
  const exists = data.workspaces.find(w => w.id === workspace.id);
  if (exists) {
    data.workspaces = data.workspaces.map(w => w.id === workspace.id ? workspace : w);
  } else {
    data.workspaces.push(workspace);
  }
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Remove workspace from cache
 */
export function removeWorkspaceFromCache(workspaceId: string): void {
  const data = getCachedLibraryData();
  data.workspaces = data.workspaces.filter(w => w.id !== workspaceId);
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Update workspace in cache
 */
export function updateWorkspaceInCache(workspaceId: string, updates: Partial<Workspace>): void {
  const data = getCachedLibraryData();
  data.workspaces = data.workspaces.map(w => 
    w.id === workspaceId ? { ...w, ...updates, updatedAt: Date.now() } : w
  );
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Move track to workspace in cache
 */
export function moveTrackToWorkspaceInCache(trackId: string, workspaceId: string): void {
  const data = getCachedLibraryData();
  data.workspaces = data.workspaces.map(w => {
    // Remove from all workspaces
    const filtered = w.trackIds.filter(id => id !== trackId);
    // Add to target workspace
    if (w.id === workspaceId) {
      return { ...w, trackIds: [...filtered, trackId], updatedAt: Date.now() };
    }
    return { ...w, trackIds: filtered, updatedAt: Date.now() };
  });
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

// ============================================================================
// HISTORY CACHE OPERATIONS
// ============================================================================

/**
 * Add to history in cache
 */
export function addToHistoryInCache(trackId: string): void {
  const data = getCachedLibraryData();
  const newEntry: HistoryEntry = {
    trackId,
    playedAt: Date.now(),
  };
  // Add to beginning, limit to MAX_HISTORY_ENTRIES
  data.history = [newEntry, ...data.history].slice(0, MAX_HISTORY_ENTRIES);
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Clear history in cache
 */
export function clearHistoryInCache(): void {
  const data = getCachedLibraryData();
  data.history = [];
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

// ============================================================================
// LIKES CACHE OPERATIONS
// ============================================================================

/**
 * Add liked track to cache
 */
export function addLikeToCache(trackId: string): void {
  const data = getCachedLibraryData();
  if (!data.likedTrackIds.includes(trackId)) {
    data.likedTrackIds.push(trackId);
  }
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

/**
 * Remove liked track from cache
 */
export function removeLikeFromCache(trackId: string): void {
  const data = getCachedLibraryData();
  data.likedTrackIds = data.likedTrackIds.filter(id => id !== trackId);
  setStorageItem(STORAGE_KEYS.LIBRARY, data);
}

// ============================================================================
// MERGE UTILITIES
// ============================================================================

/**
 * Merge server data with local cache, preferring server data but keeping local-only items
 */
export function mergeLibraryData(serverData: LibraryData, localData: LibraryData): LibraryData {
  // For playlists: prefer server, but keep local-only ones
  const serverPlaylistIds = new Set(serverData.playlists.map(p => p.id));
  const localOnlyPlaylists = localData.playlists.filter(p => !serverPlaylistIds.has(p.id));
  
  // For workspaces: prefer server, but keep local-only ones
  const serverWorkspaceIds = new Set(serverData.workspaces.map(w => w.id));
  const localOnlyWorkspaces = localData.workspaces.filter(w => !serverWorkspaceIds.has(w.id));
  
  // Merge liked tracks (union of both)
  const allLikedTracks = [...new Set([...serverData.likedTrackIds, ...localData.likedTrackIds])];

  return {
    playlists: [...serverData.playlists, ...localOnlyPlaylists],
    workspaces: [...serverData.workspaces, ...localOnlyWorkspaces],
    history: serverData.history, // Always prefer server history
    likedTrackIds: allLikedTracks,
  };
}

/**
 * Merge songs from server with local cache
 */
export function mergeSongs(serverSongs: StoredSong[], localSongs: StoredSong[]): StoredSong[] {
  const serverSongIds = new Set(serverSongs.map(s => s.id));
  // Keep local songs that aren't on server (may be pending sync)
  const localOnlySongs = localSongs.filter(s => !serverSongIds.has(s.id));
  // Combine and sort by creation date
  const merged = [...serverSongs, ...localOnlySongs];
  merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return merged.slice(0, MAX_LOCAL_SONGS);
}

/**
 * Clear all cached data (for logout/reset)
 */
export function clearAllCachedData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SONGS);
    localStorage.removeItem(STORAGE_KEYS.LIBRARY);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}


