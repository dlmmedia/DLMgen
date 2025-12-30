import React, { useState, useEffect, useRef } from 'react';
import { Track, Playlist, Workspace } from '../../types';
import {
  Download,
  ListPlus,
  Plus,
  Info,
  Share2,
  Trash2,
  ChevronRight,
  Music2,
  Scissors,
  Sparkles,
  FolderInput,
  Globe,
  Image,
  Eye,
  Flag,
  Link,
  Twitter,
  Facebook,
  Copy,
  Check,
  X,
  FolderOpen,
} from 'lucide-react';

interface SongContextMenuProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  // Action handlers
  onAddToQueue?: (track: Track) => void;
  onAddToPlaylist?: (track: Track, playlistId: string) => void;
  onCreatePlaylist?: (name: string, track?: Track) => void;
  onMoveToWorkspace?: (track: Track, workspaceId: string) => void;
  onCreateWorkspace?: (name: string, track?: Track) => void;
  onShowDetails?: (track: Track) => void;
  onDownload?: (track: Track, format: 'mp3' | 'wav') => void;
  onShare?: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  // Data
  playlists?: Playlist[];
  workspaces?: Workspace[];
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  hasSubmenu?: boolean;
  danger?: boolean;
  children?: React.ReactNode;
  submenuPosition?: 'left' | 'right';
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  badge,
  hasSubmenu = false,
  danger = false,
  children,
  submenuPosition = 'right',
}) => {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse enter with immediate show
  const handleMouseEnter = () => {
    if (!hasSubmenu || disabled) return;
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowSubmenu(true);
  };

  // Handle mouse leave with delay to allow moving to submenu
  const handleMouseLeave = () => {
    if (!hasSubmenu) return;
    // Delay hiding to allow mouse to move to submenu
    hideTimeoutRef.current = setTimeout(() => {
      setShowSubmenu(false);
    }, 150);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle click for submenu items - also toggle on click for touch devices
  const handleClick = () => {
    if (disabled) return;
    if (hasSubmenu) {
      // Toggle submenu on click (for touch devices)
      setShowSubmenu(!showSubmenu);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
          ${disabled 
            ? 'opacity-40 cursor-not-allowed text-gray-500 dark:text-gray-400' 
            : danger 
              ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10' 
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
          }
        `}
      >
        <span className={`w-4 h-4 flex items-center justify-center ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {icon}
        </span>
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded">
            {badge}
          </span>
        )}
        {hasSubmenu && (
          <ChevronRight size={14} className={`text-gray-500 transition-transform ${showSubmenu ? 'rotate-90' : ''}`} />
        )}
      </button>
      
      {/* Submenu - position based on submenuPosition prop */}
      {hasSubmenu && showSubmenu && children && (
        <div 
          className={`
            absolute top-0 min-w-[200px] max-w-[280px] bg-white dark:bg-[#1a1a1a] 
            border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl overflow-hidden z-[60]
            ${submenuPosition === 'left' ? 'right-full mr-1' : 'left-full ml-1'}
          `}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const MenuDivider: React.FC = () => (
  <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
);

export const SongContextMenu: React.FC<SongContextMenuProps> = ({
  track,
  isOpen,
  onClose,
  position = 'right',
  onAddToQueue,
  onAddToPlaylist,
  onCreatePlaylist,
  onMoveToWorkspace,
  onCreateWorkspace,
  onShowDetails,
  onDownload,
  onShare,
  onDelete,
  playlists = [],
  workspaces = [],
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewWorkspaceInput, setShowNewWorkspaceInput] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Determine submenu position based on parent menu position
  // If menu opens left, submenus should also open left to prevent overflow
  const submenuPos = position === 'left' ? 'left' : 'right';

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset states when menu closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmDelete(false);
      setShowNewPlaylistInput(false);
      setNewPlaylistName('');
      setShowNewWorkspaceInput(false);
      setNewWorkspaceName('');
      setCopied(false);
    }
  }, [isOpen]);

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim() && onCreateWorkspace) {
      onCreateWorkspace(newWorkspaceName.trim(), track);
      setNewWorkspaceName('');
      setShowNewWorkspaceInput(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/track/${track.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim() && onCreatePlaylist) {
      onCreatePlaylist(newPlaylistName.trim(), track);
      setNewPlaylistName('');
      setShowNewPlaylistInput(false);
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirmDelete && onDelete) {
      onDelete(track.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Menu */}
      <div
        ref={menuRef}
        className={`
          absolute z-50 min-w-[220px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 
          rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl
          ${position === 'left' ? 'right-0' : 'left-0'}
          top-full mt-1
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Remix/Edit - Disabled */}
        <MenuItem
          icon={<Scissors size={14} />}
          label="Remix/Edit"
          hasSubmenu
          submenuPosition={submenuPos}
          disabled
        />

        {/* Create - Disabled */}
        <MenuItem
          icon={<Sparkles size={14} />}
          label="Create"
          hasSubmenu
          submenuPosition={submenuPos}
          disabled
        />

        {/* Get Stems - Pro */}
        <MenuItem
          icon={<Music2 size={14} />}
          label="Get Stems"
          badge="Pro"
          disabled
        />

        <MenuDivider />

        {/* Add to Queue */}
        <MenuItem
          icon={<ListPlus size={14} />}
          label="Add to Queue"
          onClick={() => {
            onAddToQueue?.(track);
            onClose();
          }}
        />

        {/* Add to Playlist */}
        <MenuItem
          icon={<Plus size={14} />}
          label="Add to Playlist"
          hasSubmenu
          submenuPosition={submenuPos}
        >
          <div className="py-1">
            {playlists.length > 0 ? (
              <>
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      onAddToPlaylist?.(track, playlist.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Music2 size={12} className="text-gray-500 dark:text-gray-400" />
                    <span className="truncate">{playlist.name}</span>
                  </button>
                ))}
                <MenuDivider />
              </>
            ) : null}
            
            {showNewPlaylistInput ? (
              <div className="p-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    placeholder="Playlist name"
                    className="flex-1 px-2 py-1.5 text-sm bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleCreatePlaylist}
                    className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewPlaylistInput(false);
                      setNewPlaylistName('');
                    }}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewPlaylistInput(true)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus size={12} />
                <span>Create New Playlist</span>
              </button>
            )}
          </div>
        </MenuItem>

        {/* Move to Workspace */}
        <MenuItem
          icon={<FolderInput size={14} />}
          label="Move to Workspace"
          hasSubmenu
          submenuPosition={submenuPos}
          disabled={!onMoveToWorkspace}
        >
          <div className="py-1">
            {workspaces.length > 0 ? (
              <>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      onMoveToWorkspace?.(track, workspace.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <FolderOpen size={12} className="text-gray-500 dark:text-gray-400" />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                ))}
                <MenuDivider />
              </>
            ) : null}
            
            {showNewWorkspaceInput ? (
              <div className="p-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    placeholder="Workspace name"
                    className="flex-1 px-2 py-1.5 text-sm bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateWorkspace}
                    className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewWorkspaceInput(false);
                      setNewWorkspaceName('');
                    }}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewWorkspaceInput(true)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus size={12} />
                <span>Create New Workspace</span>
              </button>
            )}
          </div>
        </MenuItem>

        <MenuDivider />

        {/* Publish - Disabled */}
        <MenuItem
          icon={<Globe size={14} />}
          label="Publish"
          disabled
        />

        {/* Song Details */}
        <MenuItem
          icon={<Info size={14} />}
          label="Song Details"
          onClick={() => {
            onShowDetails?.(track);
            onClose();
          }}
        />

        {/* Generate Cover Art - Disabled */}
        <MenuItem
          icon={<Image size={14} />}
          label="Generate Cover Art"
          disabled
        />

        {/* Visibility & Permissions - Disabled */}
        <MenuItem
          icon={<Eye size={14} />}
          label="Visibility & Permissions"
          hasSubmenu
          submenuPosition={submenuPos}
          disabled
        />

        <MenuDivider />

        {/* Share */}
        <MenuItem
          icon={<Share2 size={14} />}
          label="Share"
          hasSubmenu
          submenuPosition={submenuPos}
        >
          <div className="py-1">
            <button
              onClick={() => {
                handleCopyLink();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Link size={14} className="text-gray-500 dark:text-gray-400" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
            <button
              onClick={() => {
                onShare?.(track);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Copy size={14} className="text-gray-500 dark:text-gray-400" />
              <span>Share...</span>
            </button>
            <MenuDivider />
            <button
              onClick={() => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${track.title}" by ${track.artist}`)}`, '_blank');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Twitter size={14} className="text-gray-500 dark:text-gray-400" />
              <span>Twitter / X</span>
            </button>
            <button
              onClick={() => {
                window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(`Check out "${track.title}" by ${track.artist}`)}`, '_blank');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Facebook size={14} className="text-gray-500 dark:text-gray-400" />
              <span>Facebook</span>
            </button>
          </div>
        </MenuItem>

        {/* Download */}
        <MenuItem
          icon={<Download size={14} />}
          label="Download"
          hasSubmenu
          submenuPosition={submenuPos}
        >
          <div className="py-1">
            <button
              onClick={() => {
                onDownload?.(track, 'mp3');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Download size={14} className="text-gray-500 dark:text-gray-400" />
              <span>Download MP3</span>
            </button>
            <button
              onClick={() => {
                onDownload?.(track, 'wav');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors opacity-50"
            >
              <Download size={14} className="text-gray-500 dark:text-gray-400" />
              <span>Download WAV</span>
              <span className="ml-auto text-[10px] text-gray-500">Coming Soon</span>
            </button>
          </div>
        </MenuItem>

        <MenuDivider />

        {/* Report - Disabled */}
        <MenuItem
          icon={<Flag size={14} />}
          label="Report"
          hasSubmenu
          submenuPosition={submenuPos}
          disabled
        />

        {/* Move to Trash / Delete */}
        {confirmDelete ? (
          <div className="px-4 py-2 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Delete this track?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <MenuItem
            icon={<Trash2 size={14} />}
            label="Move to Trash"
            onClick={handleDelete}
            danger
          />
        )}
      </div>
    </>
  );
};
