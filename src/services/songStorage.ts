import { Track, Playlist, Workspace, HistoryEntry, LibraryData } from '../types';

// Get API base URL - in production it's the same origin, in dev we might need to specify
const getApiBase = () => {
  // In production (Vercel), API routes are at /api
  // In development, you'd run `vercel dev` or mock the endpoints
  return '/api';
};

// LocalStorage key for backup storage
const LOCAL_STORAGE_KEY = 'dlm_gen_songs';

// Maximum retry attempts for API calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

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
  audioBlob?: Blob; // For uploading generated audio
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
 * Helper to wait for a specified duration
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Save to localStorage as backup
 */
function saveToLocalStorage(song: StoredSong): void {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    // Remove any existing song with same ID
    const filtered = existing.filter((s: StoredSong) => s.id !== song.id);
    filtered.unshift(song);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    console.log('Song backed up to localStorage:', song.id);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * Load from localStorage
 */
function loadFromLocalStorage(): StoredSong[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return [];
  }
}

/**
 * Remove from localStorage
 */
function removeFromLocalStorage(id: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const filtered = existing.filter((s: StoredSong) => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove from localStorage:', e);
  }
}

/**
 * Convert blob URL to base64 for storage (if needed)
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
 * Save a generated song to Vercel Blob storage with retry logic
 * Uses dual-write strategy: saves to both cloud and localStorage
 */
export async function saveSong(params: SaveSongParams): Promise<StoredSong> {
  const createdAt = Date.now();
  
  // Create the song object for localStorage backup
  const newSong: StoredSong = {
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

  // Always save to localStorage first as backup (dual-write)
  saveToLocalStorage(newSong);

  // Attempt to save to Vercel Blob with retries
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
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

      const contentType = response.headers.get('content-type');
      
      // Check if we got a valid JSON response
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const savedSong = data.song as StoredSong;
        
        // Update localStorage with the cloud-saved version (may have updated URLs)
        saveToLocalStorage(savedSong);
        
        console.log(`Song saved to Vercel Blob (attempt ${attempt}):`, savedSong.id);
        return savedSong;
      }
      
      // If response is not OK or not JSON, treat as failure
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      // HTML response (Vite fallback) means API not available
      if (contentType && contentType.includes('text/html')) {
        throw new Error('API returned HTML instead of JSON');
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Save attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt); // Exponential backoff
      }
    }
  }

  // All retries failed, but we have localStorage backup
  console.warn('All API save attempts failed, using localStorage backup. Error:', lastError?.message);
  return newSong;
}

/**
 * Load all generated songs from Vercel Blob storage
 * Merges with localStorage to catch any songs that failed cloud save
 */
