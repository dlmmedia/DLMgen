import React, { useState } from 'react';
import { Track, Playlist, Workspace } from '../../types';
import { LibrarySongRow } from './LibrarySongRow';
import { PlaylistCard } from './PlaylistCard';
import { 
  Plus, 
  ArrowLeft, 
  Play, 
  Shuffle, 
  MoreHorizontal,
  Music2,
  Pencil,
  Trash2,
  X,
  Check
} from 'lucide-react';

interface LibraryPlaylistsViewProps {
  playlists: Playlist[];
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  workspaces: Workspace[];
  selectedPlaylistId: string | null;
  
  // Navigation
  onSelectPlaylist: (playlistId: string | null) => void;
  
  // Track actions
  onPlay: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: (name: string, track?: Track) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onUpdatePlaylist?: (playlistId: string, updates: Partial<Playlist>) => void;
  onMoveToWorkspace: (track: Track, workspaceId: string) => void;
  onCreateWorkspace: (name: string, track?: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
}

export const LibraryPlaylistsView: React.FC<LibraryPlaylistsViewProps> = ({
  playlists,
  tracks,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  workspaces,
  selectedPlaylistId,
  onSelectPlaylist,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylist,
  onMoveToWorkspace,
  onCreateWorkspace,
  onToggleLike,
  onAddToQueue,
  onShowDetails,
  onDownload,
  onShare,
}) => {
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Get current playlist
  const selectedPlaylist = selectedPlaylistId 
    ? playlists.find(p => p.id === selectedPlaylistId) 
    : null;

  // Get tracks for playlist
  const getPlaylistTracks = (playlist: Playlist): Track[] => {
    return playlist.trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is Track => t !== undefined);
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewPlaylistModal(false);
    }
  };

  const handleStartEdit = (playlist: Playlist) => {
    setEditingPlaylistId(playlist.id);
    setEditingName(playlist.name);
  };

  const handleSaveEdit = () => {
    if (editingPlaylistId && editingName.trim() && onUpdatePlaylist) {
      onUpdatePlaylist(editingPlaylistId, { name: editingName.trim() });
    }
    setEditingPlaylistId(null);
    setEditingName('');
  };

  const handleDeletePlaylist = (playlistId: string) => {
    onDeletePlaylist(playlistId);
    setShowDeleteConfirm(null);
    if (selectedPlaylistId === playlistId) {
      onSelectPlaylist(null);
    }
  };

  const playAllTracks = () => {
    if (selectedPlaylist) {
      const playlistTracks = getPlaylistTracks(selectedPlaylist);
      if (playlistTracks.length > 0) {
        onPlay(playlistTracks[0]);
      }
    }
  };

  // Playlist Detail View
  if (selectedPlaylist) {
    const playlistTracks = getPlaylistTracks(selectedPlaylist);
    const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);
    const durationStr = `${Math.floor(totalDuration / 60)} min`;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5">
          <button
            onClick={() => onSelectPlaylist(null)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            <span>Back to Playlists</span>
          </button>

          <div className="flex items-start gap-4">
            {/* Playlist Cover */}
            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center flex-shrink-0 border border-white/10">
              {selectedPlaylist.coverUrl ? (
                <img src={selectedPlaylist.coverUrl} alt={selectedPlaylist.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Music2 size={40} className="text-white/40" />
              )}
            </div>

            {/* Playlist Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Playlist</div>
              
              {editingPlaylistId === selectedPlaylist.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="text-2xl font-bold bg-transparent border-b border-primary focus:outline-none text-white"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-1 text-primary hover:bg-primary/10 rounded">
                    <Check size={18} />
                  </button>
                  <button onClick={() => setEditingPlaylistId(null)} className="p-1 text-gray-400 hover:bg-white/5 rounded">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <h2 className="text-2xl font-bold text-white mb-1 truncate">{selectedPlaylist.name}</h2>
              )}
              
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{playlistTracks.length} songs</span>
                <span>•</span>
                <span>{durationStr}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={playAllTracks}
                  disabled={playlistTracks.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Play size={16} className="fill-current" />
                  <span>Play All</span>
                </button>
                <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <Shuffle size={18} />
                </button>
                <button
                  onClick={() => handleStartEdit(selectedPlaylist)}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(selectedPlaylist.id)}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {playlistTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Music2 size={24} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">This playlist is empty</h3>
              <p className="text-sm text-gray-500">Add songs from your library to get started.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {playlistTracks.map((track) => (
                <LibrarySongRow
                  key={track.id}
                  track={track}
                  isCurrent={currentTrackId === track.id}
                  isPlaying={isPlaying && currentTrackId === track.id}
                  isLiked={likedTrackIds.includes(track.id)}
                  playlists={playlists}
                  workspaces={workspaces}
                  onPlay={() => onPlay(track)}
                  onDelete={onDelete ? () => onDelete(track.id) : undefined}
                  onAddToPlaylist={onAddToPlaylist}
                  onCreatePlaylist={onCreatePlaylist}
                  onMoveToWorkspace={onMoveToWorkspace}
                  onCreateWorkspace={onCreateWorkspace}
                  onToggleLike={() => onToggleLike(track)}
                  onAddToQueue={onAddToQueue}
                  onShowDetails={onShowDetails}
                  onDownload={onDownload}
                  onShare={onShare}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Delete Playlist?</h3>
              <p className="text-sm text-gray-400 mb-4">
                This will permanently delete "{selectedPlaylist.name}". This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePlaylist(showDeleteConfirm)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Playlists Grid View
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="text-sm text-gray-500">
          {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
        </div>
        <button
          onClick={() => setShowNewPlaylistModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Playlists Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Music2 size={24} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No playlists yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first playlist to organize your music.</p>
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              <span>Create Playlist</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                trackCount={playlist.trackIds.length}
                coverUrls={getPlaylistTracks(playlist).slice(0, 4).map(t => t.coverUrl || '')}
                onClick={() => onSelectPlaylist(playlist.id)}
                onEdit={() => handleStartEdit(playlist)}
                onDelete={() => setShowDeleteConfirm(playlist.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Playlist Modal */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-80 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">New Playlist</h3>
              <button
                onClick={() => {
                  setShowNewPlaylistModal(false);
                  setNewPlaylistName('');
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              placeholder="Playlist name..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 mb-4"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewPlaylistModal(false);
                  setNewPlaylistName('');
                }}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Playlist?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePlaylist(showDeleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

