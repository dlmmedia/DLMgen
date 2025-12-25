import React from 'react';
import { Home, Compass, Library, Heart, Radio, ListMusic, User, PlusCircle } from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen }) => {
    const mainMenu = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'create', label: 'Create', icon: PlusCircle },
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'library', label: 'Library', icon: Library },
    ];

    const libraryMenu = [
        { id: 'liked', label: 'Liked Songs', icon: Heart },
        { id: 'recent', label: 'Recently Played', icon: Radio },
    ];

    const playlists = [
        { id: 'ambient', label: 'Ambient Vibes', icon: ListMusic },
        { id: 'edm', label: 'EDM Bangers', icon: ListMusic },
        { id: 'rock', label: 'Rock Classics', icon: ListMusic },
    ];

    return (
        <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-white/5 transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col h-full
    `}>
            <div className="p-6">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
                        <Radio className="text-white" size={18} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        DLM Gen
                    </h1>
                </div>
            </div>

            <div className="px-4 py-2 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Main Menu */}
                <div>
                    <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Menu</div>
                    <div className="space-y-1">
                        {mainMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                              ${activeTab === item.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={18} className={activeTab === item.id ? 'text-primary' : 'group-hover:text-white transition-colors'} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Library */}
                <div>
                    <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Library</div>
                    <div className="space-y-1">
                        {libraryMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Genres/Playlists */}
                <div>
                    <div className="flex items-center justify-between px-4 mb-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Genres</div>
                        <PlusCircle size={14} className="text-gray-500 hover:text-white cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                        {playlists.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                             ${activeTab === item.id
                                        ? 'bg-white/5 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                        <User size={18} className="text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">Guest User</div>
                        <div className="text-xs text-gray-500 truncate">Premium Plan</div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
