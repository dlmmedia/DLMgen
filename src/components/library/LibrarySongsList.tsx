import React, { useState, useMemo } from 'react';
import { Track, Playlist, Workspace } from '../../types';
import { LibrarySongRow } from './LibrarySongRow';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown,
  ArrowUpDown,
  Heart,
  Globe,
  Upload,
  X
} from 'lucide-react';

type SortOption = 'newest' | 'oldest' | 'title' | 'artist';
type FilterOption = 'all' | 'liked' | 'public' | 'uploads';

interface LibrarySongsListProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  playlists: Playlist[];
  workspaces: Workspace[];
  
  // Track actions
  onPlay: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: (name: string, track?: Track) => void;
  onMoveToWorkspace: (track: Track, workspaceId: string) => void;
  onCreateWorkspace: (name: string, track?: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
}

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'title', label: 'Title A-Z' },
  { id: 'artist', label: 'Artist A-Z' },
];

const filterOptions: { id: FilterOption; label: string; icon: typeof Heart }[] = [
  { id: 'liked', label: 'Liked', icon: Heart },
  { id: 'public', label: 'Public', icon: Globe },
  { id: 'uploads', label: 'Uploads', icon: Upload },
];

export const LibrarySongsList: React.FC<LibrarySongsListProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  playlists,
  workspaces,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onCreatePlaylist,
  onMoveToWorkspace,
  onCreateWorkspace,
  onToggleLike,
  onAddToQueue,
  onShowDetails,
  onDownload,
  onShare,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        track =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query) ||
          track.genre.toLowerCase().includes(query) ||
          track.styleTags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply active filters
    if (activeFilters.includes('liked')) {
      result = result.filter(track => likedTrackIds.includes(track.id));
    }
    // Note: 'public' and 'uploads' filters would require additional track metadata

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'oldest':
        result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'artist':
        result.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
    }

    return result;
  }, [tracks, searchQuery, sortBy, activeFilters, likedTrackIds]);

  const toggleFilter = (filter: FilterOption) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filters Bar */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-200 dark:border-white/5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFiltersDropdown(!showFiltersDropdown);
              setShowSortDropdown(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilters.length > 0
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/30 rounded text-xs">
                {activeFilters.length}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFiltersDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showFiltersDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFiltersDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleFilter(option.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      activeFilters.includes(option.id)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <option.icon size={14} />
                    <span>{option.label}</span>
                    {activeFilters.includes(option.id) && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSortDropdown(!showSortDropdown);
              setShowFiltersDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowUpDown size={16} />
            <span>{sortOptions.find(o => o.id === sortBy)?.label}</span>
            <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSortBy(option.id);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      sortBy === option.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.id && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Clear Filters */}
        {(activeFilters.length > 0 || searchQuery) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 text-sm text-gray-500">
        {filteredTracks.length} {filteredTracks.length === 1 ? 'song' : 'songs'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Songs List */}
      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Search size={24} className="text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No songs found</h3>
            <p className="text-sm text-gray-500 max-w-md">
              {searchQuery
                ? `No songs match "${searchQuery}". Try a different search term.`
                : activeFilters.length > 0
                ? 'No songs match your current filters.'
                : 'Start creating music to see your songs here!'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {filteredTracks.map((track) => (
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
    </div>
  );
};
