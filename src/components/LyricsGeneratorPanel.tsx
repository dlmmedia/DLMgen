import React, { useEffect, useState } from 'react';
import { Sparkles, NotebookPen, Wand2, Clipboard, ClipboardCheck, Clock, Languages, Radio } from 'lucide-react';
import { generateStructuredLyrics, LyricsGenerationParams, parseLyricsMetadata, ParsedLyricsMetadata } from '../services/lyricsSystem';

interface LyricsGeneratorPanelProps {
  onApply: (lyrics: string, meta?: ParsedLyricsMetadata) => void;
  disabled?: boolean;
  defaultStyle?: string;
}

const STRUCTURE_OPTIONS = [
  'Intro → Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus → Outro',
  'Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus',
  'Verse → Chorus → Verse → Chorus → Outro',
];

const PERSPECTIVES = ['first person', 'second person', 'third person'];
const STORY_TYPES = ['emotional journey', 'literal story', 'conversation', 'abstract imagery'];
const MOODS = ['Hopeful', 'Dark', 'Romantic', 'Melancholic', 'Empowering'];

export const LyricsGeneratorPanel: React.FC<LyricsGeneratorPanelProps> = ({ onApply, disabled, defaultStyle }) => {
  const [concept, setConcept] = useState('');
  const [genre, setGenre] = useState('Electro Pop');
  const [style, setStyle] = useState(defaultStyle || 'Synthwave / modern pop');
  const [mood, setMood] = useState('Hopeful');
  const [language, setLanguage] = useState('English');
  const [structureTemplate, setStructureTemplate] = useState(STRUCTURE_OPTIONS[0]);
  const [perspective, setPerspective] = useState<typeof PERSPECTIVES[number]>('first person');
  const [storyType, setStoryType] = useState<typeof STORY_TYPES[number]>('emotional journey');
  const [targetBpm, setTargetBpm] = useState<string>('');
  const [lyrics, setLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultStyle && defaultStyle !== style) {
      setStyle(defaultStyle);
    }
  }, [defaultStyle, style]);

  const handleGenerate = async () => {
    if (!concept.trim() || disabled) return;
    setIsLoading(true);
    setCopied(false);
    setError(null);

    const params: LyricsGenerationParams = {
      concept: concept.trim(),
      genre,
      style,
      mood,
      language,
      structureTemplate,
      perspective,
      storyType,
      targetBpm: targetBpm ? parseInt(targetBpm, 10) : undefined,
    };

    try {
      const text = await generateStructuredLyrics(params);
      setLyrics(text);
    } catch (err) {
      console.error('Failed to generate lyrics', err);
      setError(err instanceof Error ? err.message : 'Failed to generate lyrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!lyrics) return;
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleApply = () => {
    if (!lyrics) return;
    const meta = parseLyricsMetadata(lyrics);
    onApply(lyrics, meta);
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Wand2 size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Lyrics System</p>
            <p className="text-xs text-gray-500">Structured lyrics tuned for Suno & Eleven Music</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full text-[11px] bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1">
          <Sparkles size={12} className="text-primary" />
          Song Narrative Builder
        </div>
      </div>

      {disabled && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
          Instrumental mode is on. Turn it off to generate lyrical sections.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-400 space-y-1">
          <span className="flex items-center gap-1 font-semibold text-gray-200">
            <NotebookPen size={12} className="text-primary" />
            Concept / story prompt
          </span>
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="A hopeful nocturnal duet about coded love in a neon city..."
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
            disabled={disabled}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400 space-y-1">
            <span className="flex items-center gap-1 font-semibold text-gray-200">
              <Radio size={12} className="text-primary" />
              Genre
            </span>
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
              disabled={disabled}
            />
          </label>
          <label className="text-xs text-gray-400 space-y-1">
            <span className="flex items-center gap-1 font-semibold text-gray-200">
              <Sparkles size={12} className="text-primary" />
              Style / vibe
            </span>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
              disabled={disabled}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-400 space-y-1">
          <span className="flex items-center gap-1 font-semibold text-gray-200">
            <Sparkles size={12} className="text-primary" />
            Structure
          </span>
          <div className="flex flex-wrap gap-2">
            {STRUCTURE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setStructureTemplate(opt)}
                type="button"
                disabled={disabled}
                className={`px-3 py-2 rounded-lg text-[11px] border transition-all ${structureTemplate === opt
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400 space-y-1">
            <span className="flex items-center gap-1 font-semibold text-gray-200">Perspective</span>
            <select
              value={perspective}
              onChange={(e) => setPerspective(e.target.value as typeof PERSPECTIVES[number])}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary/50"
              disabled={disabled}
            >
              {PERSPECTIVES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400 space-y-1">
            <span className="flex items-center gap-1 font-semibold text-gray-200">Story type</span>
            <select
              value={storyType}
              onChange={(e) => setStoryType(e.target.value as typeof STORY_TYPES[number])}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary/50"
              disabled={disabled}
            >
              {STORY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-xs text-gray-400 space-y-1">
          <span className="flex items-center gap-1 font-semibold text-gray-200">
            <Sparkles size={12} className="text-primary" />
            Mood
          </span>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setMood(opt)}
                disabled={disabled}
                className={`px-3 py-2 rounded-lg text-[11px] border transition-all ${mood === opt
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </label>

        <label className="text-xs text-gray-400 space-y-1">
          <span className="flex items-center gap-1 font-semibold text-gray-200">
            <Languages size={12} className="text-primary" />
            Language
          </span>
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
            disabled={disabled}
          />
        </label>

        <label className="text-xs text-gray-400 space-y-1">
          <span className="flex items-center gap-1 font-semibold text-gray-200">
            <Clock size={12} className="text-primary" />
            Target BPM (optional)
          </span>
          <input
            type="number"
            value={targetBpm}
            onChange={(e) => setTargetBpm(e.target.value)}
            placeholder="120"
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
            min={60}
            max={200}
            disabled={disabled}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || isLoading || !concept.trim()}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${disabled || !concept.trim()
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary via-red-700 to-black text-white hover:shadow-[0_0_20px_rgba(153,27,27,0.35)]'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Sparkles className="animate-spin" size={14} />
              Generating...
            </span>
          ) : (
            <>
              <Sparkles size={14} />
              Generate Lyrics
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleApply}
          disabled={!lyrics}
          className={`px-3 py-2 rounded-lg text-sm font-medium border ${lyrics
            ? 'border-primary/40 text-primary hover:bg-primary/10'
            : 'border-white/10 text-gray-500 cursor-not-allowed'
            }`}
        >
          Use in Custom
        </button>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!lyrics}
          className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${lyrics
            ? 'border-white/10 text-gray-300 hover:bg-white/5'
            : 'border-white/5 text-gray-600 cursor-not-allowed'
            }`}
        >
          {copied ? <ClipboardCheck size={14} className="text-green-400" /> : <Clipboard size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-3 min-h-[200px]">
        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2 mb-2">
            {error}
          </div>
        )}
        {lyrics ? (
          <pre className="whitespace-pre-wrap text-sm text-white font-mono leading-relaxed">{lyrics}</pre>
        ) : (
          <div className="text-xs text-gray-500 h-full flex items-center justify-center text-center px-6">
            Generate structured lyrics with metadata tags ready for Suno / Eleven Music, then drop them into your custom song.
          </div>
        )}
      </div>
    </div>
  );
};
