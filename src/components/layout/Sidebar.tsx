import React, { useState } from 'react';
import { Home, Compass, Library, Heart, Radio, ListMusic, User, PlusCircle, X, Music, Sun, Moon } from 'lucide-react';
import { AnimatedLogo } from '../AnimatedLogo';
import { Playlist } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen: boolean;
    isPlaying?: boolean;
    analyser?: AnalyserNode | null;
    // Synced playlists from App state
    playlists?: Playlist[];
    onCreatePlaylist?: (name: string) => void;
    onDeletePlaylist?: (playlistId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    activeTab, 
    setActiveTab, 
    isOpen, 
    isPlaying, 
    analyser,
    playlists = [],
    onCreatePlaylist,
    onDeletePlaylist,
}) => {
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const { theme, toggleTheme, isDark } = useTheme();

    const mainMenu = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'create', label: 'Create', icon: PlusCircle },
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'library', label: 'Library', icon: Library },
    ];

    const libraryQuickLinks = [
        { id: 'liked', label: 'Liked Songs', icon: Heart },
        { id: 'recent', label: 'Recently Played', icon: Radio },
    ];

    const genrePlaylists = [
        { id: 'ambient', label: 'Ambient Vibes', icon: ListMusic },
        { id: 'edm', label: 'EDM Bangers', icon: ListMusic },
        { id: 'rock', label: 'Rock Classics', icon: ListMusic },
    ];

    const handleCreatePlaylist = () => {
        if (!newPlaylistName.trim()) return;
        
        if (onCreatePlaylist) {
            onCreatePlaylist(newPlaylistName.trim());
        }
        setNewPlaylistName('');
        setShowPlaylistModal(false);
    };

    const handleDeletePlaylist = (playlistId: string) => {
        if (onDeletePlaylist) {
            onDeletePlaylist(playlistId);
        }
        if (activeTab === playlistId) {
            setActiveTab('library');
        }
    };

    return (
        <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-gray-100 dark:bg-sidebar border-r border-gray-200 dark:border-white/5 transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col h-full
    `}>
            <div className="p-6">
                <div className="flex items-center gap-2 px-2">
                    <AnimatedLogo isPlaying={isPlaying || false} analyser={analyser} />
                    <h1
                        className="text-xl font-bold tracking-tight bg-clip-text text-transparent flex flex-wrap font-mono"
                        style={{
                            backgroundImage: isDark 
                                ? 'linear-gradient(90deg, rgba(255, 255, 255, 1) 44%, rgba(255, 0, 0, 1) 100%)'
                                : 'linear-gradient(90deg, rgba(23, 23, 23, 1) 44%, rgba(255, 0, 0, 1) 100%)',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent'
                        }}
                    >
                        DLM Gen
                    </h1>
                </div>
            </div>

            <div className="px-4 py-2 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Main Menu */}
                <div>
                    <div className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Menu</div>
                    <div className="space-y-1">
                        {mainMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                              ${activeTab === item.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={18} className={activeTab === item.id ? 'text-primary' : 'group-hover:text-gray-900 dark:group-hover:text-white transition-colors'} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <div className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Your Library</div>
                    <div className="space-y-1">
                        {libraryQuickLinks.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab('library')}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all"
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Genre Playlists */}
                <div>
                    <div className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Genres</div>
                    <div className="space-y-1">
                        {genrePlaylists.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                              ${activeTab === item.id
                                        ? 'bg-gray-200 dark:bg-white/5 text-gray-900 dark:text-white'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* User Playlists */}
                <div>
                    <div className="flex items-center justify-between px-4 mb-2">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Playlists</div>
                        <button
                            onClick={() => setShowPlaylistModal(true)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            title="Create new playlist"
                        >
                            <PlusCircle size={14} className="text-gray-500 hover:text-primary" />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {playlists.length === 0 ? (
                            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-600">
                                No playlists yet
                            </div>
                        ) : (
                            playlists.map(playlist => (
                                <div
                                    key={playlist.id}
                                    className="group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5"
                                    onClick={() => setActiveTab('library')}
                                >
                                    <ListMusic size={18} />
                                    <span className="flex-1 truncate">{playlist.name}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-600">{playlist.trackIds.length}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePlaylist(playlist.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 dark:hover:bg-white/10 rounded transition-all"
                                        title="Delete playlist"
                                    >
                                        <X size={12} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* User Footer with Theme Toggle */}
            <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between p-3 mb-3 rounded-lg bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 transition-colors group"
                    title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                    <div className="flex items-center gap-3">
                        {isDark ? (
                            <Sun size={18} className="text-amber-500" />
                        ) : (
                            <Moon size={18} className="text-indigo-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </div>
                    <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isDark ? 'bg-gray-600' : 'bg-primary'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isDark ? 'translate-x-0' : 'translate-x-5'}`} />
                    </div>
                </button>

                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-300 dark:from-gray-700 to-gray-200 dark:to-gray-600 flex items-center justify-center border border-gray-300 dark:border-white/10 group-hover:border-primary/50 transition-colors">
                        <User size={18} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Guest User</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 truncate">Premium Plan</div>
                    </div>
                </div>
            </div>

            {/* Create Playlist Modal */}
            {showPlaylistModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-80 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Music size={16} className="text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Playlist</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPlaylistModal(false);
                                    setNewPlaylistName('');
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={18} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        
                        <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                            placeholder="Playlist name..."
                            className="w-full bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 mb-4"
                            autoFocus
                        />
                        
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowPlaylistModal(false);
                                    setNewPlaylistName('');
                                }}
                                className="flex-1 py-2.5 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
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
        </aside>
    );
};