export async function loadSongs(): Promise<StoredSong[]> {
  let cloudSongs: StoredSong[] = [];
  let loadedFromCloud = false;
  
  try {
    const response = await fetch(`${getApiBase()}/songs/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    
    if (response.ok && contentType && contentType.includes('application/json')) {
      const text = await response.text();
      
      if (text && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        cloudSongs = data.songs as StoredSong[];
        loadedFromCloud = true;
        console.log(`Loaded ${cloudSongs.length} songs from Vercel Blob`);
      }
    }
  } catch (error) {
    console.warn('Failed to load from cloud, falling back to localStorage:', error);
  }

  // Load localStorage songs
  const localSongs = loadFromLocalStorage();
  
  if (!loadedFromCloud) {
    // Cloud unavailable, use localStorage only
    console.log(`Using ${localSongs.length} songs from localStorage`);
    return localSongs;
  }
  
  // Merge: prefer cloud versions, add any localStorage songs not in cloud
  const cloudIds = new Set(cloudSongs.map(s => s.id));
  const missingFromCloud = localSongs.filter(s => !cloudIds.has(s.id));
  
  if (missingFromCloud.length > 0) {
    console.log(`Found ${missingFromCloud.length} songs in localStorage not in cloud`);
  }
  
  // Combine and sort by createdAt (newest first)
  const allSongs = [...cloudSongs, ...missingFromCloud];
  allSongs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  return allSongs;
}

/**
 * Delete a song from Vercel Blob storage
 */
export async function deleteSong(id: string): Promise<boolean> {
  // Always remove from localStorage
  removeFromLocalStorage(id);
  
  try {
    const response = await fetch(`${getApiBase()}/songs/delete?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('Song deleted from Vercel Blob:', id);
      return true;
    }
    
    console.warn('Failed to delete from cloud, but removed from localStorage');
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

/**
 * Sync localStorage songs to cloud
 * Call this when the app regains connectivity
 */
export async function syncLocalToCloud(): Promise<number> {
  const localSongs = loadFromLocalStorage();
  let synced = 0;
  
  for (const song of localSongs) {
    try {
      const response = await fetch(`${getApiBase()}/songs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(song),
      });
      
      if (response.ok) {
        synced++;
      }
    } catch {
      // Skip failed syncs
    }
  }
  
  console.log(`Synced ${synced}/${localSongs.length} songs to cloud`);
  return synced;
}

// ============================================================================
// LIBRARY DATA STORAGE (Playlists, Workspaces, History, Liked Songs)
// ============================================================================

const LIBRARY_STORAGE_KEY = 'dlm_library_data';
const HISTORY_MAX_ENTRIES = 100;

/**
 * Default library data structure
 */
function getDefaultLibraryData(): LibraryData {
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

/**
 * Save library data to localStorage
 */
function saveLibraryToLocalStorage(data: LibraryData): void {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(data));
    console.log('Library data saved to localStorage');
  } catch (e) {
    console.error('Failed to save library data to localStorage:', e);
  }
}

/**
 * Load library data from localStorage
 */
function loadLibraryFromLocalStorage(): LibraryData {
  try {
    const data = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure all required fields exist (migration support)
      return {
        playlists: parsed.playlists || [],
        workspaces: parsed.workspaces || getDefaultLibraryData().workspaces,
        history: parsed.history || [],
        likedTrackIds: parsed.likedTrackIds || [],
      };
    }
  } catch (e) {
    console.error('Failed to load library data from localStorage:', e);
  }
  return getDefaultLibraryData();
}

/**
 * Save library data with cloud sync attempt
 */
export async function saveLibraryData(data: LibraryData): Promise<LibraryData> {
  // Always save to localStorage first
  saveLibraryToLocalStorage(data);
  
  // TODO: Implement Vercel Blob persistence for library data
  // For now, localStorage is the primary storage
  
  return data;
}

/**
 * Load library data with cloud sync attempt
 */
export async function loadLibraryData(): Promise<LibraryData> {
  // TODO: Try loading from Vercel Blob first, then merge with localStorage
  // For now, localStorage is the primary storage
  
  return loadLibraryFromLocalStorage();
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
  const data = await loadLibraryData();
  
  const newPlaylist: Playlist = {
    id: `playlist-${Date.now()}`,
    name,
    description,
    trackIds: initialTrackId ? [initialTrackId] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.playlists.push(newPlaylist);
  await saveLibraryData(data);
  
  return newPlaylist;
}

/**
 * Add track to playlist
 */
export async function addTrackToPlaylist(
  trackId: string,
  playlistId: string
): Promise<Playlist | null> {
  const data = await loadLibraryData();
  const playlist = data.playlists.find(p => p.id === playlistId);
  
  if (!playlist) return null;
  
  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    playlist.updatedAt = Date.now();
    await saveLibraryData(data);
  }
  
  return playlist;
}

/**
 * Remove track from playlist
 */
export async function removeTrackFromPlaylist(
  trackId: string,
  playlistId: string
): Promise<Playlist | null> {
  const data = await loadLibraryData();
  const playlist = data.playlists.find(p => p.id === playlistId);
  
  if (!playlist) return null;
  
  playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
  playlist.updatedAt = Date.now();
  await saveLibraryData(data);
  
  return playlist;
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId: string): Promise<boolean> {
  const data = await loadLibraryData();
  const initialLength = data.playlists.length;
  data.playlists = data.playlists.filter(p => p.id !== playlistId);
  
  if (data.playlists.length !== initialLength) {
    await saveLibraryData(data);
    return true;
  }
  
  return false;
}

/**
 * Update playlist details
 */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<Pick<Playlist, 'name' | 'description' | 'coverUrl' | 'isPublic'>>
): Promise<Playlist | null> {
  const data = await loadLibraryData();
  const playlist = data.playlists.find(p => p.id === playlistId);
  
  if (!playlist) return null;
  
  Object.assign(playlist, updates, { updatedAt: Date.now() });
  await saveLibraryData(data);
  
  return playlist;
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
  const data = await loadLibraryData();
  
  const newWorkspace: Workspace = {
    id: `workspace-${Date.now()}`,
    name,
    description,
    trackIds: initialTrackId ? [initialTrackId] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  data.workspaces.push(newWorkspace);
  await saveLibraryData(data);
  
  return newWorkspace;
}

/**
 * Move track to workspace (removes from other workspaces)
 */
export async function moveTrackToWorkspace(
  trackId: string,
  workspaceId: string
): Promise<Workspace | null> {
  const data = await loadLibraryData();
  
  // Remove from all other workspaces first (song can only be in one workspace)
  for (const ws of data.workspaces) {
    ws.trackIds = ws.trackIds.filter(id => id !== trackId);
  }
  
  // Add to target workspace
  const workspace = data.workspaces.find(w => w.id === workspaceId);
  if (!workspace) return null;
  
  workspace.trackIds.push(trackId);
  workspace.updatedAt = Date.now();
  await saveLibraryData(data);
  
  return workspace;
}

/**
 * Remove track from workspace (makes it "unsorted")
 */
export async function removeTrackFromWorkspace(trackId: string): Promise<void> {
  const data = await loadLibraryData();
  
  for (const ws of data.workspaces) {
    ws.trackIds = ws.trackIds.filter(id => id !== trackId);
    ws.updatedAt = Date.now();
  }
  
  await saveLibraryData(data);
}

/**
 * Delete workspace (moves tracks to default workspace)
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  const data = await loadLibraryData();
  
  // Don't delete default workspace
  if (workspaceId === 'workspace-default') return false;
  
  const workspace = data.workspaces.find(w => w.id === workspaceId);
  if (!workspace) return false;
  
  // Move tracks to default workspace
  const defaultWorkspace = data.workspaces.find(w => w.id === 'workspace-default');
  if (defaultWorkspace) {
    defaultWorkspace.trackIds.push(...workspace.trackIds);
    defaultWorkspace.updatedAt = Date.now();
  }
  
  data.workspaces = data.workspaces.filter(w => w.id !== workspaceId);
  await saveLibraryData(data);
  
  return true;
}

/**
 * Update workspace details
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Pick<Workspace, 'name' | 'description' | 'coverUrl'>>
): Promise<Workspace | null> {
  const data = await loadLibraryData();
  const workspace = data.workspaces.find(w => w.id === workspaceId);
  
  if (!workspace) return null;
  
  Object.assign(workspace, updates, { updatedAt: Date.now() });
  await saveLibraryData(data);
  
  return workspace;
}

// ============================================================================
// HISTORY OPERATIONS
// ============================================================================

/**
 * Add track to play history
 */
export async function addToHistory(trackId: string): Promise<HistoryEntry[]> {
  const data = await loadLibraryData();
  
  // Add new entry at the beginning
  const newEntry: HistoryEntry = {
    trackId,
    playedAt: Date.now(),
  };
  
  data.history.unshift(newEntry);
  
  // Keep only last N entries
  if (data.history.length > HISTORY_MAX_ENTRIES) {
    data.history = data.history.slice(0, HISTORY_MAX_ENTRIES);
  }
  
  await saveLibraryData(data);
  
  return data.history;
}

/**
 * Clear play history
 */
export async function clearHistory(): Promise<void> {
  const data = await loadLibraryData();
  data.history = [];
  await saveLibraryData(data);
}

/**
 * Get play history
 */
export async function getHistory(): Promise<HistoryEntry[]> {
  const data = await loadLibraryData();
  return data.history;
}

// ============================================================================
// LIKED SONGS OPERATIONS
// ============================================================================

/**
 * Toggle liked status for a track
 */
export async function toggleLiked(trackId: string): Promise<boolean> {
  const data = await loadLibraryData();
  
  const index = data.likedTrackIds.indexOf(trackId);
  const isLiked = index === -1;
  
  if (isLiked) {
    data.likedTrackIds.push(trackId);
  } else {
    data.likedTrackIds.splice(index, 1);
  }
  
  await saveLibraryData(data);
  
  return isLiked;
}

/**
 * Check if track is liked
 */
export function isTrackLiked(likedTrackIds: string[], trackId: string): boolean {
  return likedTrackIds.includes(trackId);
}

/**
 * Get all liked track IDs
 */
export async function getLikedTrackIds(): Promise<string[]> {
  const data = await loadLibraryData();
  return data.likedTrackIds;
}
