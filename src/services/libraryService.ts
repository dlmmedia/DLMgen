/**
 * Library Service - Client-side API for managing playlists, workspaces, history, and likes
 * All data is persisted in Neon Postgres via Vercel Edge Functions
 * With localStorage backup for offline resilience
 */

import { Playlist, Workspace, HistoryEntry, LibraryData, Track } from '../types';
import {
  cacheLibraryData,
  getCachedLibraryData,
  addPlaylistToCache,
  removePlaylistFromCache,
  updatePlaylistInCache,
  addTrackToPlaylistInCache,
  addWorkspaceToCache,
  removeWorkspaceFromCache,
  updateWorkspaceInCache,
  moveTrackToWorkspaceInCache,
  addToHistoryInCache,
  clearHistoryInCache,
  addLikeToCache,
  removeLikeFromCache,
  mergeLibraryData,
} from './localStorageService';

// Get API base URL
const getApiBase = () => '/api';

// ============================================================================
// LIBRARY SYNC
// ============================================================================

/**
 * Load all library data from the server in one request
 * Falls back to localStorage cache if server is unavailable
 */
export async function loadLibraryData(): Promise<LibraryData> {
  // Always get local cache first as fallback
  const cachedData = getCachedLibraryData();
  
  try {
    const response = await fetch(`${getApiBase()}/library/sync`);
    
    if (!response.ok) {
      throw new Error(`Failed to sync: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      // Merge server data with any local-only items
      const mergedData = mergeLibraryData(result.data, cachedData);
      // Cache the merged data
      cacheLibraryData(mergedData);
      console.log('Library data synced from server and cached locally');
      return mergedData;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Failed to load library data from server, using cache:', error);
    // Return cached data as fallback
    console.log('Using cached library data:', cachedData.playlists.length, 'playlists,', cachedData.workspaces.length, 'workspaces');
    return cachedData;
  }
}

// ============================================================================
// PLAYLIST OPERATIONS
// ============================================================================

/**
 * Create a new playlist
 */
export async function createPlaylist(
  name: string,
  initialTrackId?: string,
  description?: string
): Promise<Playlist> {
  // Create optimistic local playlist first
  const optimisticPlaylist: Playlist = {
    id: `playlist-${Date.now()}`,
    name,
    description,
    trackIds: initialTrackId ? [initialTrackId] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  // Save to cache immediately for persistence
  addPlaylistToCache(optimisticPlaylist);
  
  try {
    const response = await fetch(`${getApiBase()}/playlists/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        initialSongId: initialTrackId,
      }),
    });

    if (!response.ok) {
      console.warn('Server playlist creation failed, using local cache');
      return optimisticPlaylist;
    }

    const result = await response.json();
    const serverPlaylist = result.playlist;
    
    // Update cache with server ID if different
    if (serverPlaylist.id !== optimisticPlaylist.id) {
      removePlaylistFromCache(optimisticPlaylist.id);
      addPlaylistToCache(serverPlaylist);
    }
    
    return serverPlaylist;
  } catch (error) {
    console.error('Failed to create playlist on server:', error);
    // Return the optimistic playlist that's already in cache
    return optimisticPlaylist;
  }
}

/**
 * List all playlists
 */
export async function listPlaylists(): Promise<Playlist[]> {
  const response = await fetch(`${getApiBase()}/playlists/list`);

  if (!response.ok) {
    throw new Error('Failed to list playlists');
  }

  const result = await response.json();
  return result.playlists || [];
}

/**
 * Get playlist with songs
 */
export async function getPlaylist(playlistId: string): Promise<{ playlist: Playlist; songs: Track[] }> {
  const response = await fetch(`${getApiBase()}/playlists/get?id=${encodeURIComponent(playlistId)}`);

  if (!response.ok) {
    throw new Error('Failed to get playlist');
  }

  const result = await response.json();
  return {
    playlist: result.playlist,
    songs: result.songs || [],
  };
}

