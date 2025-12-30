import React, { useState } from 'react';
import { Track, Playlist, Workspace, HistoryEntry } from '../../types';
import { LibrarySongsList } from './LibrarySongsList';
import { LibraryPlaylistsView } from './LibraryPlaylistsView';
import { LibraryWorkspacesView } from './LibraryWorkspacesView';
import { LibraryHistoryView } from './LibraryHistoryView';
import { Music2, ListMusic, FolderOpen, Clock } from 'lucide-react';

type LibraryTab = 'songs' | 'playlists' | 'workspaces' | 'history';

interface LibraryViewProps {
  // Track data
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  
  // Library data
  playlists: Playlist[];
  workspaces: Workspace[];
  history: HistoryEntry[];
  likedTrackIds: string[];
  
  // Track actions
  onPlay: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  
  // Playlist actions
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: (name: string, track?: Track) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onUpdatePlaylist?: (playlistId: string, updates: Partial<Playlist>) => void;
  
  // Workspace actions
  onMoveToWorkspace: (track: Track, workspaceId: string) => void;
  onCreateWorkspace: (name: string, track?: Track) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onUpdateWorkspace?: (workspaceId: string, updates: Partial<Workspace>) => void;
  
  // Like actions
  onToggleLike: (track: Track) => void;
  
  // Other actions
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
}

const tabs: { id: LibraryTab; label: string; icon: typeof Music2 }[] = [
  { id: 'songs', label: 'Songs', icon: Music2 },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'workspaces', label: 'Workspaces', icon: FolderOpen },
  { id: 'history', label: 'History', icon: Clock },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  playlists,
  workspaces,
  history,
  likedTrackIds,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylist,
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
  const [activeTab, setActiveTab] = useState<LibraryTab>('songs');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Helper to get tracks by IDs
  const getTracksByIds = (trackIds: string[]): Track[] => {
    return trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is Track => t !== undefined);
  };

  // Get history tracks with timestamps
  const historyTracks = history.map(entry => ({
    track: tracks.find(t => t.id === entry.trackId),
    playedAt: entry.playedAt,
  })).filter((h): h is { track: Track; playedAt: number } => h.track !== undefined);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-3xl font-bold text-white mb-6">Library</h1>
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedPlaylistId(null);
                setSelectedWorkspaceId(null);
              }}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all
                border-b-2 -mb-px
                ${activeTab === tab.id
                  ? 'text-white border-primary'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-white/20'
                }
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'songs' && (
          <LibrarySongsList
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            playlists={playlists}
            workspaces={workspaces}
            onPlay={onPlay}
            onDelete={onDelete}
            onAddToPlaylist={onAddToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
            onMoveToWorkspace={onMoveToWorkspace}
            onCreateWorkspace={onCreateWorkspace}
            onToggleLike={onToggleLike}
            onAddToQueue={onAddToQueue}
            onShowDetails={onShowDetails}
            onDownload={onDownload}
            onShare={onShare}
          />
        )}

        {activeTab === 'playlists' && (
          <LibraryPlaylistsView
            playlists={playlists}
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            workspaces={workspaces}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={setSelectedPlaylistId}
            onPlay={onPlay}
            onDelete={onDelete}
            onAddToPlaylist={onAddToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
            onDeletePlaylist={onDeletePlaylist}
            onUpdatePlaylist={onUpdatePlaylist}
            onMoveToWorkspace={onMoveToWorkspace}
            onCreateWorkspace={onCreateWorkspace}
            onToggleLike={onToggleLike}
            onAddToQueue={onAddToQueue}
            onShowDetails={onShowDetails}
            onDownload={onDownload}
            onShare={onShare}
          />
        )}

        {activeTab === 'workspaces' && (
          <LibraryWorkspacesView
            workspaces={workspaces}
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            playlists={playlists}
            selectedWorkspaceId={selectedWorkspaceId}
            onSelectWorkspace={setSelectedWorkspaceId}
            onPlay={onPlay}
            onDelete={onDelete}
            onAddToPlaylist={onAddToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
            onMoveToWorkspace={onMoveToWorkspace}
            onCreateWorkspace={onCreateWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            onUpdateWorkspace={onUpdateWorkspace}
            onToggleLike={onToggleLike}
            onAddToQueue={onAddToQueue}
            onShowDetails={onShowDetails}
            onDownload={onDownload}
            onShare={onShare}
          />
        )}

        {activeTab === 'history' && (
          <LibraryHistoryView
            historyTracks={historyTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            playlists={playlists}
            workspaces={workspaces}
            onPlay={onPlay}
            onDelete={onDelete}
            onAddToPlaylist={onAddToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
            onMoveToWorkspace={onMoveToWorkspace}
            onCreateWorkspace={onCreateWorkspace}
            onToggleLike={onToggleLike}
            onAddToQueue={onAddToQueue}
            onShowDetails={onShowDetails}
            onDownload={onDownload}
            onShare={onShare}
          />
        )}
      </div>
    </div>
  );
};

