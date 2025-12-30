import React, { useState } from 'react';
import { Track, Playlist, Workspace } from '../../types';
import { LibrarySongRow } from './LibrarySongRow';
import { WorkspaceCard } from './WorkspaceCard';
import { 
  Plus, 
  ArrowLeft, 
  Play, 
  FolderOpen,
  Pencil,
  Trash2,
  X,
  Check
} from 'lucide-react';

interface LibraryWorkspacesViewProps {
  workspaces: Workspace[];
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  playlists: Playlist[];
  selectedWorkspaceId: string | null;
  
  // Navigation
  onSelectWorkspace: (workspaceId: string | null) => void;
  
  // Track actions
  onPlay: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: (name: string, track?: Track) => void;
  onMoveToWorkspace: (track: Track, workspaceId: string) => void;
  onCreateWorkspace: (name: string, track?: Track) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onUpdateWorkspace?: (workspaceId: string, updates: Partial<Workspace>) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
}

export const LibraryWorkspacesView: React.FC<LibraryWorkspacesViewProps> = ({
  workspaces,
  tracks,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  playlists,
  selectedWorkspaceId,
  onSelectWorkspace,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onCreatePlaylist,
  onMoveToWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onUpdateWorkspace,
  onToggleLike,
  onAddToQueue,
  onShowDetails,
  onDownload,
  onShare,
}) => {
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Get current workspace
  const selectedWorkspace = selectedWorkspaceId 
    ? workspaces.find(w => w.id === selectedWorkspaceId) 
    : null;

  // Get tracks for workspace
  const getWorkspaceTracks = (workspace: Workspace): Track[] => {
    return workspace.trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is Track => t !== undefined);
  };

  // Get unsorted tracks (not in any workspace)
  const getUnsortedTracks = (): Track[] => {
    const allWorkspaceTrackIds = new Set(
      workspaces.flatMap(w => w.trackIds)
    );
    return tracks.filter(t => !allWorkspaceTrackIds.has(t.id));
  };

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      onCreateWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setShowNewWorkspaceModal(false);
    }
  };

  const handleStartEdit = (workspace: Workspace) => {
    setEditingWorkspaceId(workspace.id);
    setEditingName(workspace.name);
  };

  const handleSaveEdit = () => {
    if (editingWorkspaceId && editingName.trim() && onUpdateWorkspace) {
      onUpdateWorkspace(editingWorkspaceId, { name: editingName.trim() });
    }
    setEditingWorkspaceId(null);
    setEditingName('');
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    onDeleteWorkspace(workspaceId);
    setShowDeleteConfirm(null);
    if (selectedWorkspaceId === workspaceId) {
      onSelectWorkspace(null);
    }
  };

  const playAllTracks = () => {
    if (selectedWorkspace) {
      const workspaceTracks = getWorkspaceTracks(selectedWorkspace);
      if (workspaceTracks.length > 0) {
        onPlay(workspaceTracks[0]);
      }
    }
  };

  // Workspace Detail View
  if (selectedWorkspace) {
    const workspaceTracks = getWorkspaceTracks(selectedWorkspace);
    const isDefaultWorkspace = selectedWorkspace.id === 'workspace-default';

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
          <button
            onClick={() => onSelectWorkspace(null)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            <span>Back to Workspaces</span>
          </button>

          <div className="flex items-start gap-4">
            {/* Workspace Icon */}
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-white/10">
              <FolderOpen size={36} className="text-amber-500/60 dark:text-amber-400/60" />
            </div>

            {/* Workspace Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Workspace</div>
              
              {editingWorkspaceId === selectedWorkspace.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="text-2xl font-bold bg-transparent border-b border-primary focus:outline-none text-gray-900 dark:text-white"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-1 text-primary hover:bg-primary/10 rounded">
                    <Check size={18} />
                  </button>
                  <button onClick={() => setEditingWorkspaceId(null)} className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate">{selectedWorkspace.name}</h2>
              )}
              
              {selectedWorkspace.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{selectedWorkspace.description}</p>
              )}
              
              <div className="text-sm text-gray-500">
                {workspaceTracks.length} {workspaceTracks.length === 1 ? 'song' : 'songs'}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={playAllTracks}
                  disabled={workspaceTracks.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Play size={16} className="fill-current" />
                  <span>Play All</span>
                </button>
                {!isDefaultWorkspace && (
                  <>
                    <button
                      onClick={() => handleStartEdit(selectedWorkspace)}
                      className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(selectedWorkspace.id)}
                      className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {workspaceTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                <FolderOpen size={24} className="text-gray-400 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">This workspace is empty</h3>
              <p className="text-sm text-gray-500">Move songs here from your library using the context menu.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {workspaceTracks.map((track) => (
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
            <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Workspace?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Songs will be moved to "My Songs". This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteWorkspace(showDeleteConfirm)}
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

  // Workspaces Grid View
  const unsortedTracks = getUnsortedTracks();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
        <div className="text-sm text-gray-500">
          {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
          {unsortedTracks.length > 0 && (
            <span className="text-gray-400 dark:text-gray-600"> • {unsortedTracks.length} unsorted</span>
          )}
        </div>
        <button
          onClick={() => setShowNewWorkspaceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspaces Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              trackCount={workspace.trackIds.length}
              onClick={() => onSelectWorkspace(workspace.id)}
              onEdit={workspace.id !== 'workspace-default' ? () => handleStartEdit(workspace) : undefined}
              onDelete={workspace.id !== 'workspace-default' ? () => setShowDeleteConfirm(workspace.id) : undefined}
              isDefault={workspace.id === 'workspace-default'}
            />
          ))}
        </div>
      </div>

      {/* New Workspace Modal */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-80 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Workspace</h3>
              <button
                onClick={() => {
                  setShowNewWorkspaceModal(false);
                  setNewWorkspaceName('');
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              placeholder="Workspace name..."
              className="w-full bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 mb-4"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewWorkspaceModal(false);
                  setNewWorkspaceName('');
                }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
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
          <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Workspace?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Songs will be moved to "My Songs". This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteWorkspace(showDeleteConfirm)}
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