/**
 * Update playlist
 */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<Pick<Playlist, 'name' | 'description' | 'coverUrl' | 'isPublic'>>
): Promise<Playlist> {
  // Update cache immediately
  updatePlaylistInCache(playlistId, updates);
  
  try {
    const response = await fetch(`${getApiBase()}/playlists/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: playlistId,
        ...updates,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to update playlist on server');
      throw new Error('Failed to update playlist');
    }

    const result = await response.json();
    return result.playlist;
  } catch (error) {
    console.error('Failed to update playlist:', error);
    // Cache is already updated, return a merged version
    const cached = getCachedLibraryData();
    const playlist = cached.playlists.find(p => p.id === playlistId);
    if (playlist) return playlist;
    throw error;
  }
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId: string): Promise<boolean> {
  // Remove from cache immediately
  removePlaylistFromCache(playlistId);
  
  try {
    const response = await fetch(`${getApiBase()}/playlists/delete?id=${encodeURIComponent(playlistId)}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete playlist from server:', error);
    // Already removed from cache
    return true;
  }
}

/**
 * Add track to playlist
 */
export async function addTrackToPlaylist(trackId: string, playlistId: string): Promise<string[]> {
  // Update cache immediately
  addTrackToPlaylistInCache(trackId, playlistId);
  
  try {
    const response = await fetch(`${getApiBase()}/playlists/add-song`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistId,
        songId: trackId,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to add track to playlist on server');
      // Cache is already updated
    }

    const result = await response.json();
    return result.trackIds || [];
  } catch (error) {
    console.error('Failed to add track to playlist:', error);
    // Return from cache
    const cached = getCachedLibraryData();
    const playlist = cached.playlists.find(p => p.id === playlistId);
    return playlist?.trackIds || [];
  }
}

/**
 * Remove track from playlist
 */
export async function removeTrackFromPlaylist(trackId: string, playlistId: string): Promise<string[]> {
  const response = await fetch(
    `${getApiBase()}/playlists/remove-song?playlistId=${encodeURIComponent(playlistId)}&songId=${encodeURIComponent(trackId)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error('Failed to remove track from playlist');
  }

  const result = await response.json();
  return result.trackIds || [];
}

/**
 * Reorder songs in playlist
 */
export async function reorderPlaylist(playlistId: string, songIds: string[]): Promise<void> {
  const response = await fetch(`${getApiBase()}/playlists/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playlistId,
      songIds,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to reorder playlist');
  }
}

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

/**
 * Create a new workspace
 */
export async function createWorkspace(
  name: string,
  initialTrackId?: string,
  description?: string
): Promise<Workspace> {
  // Create optimistic local workspace first
  const optimisticWorkspace: Workspace = {
    id: `workspace-${Date.now()}`,
    name,
    description,
    trackIds: initialTrackId ? [initialTrackId] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  // Save to cache immediately for persistence
  addWorkspaceToCache(optimisticWorkspace);
  
  try {
    const response = await fetch(`${getApiBase()}/workspaces/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        initialSongId: initialTrackId,
      }),
    });

    if (!response.ok) {
      console.warn('Server workspace creation failed, using local cache');
      return optimisticWorkspace;
    }

    const result = await response.json();
    const serverWorkspace = result.workspace;
    
    // Update cache with server ID if different
    if (serverWorkspace.id !== optimisticWorkspace.id) {
      removeWorkspaceFromCache(optimisticWorkspace.id);
      addWorkspaceToCache(serverWorkspace);
    }
    
    return serverWorkspace;
  } catch (error) {
    console.error('Failed to create workspace on server:', error);
    // Return the optimistic workspace that's already in cache
    return optimisticWorkspace;
  }
}

/**
 * List all workspaces
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  const response = await fetch(`${getApiBase()}/workspaces/list`);

  if (!response.ok) {
    throw new Error('Failed to list workspaces');
  }

  const result = await response.json();
  return result.workspaces || [];
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Pick<Workspace, 'name' | 'description' | 'coverUrl'>>
): Promise<Workspace> {
  // Update cache immediately
  updateWorkspaceInCache(workspaceId, updates);
  
  try {
    const response = await fetch(`${getApiBase()}/workspaces/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: workspaceId,
        ...updates,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to update workspace on server');
      throw new Error('Failed to update workspace');
    }

    const result = await response.json();
    return result.workspace;
  } catch (error) {
    console.error('Failed to update workspace:', error);
    // Cache is already updated, return from cache
    const cached = getCachedLibraryData();
    const workspace = cached.workspaces.find(w => w.id === workspaceId);
    if (workspace) return workspace;
    throw error;
  }
}

/**
 * Delete workspace (moves songs to default workspace)
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  if (workspaceId === 'workspace-default') {
    return false; // Cannot delete default workspace
  }

  // Remove from cache immediately
  removeWorkspaceFromCache(workspaceId);
  
  try {
    const response = await fetch(`${getApiBase()}/workspaces/delete?id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete workspace from server:', error);
    // Already removed from cache
    return true;
  }
}

/**
 * Move track to workspace (removes from other workspaces)
 */
export async function moveTrackToWorkspace(trackId: string, workspaceId: string): Promise<void> {
  // Update cache immediately
  moveTrackToWorkspaceInCache(trackId, workspaceId);
  
  try {
    const response = await fetch(`${getApiBase()}/workspaces/move-song`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId: trackId,
        workspaceId,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to move track to workspace on server');
    }
  } catch (error) {
    console.error('Failed to move track to workspace:', error);
    // Cache is already updated
  }
}

// ============================================================================
// HISTORY OPERATIONS
// ============================================================================

/**
 * Get play history
 */
export async function getHistory(limit = 100): Promise<HistoryEntry[]> {
  const response = await fetch(`${getApiBase()}/library/history?limit=${limit}`);

  if (!response.ok) {
    throw new Error('Failed to get history');
  }

  const result = await response.json();
  return result.history || [];
}

/**
 * Add track to play history
 */
export async function addToHistory(trackId: string): Promise<void> {
  // Update cache immediately
  addToHistoryInCache(trackId);
  
  try {
    const response = await fetch(`${getApiBase()}/library/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: trackId }),
    });

    if (!response.ok) {
      console.warn('Failed to add to history on server');
    }
  } catch (error) {
    console.error('Failed to add to history:', error);
    // Cache is already updated
  }
}

/**
 * Clear play history
 */
export async function clearHistory(): Promise<void> {
  // Clear cache immediately
  clearHistoryInCache();
  
  try {
    const response = await fetch(`${getApiBase()}/library/history`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.warn('Failed to clear history on server');
    }
  } catch (error) {
    console.error('Failed to clear history:', error);
    // Cache is already cleared
  }
}

// ============================================================================
// LIKED SONGS OPERATIONS
// ============================================================================

/**
 * Get all liked track IDs
 */
export async function getLikedTrackIds(): Promise<string[]> {
  const response = await fetch(`${getApiBase()}/library/likes`);

  if (!response.ok) {
    throw new Error('Failed to get liked tracks');
  }

  const result = await response.json();
  return result.likedTrackIds || [];
}

/**
 * Like a track
 */
export async function likeTrack(trackId: string): Promise<void> {
  // Update cache immediately
  addLikeToCache(trackId);
  
  try {
    const response = await fetch(`${getApiBase()}/library/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: trackId }),
    });

    if (!response.ok) {
      console.warn('Failed to like track on server');
    }
  } catch (error) {
    console.error('Failed to like track:', error);
    // Cache is already updated
  }
}

/**
 * Unlike a track
 */
export async function unlikeTrack(trackId: string): Promise<void> {
  // Update cache immediately
  removeLikeFromCache(trackId);
  
  try {
    const response = await fetch(`${getApiBase()}/library/likes?songId=${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.warn('Failed to unlike track on server');
    }
  } catch (error) {
    console.error('Failed to unlike track:', error);
    // Cache is already updated
  }
}

/**
 * Toggle liked status for a track
 */
export async function toggleLiked(trackId: string, currentlyLiked: boolean): Promise<boolean> {
  if (currentlyLiked) {
    await unlikeTrack(trackId);
    return false;
  } else {
    await likeTrack(trackId);
    return true;
  }
}

/**
 * Check if track is liked
 */
export function isTrackLiked(likedTrackIds: string[], trackId: string): boolean {
  return likedTrackIds.includes(trackId);
}

