/**
 * Library Service - Client-side API for managing playlists, workspaces, history, and likes
 * All data is persisted in Neon Postgres via Vercel Edge Functions
 */

import { Playlist, Workspace, HistoryEntry, LibraryData, Track } from '../types';

// Get API base URL
const getApiBase = () => '/api';

// ============================================================================
// LIBRARY SYNC
// ============================================================================

/**
 * Load all library data from the server in one request
 */
export async function loadLibraryData(): Promise<LibraryData> {
  try {
    const response = await fetch(`${getApiBase()}/library/sync`);
    
    if (!response.ok) {
      throw new Error(`Failed to sync: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Failed to load library data:', error);
    // Return empty defaults on error
    return {
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
    throw new Error('Failed to create playlist');
  }

  const result = await response.json();
  return result.playlist;
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
  const response = await fetch(`${getApiBase()}/playlists/update`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: playlistId,
      ...updates,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update playlist');
  }

  const result = await response.json();
  return result.playlist;
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId: string): Promise<boolean> {
  const response = await fetch(`${getApiBase()}/playlists/delete?id=${encodeURIComponent(playlistId)}`, {
    method: 'DELETE',
  });

  return response.ok;
}

/**
 * Add track to playlist
 */
export async function addTrackToPlaylist(trackId: string, playlistId: string): Promise<string[]> {
  const response = await fetch(`${getApiBase()}/playlists/add-song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playlistId,
      songId: trackId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add track to playlist');
  }

  const result = await response.json();
  return result.trackIds || [];
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
    throw new Error('Failed to create workspace');
  }

  const result = await response.json();
  return result.workspace;
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
  const response = await fetch(`${getApiBase()}/workspaces/update`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: workspaceId,
      ...updates,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update workspace');
  }

  const result = await response.json();
  return result.workspace;
}

/**
 * Delete workspace (moves songs to default workspace)
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  if (workspaceId === 'workspace-default') {
    return false; // Cannot delete default workspace
  }

  const response = await fetch(`${getApiBase()}/workspaces/delete?id=${encodeURIComponent(workspaceId)}`, {
    method: 'DELETE',
  });

  return response.ok;
}

/**
 * Move track to workspace (removes from other workspaces)
 */
export async function moveTrackToWorkspace(trackId: string, workspaceId: string): Promise<void> {
  const response = await fetch(`${getApiBase()}/workspaces/move-song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      songId: trackId,
      workspaceId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to move track to workspace');
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
  const response = await fetch(`${getApiBase()}/library/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId: trackId }),
  });

  if (!response.ok) {
    console.warn('Failed to add to history');
  }
}

/**
 * Clear play history
 */
export async function clearHistory(): Promise<void> {
  const response = await fetch(`${getApiBase()}/library/history`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear history');
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
  const response = await fetch(`${getApiBase()}/library/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId: trackId }),
  });

  if (!response.ok) {
    throw new Error('Failed to like track');
  }
}

/**
 * Unlike a track
 */
export async function unlikeTrack(trackId: string): Promise<void> {
  const response = await fetch(`${getApiBase()}/library/likes?songId=${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to unlike track');
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

