import React, { useState } from 'react';
import { Mic, Music, Sparkles, Wand2, Disc, Layers } from 'lucide-react';
import { CreateSongParams } from '../types';
import { GenerationLoader } from './GenerationLoader';

interface CreateFormProps {
    onSubmit: (params: CreateSongParams) => void;
    isGenerating: boolean;
}

export const CreateForm: React.FC<CreateFormProps> = ({ onSubmit, isGenerating }) => {
    const [isCustom, setIsCustom] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isInstrumental, setIsInstrumental] = useState(false);

    // Custom mode states
    const [lyrics, setLyrics] = useState('');
    const [style, setStyle] = useState('');
    const [title, setTitle] = useState('');

    const inspirationTags = [
        "Cyberpunk Action", "Lo-Fi Study", "Epic Orchestral",
        "Dark Techno", "Acoustic Ballad", "Synthwave Drive"
    ];

    const handleSubmit = () => {
        if ((!isCustom && !prompt) || (isCustom && !lyrics && !isInstrumental && !style)) return;

        onSubmit({
            prompt: isCustom ? (style + " " + title) : prompt,
            isCustom,
            customLyrics: lyrics,
            customStyle: style,
            customTitle: title,
            isInstrumental
        });

        // Reset minimal fields (optional, maybe better to keep for iteration?)
        // if (!isCustom) setPrompt(''); 
    };

    if (isGenerating) {
        return <GenerationLoader />;
    }

    return (
        <div className="bg-surface/50 backdrop-blur-sm border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Header Toggle */}
            <div className="p-4 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Wand2 size={16} />
                        </div>
                        <h2 className="text-lg font-bold">Create Music</h2>
                    </div>

                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setIsCustom(false)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${!isCustom ? 'bg-primary text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:text-white'}`}
                        >
                            Simple
                        </button>
                        <button
                            onClick={() => setIsCustom(true)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${isCustom ? 'bg-primary text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:text-white'}`}
                        >
                            Custom
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isCustom ? (
                    // CUSTOM MODE
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Lyrics Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                    <Mic size={14} className="text-primary" /> Lyrics
                                </label>

                                <div
                                    onClick={() => setIsInstrumental(!isInstrumental)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all border ${isInstrumental ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Music size={12} />
                                    <span className="text-xs font-medium">Instrumental</span>
                                    <div className={`w-2 h-2 rounded-full ${isInstrumental ? 'bg-green-500' : 'bg-gray-600'}`} />
                                </div>
                            </div>

                            {!isInstrumental ? (
                                <div className="relative group">
                                    <textarea
                                        value={lyrics}
                                        onChange={(e) => setLyrics(e.target.value)}
                                        placeholder="Enter your own lyrics..."
                                        className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none font-mono leading-relaxed"
                                    />
                                    <button
                                        className="absolute bottom-4 right-4 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all opacity-0 group-hover:opacity-100"
                                        onClick={() => setLyrics("[Verse 1]\nNeon lights in the rain\nWalking down the memory lane\n\n[Chorus]\nDigital dreams, silent screams\nNothing is ever what it seems")}
                                    >
                                        <Sparkles size={12} className="text-primary" /> Make it Random
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full h-48 bg-black/20 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <Music className="text-gray-600" />
                                    </div>
                                    <span className="text-sm">Instrumental track enabled</span>
                                </div>
                            )}
                        </div>

                        {/* Style Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                <Disc size={14} className="text-primary" /> Musical Style
                            </label>
                            <textarea
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="Describe the style (e.g. 80s pop, upbeat, female vocals)..."
                                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none"
                            />
                            <div className="flex flex-wrap gap-2">
                                {['Electronic', 'Jazz', 'Rock', 'Lofi', 'Synthwave', 'Metal', 'Ambient'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setStyle(prev => prev ? `${prev}, ${tag}` : tag)}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 hover:text-primary hover:border-primary/30 rounded-full text-xs text-gray-400 border border-white/5 transition-all"
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                <Layers size={14} className="text-primary" /> Title
                            </label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Give it a name (optional)"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                        </div>
                    </div>
                ) : (
                    // SIMPLE MODE
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-300">Song Description</label>
                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="A sad song about a robot who falls in love with a toaster..."
                                    className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none leading-relaxed"
                                />
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
                                    <span className="text-xs text-gray-400 px-2 font-medium">Instrumental</span>
                                    <div
                                        onClick={() => setIsInstrumental(!isInstrumental)}
                                        className={`w-9 h-5 rounded-full p-1 cursor-pointer transition-colors ${isInstrumental ? 'bg-green-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isInstrumental ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inspiration</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {inspirationTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setPrompt(tag)}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 rounded-lg text-xs text-gray-400 hover:text-white transition-all text-left flex items-center justify-between group"
                                    >
                                        {tag}
                                        <Sparkles size={10} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/5 bg-gradient-to-b from-transparent to-black/40 backdrop-blur-xl sticky bottom-0 z-20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                        <span className="text-xs font-medium text-gray-300">V3.5 Model Active</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">120 Credits</span>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!isCustom && !prompt}
                    className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99]
                    ${(!isCustom && !prompt)
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-primary via-purple-600 to-blue-600 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]'
                        }
                `}
                >
                    <Sparkles className="w-5 h-5 fill-white/20" />
                    <span>Create Song</span>
                </button>
            </div>
        </div>
    );
};
