import React, { useState, useMemo, useCallback } from 'react';
import { 
  Mic, Music, Sparkles, Wand2, Disc, Clock, Globe, 
  ChevronDown, Folder, Music2, Plus, X
} from 'lucide-react';
import { CreateSongParams, VocalStyle } from '../types';
import { GenerationLoader } from './GenerationLoader';
import { CollapsibleSection } from './ui/CollapsibleSection';
import { TickSlider } from './ui/TickSlider';
import { 
  SUPPORTED_LANGUAGES, 
  generateLyricsWithTitle,
  analyzeLyrics,
  countSyllablesInLine,
  getLineHealth,
  LyricsGenerationParams
} from '../services/lyricsSystem';

interface CreateFormProps {
  onSubmit: (params: CreateSongParams) => void;
  isGenerating: boolean;
  hideLoader?: boolean;
}

// Duration options in seconds
const DURATION_OPTIONS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
];

// Quick genre buttons
const GENRE_BUTTONS = [
  'rock song',
  'classical instrumental',
  'hip hop beat',
  'jazz ballad',
  'electronic dance',
  'ambient soundscape',
  'pop anthem',
  'r&b groove',
];

// Structure options for lyrics generation
const STRUCTURE_OPTIONS = [
  'Intro → Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus → Outro',
  'Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus',
  'Verse → Chorus → Verse → Chorus → Outro',
];

const MOODS = ['Hopeful', 'Dark', 'Romantic', 'Melancholic', 'Empowering', 'Nostalgic', 'Euphoric'];

// Version options
const VERSION_OPTIONS = [
  { value: 'v10', label: 'v10', description: 'Latest model with enhanced quality' },
  { value: 'v9.5', label: 'v9.5', description: 'Balanced quality and speed' },
  { value: 'v9', label: 'v9', description: 'Classic stable model' },
];

export const CreateForm: React.FC<CreateFormProps> = ({ onSubmit, isGenerating, hideLoader = false }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Custom mode states
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Advanced parameters
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [vocalStyle, setVocalStyle] = useState<VocalStyle>('auto');
  const [bpm, setBpm] = useState<number | undefined>(undefined);
  const [keySignature, setKeySignature] = useState<string>('');
  
  // New slider parameters
  const [creativity, setCreativity] = useState(50);
  const [energy, setEnergy] = useState(50);
  const [excludeStyles, setExcludeStyles] = useState('');

  // Lyrics generation states
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [showLyricsConfig, setShowLyricsConfig] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  
  // Lyrics generation config
  const [lyricsConcept, setLyricsConcept] = useState('');
  const [lyricsMood, setLyricsMood] = useState('Hopeful');
  const [lyricsStructure, setLyricsStructure] = useState(STRUCTURE_OPTIONS[0]);

  // Version selector
  const [selectedVersion, setSelectedVersion] = useState('v10');
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  // Workspace
  const [workspaces, setWorkspaces] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dlm_workspaces');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['My Workspace'];
  });
  const [selectedWorkspace, setSelectedWorkspace] = useState(() => {
    try {
      return localStorage.getItem('dlm_selected_workspace') || 'My Workspace';
    } catch (e) {}
    return 'My Workspace';
  });
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showNewWorkspaceInput, setShowNewWorkspaceInput] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Save workspaces to localStorage
  const saveWorkspaces = (ws: string[]) => {
    setWorkspaces(ws);
    try {
      localStorage.setItem('dlm_workspaces', JSON.stringify(ws));
    } catch (e) {}
  };

  const handleSelectWorkspace = (ws: string) => {
    setSelectedWorkspace(ws);
    setShowWorkspaceDropdown(false);
    try {
      localStorage.setItem('dlm_selected_workspace', ws);
    } catch (e) {}
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    const name = newWorkspaceName.trim();
    if (!workspaces.includes(name)) {
      const updated = [...workspaces, name];
      saveWorkspaces(updated);
      handleSelectWorkspace(name);
    }
    setNewWorkspaceName('');
    setShowNewWorkspaceInput(false);
  };

  const handleDeleteWorkspace = (ws: string) => {
    if (workspaces.length <= 1) return; // Keep at least one
    const updated = workspaces.filter(w => w !== ws);
    saveWorkspaces(updated);
    if (selectedWorkspace === ws) {
      handleSelectWorkspace(updated[0]);
    }
  };

  // Get current language
  const currentLanguage = useMemo(() => 
    SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0],
    [selectedLanguage]
  );

  // Analyze lyrics in real-time
  const lyricsAnalysis = useMemo(() => {
    if (!lyrics.trim()) return null;
    return analyzeLyrics(lyrics);
  }, [lyrics]);

  // Generate random lyrics
  const handleGenerateLyrics = useCallback(async (useConfig: boolean = false) => {
    if (isGeneratingLyrics) return;
    
    setIsGeneratingLyrics(true);
    setLyricsError(null);

    const concept = useConfig && lyricsConcept.trim() 
      ? lyricsConcept 
      : style || prompt || 'a meaningful song about life and dreams';

    const params: LyricsGenerationParams = {
      concept,
      genre: style.split(',')[0]?.trim() || 'Pop',
      style: style || 'Modern',
      mood: lyricsMood,
      language: currentLanguage.name,
      structureTemplate: lyricsStructure,
      perspective: 'first person',
      storyType: 'emotional journey',
    };

    try {
      const result = await generateLyricsWithTitle(params);
      setLyrics(result.lyrics);
      
      // Auto-populate title if empty
      if (!title && result.suggestedTitle) {
        setTitle(result.suggestedTitle);
      }
      
      setIsInstrumental(false);
      setShowLyricsConfig(false);
    } catch (err) {
      console.error('Lyrics generation failed:', err);
      setLyricsError(err instanceof Error ? err.message : 'Failed to generate lyrics');
    } finally {
      setIsGeneratingLyrics(false);
    }
  }, [isGeneratingLyrics, lyricsConcept, style, prompt, lyricsMood, currentLanguage, lyricsStructure, title]);

  const inspirationTags = [
    "Cyberpunk Action", "Lo-Fi Study", "Epic Orchestral",
    "Dark Techno", "Acoustic Ballad", "Synthwave Drive"
  ];

  const handleSubmit = () => {
    if ((!isCustom && !prompt) || (isCustom && !lyrics && !isInstrumental && !style)) return;

    onSubmit({
      prompt: isCustom ? '' : prompt,
      isCustom,
      customLyrics: lyrics,
      customStyle: style,
      customTitle: title,
      isInstrumental,
      durationSeconds,
      vocalStyle: isInstrumental ? 'auto' : vocalStyle,
      bpm,
      keySignature: keySignature || undefined,
      lyrics: isCustom ? lyrics : undefined,
      style: isCustom ? style : undefined,
      title: isCustom ? title : undefined,
      creativity,
      energy,
      excludeStyles: excludeStyles || undefined,
      language: currentLanguage.name,
    });
  };

  if (isGenerating && !hideLoader) {
    return <GenerationLoader />;
  }

  // Render syllable indicator for a line
  const renderSyllableIndicator = (line: string, index: number) => {
    if (line.startsWith('[') || !line.trim()) return null;
    const count = countSyllablesInLine(line);
    const health = getLineHealth(count);
    
    return (
      <span 
        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          health === 'good' ? 'bg-green-500/20 text-green-400' :
          health === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}
      >
        {count}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-surface backdrop-blur-sm border border-gray-200 dark:border-white/5 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-gradient-to-b from-gray-100 dark:from-white/5 to-transparent border-b border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Credits badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10">
              <Music2 size={14} className="text-primary" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">3.9k</span>
            </div>

            {/* Simple/Custom Toggle */}
            <div className="flex bg-gray-200 dark:bg-black/40 p-1 rounded-xl border border-gray-300 dark:border-white/5">
              <button
                onClick={() => setIsCustom(false)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  !isCustom ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setIsCustom(true)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isCustom ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Version Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVersionDropdown(!showVersionDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedVersion}</span>
              <ChevronDown size={14} className={`text-gray-500 dark:text-gray-400 transition-transform ${showVersionDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showVersionDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-black/95 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {VERSION_OPTIONS.map(version => (
                  <button
                    key={version.value}
                    type="button"
                    onClick={() => {
                      setSelectedVersion(version.value);
                      setShowVersionDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${
                      version.value === selectedVersion ? 'bg-primary/10 dark:bg-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${version.value === selectedVersion ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                        {version.label}
                      </span>
                      {version.value === selectedVersion && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{version.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
        {isCustom ? (
          // CUSTOM MODE
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Lyrics Section */}
            <CollapsibleSection
              title="Lyrics"
              icon={<Mic size={14} />}
              defaultOpen={true}
              headerRight={
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition-colors"
                  >
                    <Globe size={12} className="text-primary" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{currentLanguage.native}</span>
                    <ChevronDown size={10} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  
                  {showLanguageDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-56 max-h-64 overflow-y-auto bg-white dark:bg-black/95 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 custom-scrollbar">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center justify-between ${
                            lang.code === selectedLanguage ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span>{lang.name}</span>
                          <span className="text-xs text-gray-500">{lang.native}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              }
            >
              {!isInstrumental ? (
                <div className="space-y-3">
                  {/* Main textarea */}
                  <div className="relative">
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Write some lyrics or a prompt — or leave blank for instrumental"
                      className="w-full h-40 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none font-mono leading-relaxed"
                    />
                    
                    {/* Action buttons */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      {/* Quick Generate Button */}
                      <button
                        type="button"
                        onClick={() => handleGenerateLyrics(false)}
                        disabled={isGeneratingLyrics}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/20 hover:bg-primary/30 rounded-lg border border-primary/30 transition-colors disabled:opacity-50"
                        title="Generate lyrics"
                      >
                        <Sparkles size={12} className={`text-primary ${isGeneratingLyrics ? 'animate-spin' : ''}`} />
                        <span className="text-xs text-primary font-medium">
                          {isGeneratingLyrics ? '...' : 'Generate'}
                        </span>
                      </button>
                      
                      {/* Config button */}
                      <button
                        type="button"
                        onClick={() => setShowLyricsConfig(!showLyricsConfig)}
                        className={`p-2 rounded-lg transition-colors ${
                          showLyricsConfig 
                            ? 'bg-primary/20 border border-primary/30' 
                            : 'bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20'
                        }`}
                        title="Advanced generation settings"
                      >
                        <Wand2 size={14} className="text-primary" />
                      </button>
                    </div>
                  </div>

                  {/* Syllable analysis */}
                  {lyricsAnalysis && lyricsAnalysis.totalSyllables > 0 && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Total: <span className="text-gray-900 dark:text-white font-mono">{lyricsAnalysis.totalSyllables}</span> syllables</span>
                      <span>Avg: <span className="text-gray-900 dark:text-white font-mono">{lyricsAnalysis.averageSyllablesPerLine}</span>/line</span>
                      {lyricsAnalysis.rhymeScheme && (
                        <span>Rhyme: <span className="text-primary font-mono">{lyricsAnalysis.rhymeScheme}</span></span>
                      )}
                    </div>
                  )}

                  {/* Lyrics config panel */}
                  {showLyricsConfig && (
                    <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Generation Settings</span>
                        <button
                          type="button"
                          onClick={() => setShowLyricsConfig(false)}
                          className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <input
                        value={lyricsConcept}
                        onChange={(e) => setLyricsConcept(e.target.value)}
                        placeholder="Concept or theme (e.g., 'love in a neon city')"
                        className="w-full bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50"
                      />

                      <div className="flex flex-wrap gap-2">
                        {MOODS.map(mood => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setLyricsMood(mood)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              lyricsMood === mood
                                ? 'bg-primary/20 border-primary/50 text-primary'
                                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateLyrics(true)}
                        disabled={isGeneratingLyrics}
                        className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isGeneratingLyrics ? 'Generating...' : 'Generate with Settings'}
                      </button>
                    </div>
                  )}

                  {lyricsError && (
                    <div className="text-xs text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/40 rounded-lg px-3 py-2">
                      {lyricsError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-100 dark:bg-black/20 border border-dashed border-gray-300 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center">
                    <Music className="text-gray-400 dark:text-gray-600" />
                  </div>
                  <span className="text-sm">Instrumental track enabled</span>
                </div>
              )}
            </CollapsibleSection>

            {/* Styles Section */}
            <CollapsibleSection
              title="Styles"
              icon={<Disc size={14} />}
              defaultOpen={true}
            >
              <div className="space-y-3">
                <textarea
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="jazzy, tough, soundscapes, dubstep rock, atmospheric rock"
                  className="w-full h-20 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-all resize-none"
                />
                
                <div className="flex flex-wrap gap-2">
                  {GENRE_BUTTONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setStyle(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5 hover:border-primary/30 transition-all flex items-center gap-1"
                    >
                      <span className="text-primary">+</span> {tag}
                    </button>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            {/* Advanced Options Section */}
            <CollapsibleSection
              title="Advanced Options"
              icon={<Wand2 size={14} />}
              defaultOpen={false}
            >
              <div className="space-y-4">
                {/* Instrumental Toggle */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-primary" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Instrumental</span>
                    <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 cursor-help" title="Generate music without vocals">
                      i
                    </div>
                  </div>
                  <div
                    onClick={() => setIsInstrumental(!isInstrumental)}
                    className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      isInstrumental ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      isInstrumental ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>

                {/* Exclude styles */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">🚫</span>
                    <input
                      value={excludeStyles}
                      onChange={(e) => setExcludeStyles(e.target.value)}
                      placeholder="Exclude styles"
                      className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Vocal Gender - Simple toggle */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Vocal Gender</span>
                    <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 cursor-help" title="Choose the vocal gender for the song">
                      i
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-200 dark:bg-black/40 rounded-lg p-1 border border-gray-300 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setVocalStyle('male')}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        vocalStyle === 'male' 
                          ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setVocalStyle('female')}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        vocalStyle === 'female' 
                          ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Lyrics Mode - Simple toggle */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Lyrics Mode</span>
                    <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 cursor-help" title="Manual: write your own. Auto: AI generates from style">
                      i
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-200 dark:bg-black/40 rounded-lg p-1 border border-gray-300 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {/* Manual mode - already default */}}
                      className="px-3 py-1 rounded text-sm bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateLyrics(false)}
                      className="px-3 py-1 rounded text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* Creativity Slider */}
                <TickSlider
                  label="Creativity"
                  value={creativity}
                  onChange={setCreativity}
                  infoTooltip="Low = conventional sound, High = experimental"
                />

                {/* Energy Slider */}
                <TickSlider
                  label="Energy"
                  value={energy}
                  onChange={setEnergy}
                  infoTooltip="Low = chill/mellow, High = intense/driving"
                />

                {/* Duration */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Clock size={12} className="text-primary" /> Duration
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDurationSeconds(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          durationSeconds === opt.value
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BPM & Key */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tempo (BPM)</label>
                    <input
                      type="number"
                      value={bpm || ''}
                      onChange={(e) => setBpm(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 120"
                      min={60}
                      max={200}
                      className="w-full bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Key Signature</label>
                    <select
                      value={keySignature}
                      onChange={(e) => setKeySignature(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="">Auto</option>
                      <option value="C major">C Major</option>
                      <option value="G major">G Major</option>
                      <option value="D major">D Major</option>
                      <option value="A major">A Major</option>
                      <option value="E major">E Major</option>
                      <option value="F major">F Major</option>
                      <option value="A minor">A Minor</option>
                      <option value="E minor">E Minor</option>
                      <option value="D minor">D Minor</option>
                      <option value="B minor">B Minor</option>
                    </select>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Song Title */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl">
              <Music2 size={16} className="text-primary" />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song Title (Optional)"
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            {/* Save to Workspace */}
            <div className="relative">
              <div 
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Folder size={16} className="text-primary" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Save to...</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{selectedWorkspace}</span>
                  <ChevronDown size={14} className={`text-gray-500 dark:text-gray-400 transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {showWorkspaceDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-black/95 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {workspaces.map(ws => (
                      <div
                        key={ws}
                        className={`group flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                          ws === selectedWorkspace ? 'bg-primary/10 dark:bg-primary/20' : ''
                        }`}
                        onClick={() => handleSelectWorkspace(ws)}
                      >
                        <div className="flex items-center gap-2">
                          <Folder size={14} className={ws === selectedWorkspace ? 'text-primary' : 'text-gray-500 dark:text-gray-400'} />
                          <span className={`text-sm ${ws === selectedWorkspace ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                            {ws}
                          </span>
                        </div>
                        {workspaces.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkspace(ws);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-all"
                            title="Delete workspace"
                          >
                            <X size={12} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Create new workspace */}
                  <div className="border-t border-gray-200 dark:border-white/10">
                    {showNewWorkspaceInput ? (
                      <div className="p-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                          placeholder="Workspace name..."
                          className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                          autoFocus
                        />
                        <button
                          onClick={handleCreateWorkspace}
                          disabled={!newWorkspaceName.trim()}
                          className="px-3 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowNewWorkspaceInput(false);
                            setNewWorkspaceName('');
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <X size={14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewWorkspaceInput(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Create new workspace</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // SIMPLE MODE
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A sad song about a robot who falls in love with a toaster..."
                  className="w-full h-48 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none leading-relaxed"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/80 dark:bg-black/60 backdrop-blur-md p-1 rounded-lg border border-gray-200 dark:border-white/10">
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 font-medium">Instrumental</span>
                  <div
                    onClick={() => setIsInstrumental(!isInstrumental)}
                    className={`w-9 h-5 rounded-full p-1 cursor-pointer transition-colors ${
                      isInstrumental ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                      isInstrumental ? 'translate-x-4' : 'translate-x-0'
                    }`} />
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
                    className="px-4 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-primary/30 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all text-left flex items-center justify-between group"
                  >
                    {tag}
                    <Sparkles size={10} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Duration for Simple Mode */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDurationSeconds(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      durationSeconds === opt.value
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-gradient-to-b from-transparent to-gray-100 dark:from-surface dark:to-surface backdrop-blur-xl sticky bottom-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">DLM-{selectedVersion.toUpperCase()} Music Model</span>
          </div>
          <span className="text-xs text-gray-500 font-mono">120 Credits</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={(!isCustom && !prompt) || isGenerating}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99]
            ${((!isCustom && !prompt) || isGenerating)
              ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary via-red-700 to-red-900 dark:to-black hover:shadow-[0_0_30px_rgba(153,27,27,0.4)]'
            }
          `}
        >
          <Music2 className="w-5 h-5" />
          <span>Create</span>
        </button>
      </div>
    </div>
  );
};
