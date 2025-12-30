import { GoogleGenAI } from "@google/genai";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LyricsGenerationParams {
  concept: string;
  genre?: string;
  style?: string;
  mood?: string;
  language?: string;
  structureTemplate?: string;
  perspective?: 'first person' | 'second person' | 'third person';
  storyType?: 'literal story' | 'emotional journey' | 'conversation' | 'abstract imagery' | string;
  allowExplicit?: boolean;
  targetBpm?: number;
  // Enhanced controls
  vocabularyComplexity?: number; // 0-100: simple to poetic
  metaphorDensity?: number; // 0-100: literal to abstract
  emotionalIntensity?: number; // 0-100: subtle to powerful
  rhymeStrictness?: number; // 0-100: free verse to strict
}

export interface LyricsGenerationResult {
  lyrics: string;
  suggestedTitle: string;
  metadata: ParsedLyricsMetadata;
}

export interface ParsedLyricsMetadata {
  title?: string;
  style?: string;
  bpm?: number;
  structureTemplate?: string;
  language?: string;
  mood?: string;
}

export interface LineAnalysis {
  text: string;
  syllableCount: number;
  health: 'good' | 'warning' | 'bad';
  rhymeEnd?: string;
}

export interface LyricsAnalysis {
  lines: LineAnalysis[];
  totalSyllables: number;
  rhymeScheme: string;
  averageSyllablesPerLine: number;
}

// ============================================================================
// SUPPORTED LANGUAGES (50+)
// ============================================================================

export interface SupportedLanguage {
  code: string;
  name: string;
  native: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // Major World Languages
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  // European Languages
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu' },
  { code: 'et', name: 'Estonian', native: 'Eesti' },
  // Asian Languages
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'tl', name: 'Filipino', native: 'Filipino' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာ' },
  // Middle Eastern & African
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
  // Classical
  { code: 'la', name: 'Latin', native: 'Latina' },
];

// ============================================================================
// SYLLABLE COUNTING
// ============================================================================

/**
 * Count syllables in a word using vowel group detection
 * This is an approximation that works well for English and many Latin-based languages
 */
export function countSyllablesInWord(word: string): number {
  if (!word || word.length === 0) return 0;
  
  // Clean the word
  const cleanWord = word.toLowerCase().replace(/[^a-záéíóúàèìòùâêîôûäëïöüãõñ]/g, '');
  if (cleanWord.length === 0) return 0;
  
  // Special cases for common short words
  const specialCases: Record<string, number> = {
    'the': 1, 'a': 1, 'an': 1, 'i': 1, 'you': 1, 'we': 1, 'they': 1,
    'be': 1, 'are': 1, 'were': 1, 'been': 1, 'being': 2,
    'have': 1, 'has': 1, 'had': 1, 'having': 2,
    'do': 1, 'does': 1, 'did': 1, 'done': 1, 'doing': 2,
    'say': 1, 'says': 1, 'said': 1,
    'go': 1, 'goes': 1, 'went': 1, 'gone': 1, 'going': 2,
    'get': 1, 'gets': 1, 'got': 1, 'getting': 2,
    'make': 1, 'makes': 1, 'made': 1, 'making': 2,
    'know': 1, 'knows': 1, 'knew': 1, 'known': 1, 'knowing': 2,
    'think': 1, 'thinks': 1, 'thought': 1, 'thinking': 2,
    'take': 1, 'takes': 1, 'took': 1, 'taken': 2, 'taking': 2,
    'see': 1, 'sees': 1, 'saw': 1, 'seen': 1, 'seeing': 2,
    'come': 1, 'comes': 1, 'came': 1, 'coming': 2,
    'want': 1, 'wants': 1, 'wanted': 2, 'wanting': 2,
    'use': 1, 'uses': 2, 'used': 1, 'using': 2,
    'find': 1, 'finds': 1, 'found': 1, 'finding': 2,
    'give': 1, 'gives': 1, 'gave': 1, 'given': 2, 'giving': 2,
    'love': 1, 'loves': 1, 'loved': 1, 'loving': 2,
    'fire': 2, 'desire': 3, 'higher': 2, 'wire': 2,
    'real': 1, 'feel': 1, 'deal': 1, 'heal': 1,
    'world': 1, 'girl': 1, 'pearl': 1,
    'heart': 1, 'start': 1, 'part': 1, 'art': 1,
    'night': 1, 'light': 1, 'right': 1, 'fight': 1, 'bright': 1, 'sight': 1,
    'time': 1, 'rhyme': 1, 'climb': 1, 'prime': 1,
    'life': 1, 'wife': 1, 'knife': 1, 'strife': 1,
    'dream': 1, 'stream': 1, 'team': 1, 'cream': 1, 'gleam': 1,
    'rain': 1, 'pain': 1, 'gain': 1, 'main': 1, 'train': 1, 'brain': 1,
    'soul': 1, 'role': 1, 'goal': 1, 'whole': 1, 'control': 2,
    'blue': 1, 'true': 1, 'new': 1, 'few': 1, 'view': 1,
    'free': 1, 'tree': 1, 'key': 1, 'sea': 1, 'me': 1,
  };
  
  if (specialCases[cleanWord]) {
    return specialCases[cleanWord];
  }
  
  // Count vowel groups
  const vowels = 'aeiouyáéíóúàèìòùâêîôûäëïöüãõ';
  let count = 0;
  let prevWasVowel = false;
  
  for (let i = 0; i < cleanWord.length; i++) {
    const isVowel = vowels.includes(cleanWord[i]);
    if (isVowel && !prevWasVowel) {
      count++;
    }
    prevWasVowel = isVowel;
  }
  
  // Adjust for silent 'e' at end
  if (cleanWord.endsWith('e') && count > 1 && !cleanWord.endsWith('le')) {
    // Words like "make", "love", "time" have silent e
    const beforeE = cleanWord[cleanWord.length - 2];
    if (!vowels.includes(beforeE)) {
      count--;
    }
  }
  
  // Ensure at least 1 syllable
  return Math.max(1, count);
}

/**
 * Count syllables in a line of text
 */
export function countSyllablesInLine(line: string): number {
  // Remove section markers like [Verse], [Chorus], etc.
  const cleanLine = line.replace(/\[.*?\]/g, '').trim();
  if (!cleanLine) return 0;
  
  const words = cleanLine.split(/\s+/).filter(w => w.length > 0);
  return words.reduce((sum, word) => sum + countSyllablesInWord(word), 0);
}

/**
 * Determine line health based on syllable count
 * Ideal: 6-12 syllables for singability
 */
export function getLineHealth(syllableCount: number): 'good' | 'warning' | 'bad' {
  if (syllableCount === 0) return 'good'; // Empty or section header
  if (syllableCount >= 6 && syllableCount <= 12) return 'good';
  if (syllableCount >= 4 && syllableCount <= 16) return 'warning';
  return 'bad';
}

// ============================================================================
// RHYME DETECTION
// ============================================================================

/**
 * Extract the rhyming portion of a word (last vowel sound + everything after)
 */
export function getRhymeEnd(word: string): string {
  if (!word) return '';
  
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanWord.length === 0) return '';
  
  const vowels = 'aeiouy';
  let lastVowelIndex = -1;
  
  // Find the last vowel
  for (let i = cleanWord.length - 1; i >= 0; i--) {
    if (vowels.includes(cleanWord[i])) {
      lastVowelIndex = i;
      break;
    }
  }
  
  if (lastVowelIndex === -1) {
    return cleanWord.slice(-2);
  }
  
  return cleanWord.slice(lastVowelIndex);
}

/**
 * Check if two words rhyme
 */
export function doWordsRhyme(word1: string, word2: string): boolean {
  const rhyme1 = getRhymeEnd(word1);
  const rhyme2 = getRhymeEnd(word2);
  
  if (rhyme1.length < 2 || rhyme2.length < 2) return false;
  
  return rhyme1 === rhyme2;
}

/**
 * Detect rhyme scheme from lyrics (e.g., "ABAB", "AABB")
 */
export function detectRhymeScheme(lyrics: string): string {
  const lines = lyrics
    .split('\n')
    .map(l => l.replace(/\[.*?\]/g, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('['));
  
  if (lines.length === 0) return '';
  
  const rhymeEnds: string[] = [];
  const rhymeMap: Record<string, string> = {};
  let currentLetter = 'A';
  const scheme: string[] = [];
  
  for (const line of lines) {
    const words = line.split(/\s+/);
    const lastWord = words[words.length - 1];
    const rhymeEnd = getRhymeEnd(lastWord);
    
    // Check if this rhyme end matches any previous
    let found = false;
    for (const [existingRhyme, letter] of Object.entries(rhymeMap)) {
      if (existingRhyme === rhymeEnd || doWordsRhyme(lastWord, existingRhyme)) {
        scheme.push(letter);
        found = true;
        break;
      }
    }
    
    if (!found) {
      rhymeMap[rhymeEnd] = currentLetter;
      scheme.push(currentLetter);
      currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
      if (currentLetter > 'Z') currentLetter = 'A'; // Wrap around
    }
  }
  
  // Return first 8 characters of scheme for display
  return scheme.slice(0, 8).join('');
}

// ============================================================================
// FULL LYRICS ANALYSIS
// ============================================================================

/**
 * Analyze lyrics for syllables, rhyme scheme, and line health
 */
export function analyzeLyrics(lyrics: string): LyricsAnalysis {
  const lines = lyrics.split('\n');
  const analyzedLines: LineAnalysis[] = [];
  let totalSyllables = 0;
  
  for (const line of lines) {
    const cleanLine = line.replace(/\[.*?\]/g, '').trim();
    const syllableCount = countSyllablesInLine(line);
    const words = cleanLine.split(/\s+/).filter(w => w.length > 0);
    const lastWord = words[words.length - 1] || '';
    
    analyzedLines.push({
      text: line,
      syllableCount,
      health: getLineHealth(syllableCount),
      rhymeEnd: getRhymeEnd(lastWord),
    });
    
    totalSyllables += syllableCount;
  }
  
  const nonEmptyLines = analyzedLines.filter(l => l.syllableCount > 0);
  const averageSyllables = nonEmptyLines.length > 0
    ? Math.round(totalSyllables / nonEmptyLines.length)
    : 0;
  
  return {
    lines: analyzedLines,
    totalSyllables,
    rhymeScheme: detectRhymeScheme(lyrics),
    averageSyllablesPerLine: averageSyllables,
  };
}

// ============================================================================
// API KEY RESOLUTION
// ============================================================================

const resolveApiKey = (): string => {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  return (
    metaEnv.VITE_GEMINI_API_KEY ||
    metaEnv.VITE_API_KEY ||
    metaEnv.GEMINI_API_KEY ||
    metaEnv.API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
    (typeof process !== 'undefined' ? process.env?.API_KEY : '') ||
    ''
  );
};

// ============================================================================
// LYRICS GENERATION
// ============================================================================

const SYSTEM_PROMPT = `
You are an expert AI songwriter, lyricist, and narrative composer.
Generate fully structured, original, singable song lyrics for modern AI music APIs (Suno, Eleven Music).

STRICT RULES:
- Output lyrics only — no commentary or explanation.
- Start with metadata tags (Title, Genre, Style, Language, Mood, Target BPM, Structure Template).
- Use clear section labels in brackets, matching the requested structure order only.
- Maintain consistent rhyme, syllable flow, and theme.
- Chorus lines: ~6–12 syllables. Verse lines: ~8–14. Bridge lines: ~8–14 with contrast.
- Keep lyrics clean unless explicit mode is requested.
- Use poetic devices appropriate to the genre and story type.
- Follow the narrative perspective requested (first/second/third person).
- Verses expand the narrative, chorus reinforces the hook, bridge pivots or transforms, outro resolves.
- Performance cues (if any) must be outside sung lines, not inside lyrics.
- Do not reference existing songs or copyrighted text.
- Generate lyrics in the specified language with appropriate cultural style.
- The Title MUST be creative, evocative, and fitting for the theme.
`;

const DEFAULT_STRUCTURE = 'Intro → Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus → Outro';

/**
 * Get vocabulary complexity instruction based on slider value
 */
function getVocabularyInstruction(complexity: number): string {
  if (complexity < 25) {
    return 'Use simple, everyday vocabulary that anyone can understand. Avoid complex words.';
  } else if (complexity < 50) {
    return 'Use accessible vocabulary with occasional expressive words.';
  } else if (complexity < 75) {
    return 'Use rich vocabulary with poetic expressions and evocative language.';
  } else {
    return 'Use sophisticated, poetic vocabulary. Include literary devices, unusual word choices, and elegant phrasing.';
  }
}

/**
 * Get metaphor density instruction based on slider value
 */
function getMetaphorInstruction(density: number): string {
  if (density < 25) {
    return 'Keep imagery literal and direct. Describe things as they are.';
  } else if (density < 50) {
    return 'Use occasional metaphors and similes to enhance meaning.';
  } else if (density < 75) {
    return 'Use rich metaphorical language. Paint vivid pictures with words.';
  } else {
    return 'Create abstract, symbolic imagery throughout. Every verse should contain layered meanings and poetic metaphors.';
  }
}

/**
 * Get emotional intensity instruction based on slider value
 */
function getEmotionalInstruction(intensity: number): string {
  if (intensity < 25) {
    return 'Keep emotions subtle and understated. Hint at feelings rather than stating them.';
  } else if (intensity < 50) {
    return 'Express emotions naturally with moderate intensity.';
  } else if (intensity < 75) {
    return 'Express emotions strongly. Let feelings come through powerfully in the lyrics.';
  } else {
    return 'Maximum emotional intensity. Raw, powerful, heart-wrenching or euphoric expressions. No holding back.';
  }
}

/**
 * Get rhyme strictness instruction based on slider value
 */
function getRhymeInstruction(strictness: number): string {
  if (strictness < 25) {
    return 'Free verse is acceptable. Rhymes are optional.';
  } else if (strictness < 50) {
    return 'Use loose rhyme schemes. Some lines should rhyme, but flexibility is allowed.';
  } else if (strictness < 75) {
    return 'Maintain consistent rhyme schemes throughout (ABAB or AABB patterns).';
  } else {
    return 'Strict rhyming required. Every line must participate in a clear rhyme scheme. Perfect rhymes preferred.';
  }
}

export async function generateStructuredLyrics(params: LyricsGenerationParams): Promise<string> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Set VITE_GEMINI_API_KEY (frontend) or GEMINI_API_KEY/API_KEY (server).');
  }

  const ai = new GoogleGenAI({ apiKey });
  const structure = params.structureTemplate || DEFAULT_STRUCTURE;
  const perspective = params.perspective || 'first person';
  const storyType = params.storyType || 'emotional journey';
  const mood = params.mood || 'Hopeful';
  const language = params.language || 'English';
  const genre = params.genre || 'Pop';
  const style = params.style || 'Modern pop';
  const bpm = params.targetBpm ? `${params.targetBpm}` : 'Auto';
  const explicit = params.allowExplicit ? 'Explicit allowed' : 'Clean only';

  // Enhanced controls
  const vocabInstruction = getVocabularyInstruction(params.vocabularyComplexity ?? 50);
  const metaphorInstruction = getMetaphorInstruction(params.metaphorDensity ?? 50);
  const emotionalInstruction = getEmotionalInstruction(params.emotionalIntensity ?? 50);
  const rhymeInstruction = getRhymeInstruction(params.rhymeStrictness ?? 50);

  const userPrompt = `
Write complete lyrics following the strict rules.
Use this structure exactly: ${structure}

Concept/Theme: ${params.concept}
Genre: ${genre}
Style/Vibe: ${style}
Mood: ${mood}
Language: ${language}
Perspective: ${perspective}
Story type: ${storyType}
Target BPM: ${bpm}
Content rating: ${explicit}

Style Instructions:
- ${vocabInstruction}
- ${metaphorInstruction}
- ${emotionalInstruction}
- ${rhymeInstruction}

Reminder:
- Begin with metadata tags including a creative [Title: ...] tag.
- Keep line syllables within the ranges (6-12 for chorus, 8-14 for verses).
- No explanations—lyrics only.
- Write in ${language} language.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'text/plain',
        temperature: 0.9,
      },
    });

    const text = response.text?.trim();
    if (text) return text;
  } catch (error) {
    console.error('Lyrics generation failed, using fallback:', error);
  }

  return buildFallbackLyrics({
    concept: params.concept,
    genre,
    style,
    mood,
    language,
    structureTemplate: structure,
    perspective,
    targetBpm: params.targetBpm,
  });
}

/**
 * Generate lyrics and return with parsed metadata including suggested title
 */
export async function generateLyricsWithTitle(params: LyricsGenerationParams): Promise<LyricsGenerationResult> {
  const lyrics = await generateStructuredLyrics(params);
  const metadata = parseLyricsMetadata(lyrics);
  
  return {
    lyrics,
    suggestedTitle: metadata.title || generateFallbackTitle(params.concept),
    metadata,
  };
}

/**
 * Generate a fallback title from concept
 */
function generateFallbackTitle(concept: string): string {
  if (!concept) return 'Untitled';
  
  // Take first few meaningful words and capitalize
  const words = concept
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3);
  
  if (words.length === 0) return 'Untitled';
  
  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// FALLBACK LYRICS BUILDER - Dynamic & Creative
// ============================================================================

interface FallbackParams {
  concept: string;
  genre: string;
  style: string;
  mood: string;
  language: string;
  structureTemplate: string;
  perspective: string;
  targetBpm?: number;
}

// Themed lyric templates for different moods
interface LyricTheme {
  verses: string[][];
  choruses: string[][];
  bridges: string[][];
  intros: string[][];
  outros: string[][];
}

// Extract meaningful keywords from a concept/prompt
function extractKeywords(concept: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'about', 'with', 'for', 'and', 'or',
    'but', 'in', 'on', 'at', 'to', 'from', 'by', 'of', 'that', 'this',
    'it', 'its', 'song', 'make', 'create', 'write', 'generate'
  ]);
  
  return concept
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

// Generate a creative title from concept
export function generateCreativeTitle(concept: string, mood?: string): string {
  const keywords = extractKeywords(concept);
  
  const titlePatterns = [
    (kw: string[]) => kw.length > 0 ? `${capitalize(kw[0])} Dreams` : 'Infinite Dreams',
    (kw: string[]) => kw.length > 1 ? `${capitalize(kw[0])} & ${capitalize(kw[1])}` : 'Hearts Collide',
    (kw: string[]) => kw.length > 0 ? `Chasing ${capitalize(kw[0])}` : 'Chasing Stars',
    (kw: string[]) => kw.length > 0 ? `The ${capitalize(kw[0])} Within` : 'The Fire Within',
    (kw: string[]) => kw.length > 0 ? `${capitalize(kw[0])} Rising` : 'Phoenix Rising',
    (kw: string[]) => kw.length > 1 ? `Where ${capitalize(kw[0])} Meets ${capitalize(kw[1])}` : 'Where Shadows Meet',
    (kw: string[]) => kw.length > 0 ? `Echoes of ${capitalize(kw[0])}` : 'Echoes of Tomorrow',
    (kw: string[]) => kw.length > 0 ? `${capitalize(kw[0])} Tonight` : 'Alive Tonight',
    (kw: string[]) => kw.length > 0 ? `Beyond ${capitalize(kw[0])}` : 'Beyond the Horizon',
    (kw: string[]) => kw.length > 0 ? `${capitalize(kw[0])} in Motion` : 'Hearts in Motion',
  ];
  
  const moodTitles: Record<string, string[]> = {
    'Hopeful': ['New Beginnings', 'Brighter Days', 'Rise Again', 'Tomorrow Waits'],
    'Dark': ['Shadows Fall', 'Midnight Echoes', 'Into the Abyss', 'Fading Light'],
    'Romantic': ['Heartstrings', 'Forever Yours', 'Love Unspoken', 'Two Hearts'],
    'Melancholic': ['Tears of Rain', 'Fading Memories', 'Silent Goodbye', 'Empty Rooms'],
    'Empowering': ['Unstoppable', 'Rise Up', 'Breaking Chains', 'Fearless'],
    'Nostalgic': ['Golden Days', 'Remember When', 'Traces of You', 'Distant Summers'],
    'Euphoric': ['Electric Skies', 'Infinite Bliss', 'Wild and Free', 'On Top of the World'],
  };
  
  // Try mood-based title first
  if (mood && moodTitles[mood]) {
    const moodOptions = moodTitles[mood];
    return moodOptions[Math.floor(Math.random() * moodOptions.length)];
  }
  
  // Use pattern-based title with keywords
  const pattern = titlePatterns[Math.floor(Math.random() * titlePatterns.length)];
  return pattern(keywords);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Themed lyrics collections
const LYRIC_THEMES: Record<string, LyricTheme> = {
  hopeful: {
    verses: [
      [
        'Every sunrise brings a chance to start again',
        'Leaving yesterday behind like an old friend',
        'Through the storm I find my way back home',
        'Never walking through this world alone',
      ],
      [
        'I can feel the change coming like the spring',
        'Open arms to catch whatever life may bring',
        'Every scar becomes a story I can tell',
        'Rising from the ashes where I fell',
      ],
      [
        'Dawn is breaking through the clouds above',
        'Finding strength in every moment made of love',
        'Step by step I climb a little higher',
        'Fueled by faith and burning bright like fire',
      ],
    ],
    choruses: [
      [
        'We rise, we fall, we stand again',
        'Stronger than we were back then',
        'This is our moment, our time to shine',
        'The future is yours and mine',
      ],
      [
        'Hold on, the best is yet to come',
        'We are warriors, we are one',
        'Through the darkness, find the light',
        'Everything will be alright',
      ],
    ],
    bridges: [
      [
        'When the world feels heavy on your shoulders',
        'Remember you were made to move the boulders',
        'Take my hand and we will face the unknown',
        'Together we are never on our own',
      ],
    ],
    intros: [
      ['Breathe in deep, a brand new day awaits', 'Open your eyes to infinite space'],
      ['The horizon calls with golden light', 'A promise whispered through the night'],
    ],
    outros: [
      ['And so we carry on, forever strong', 'This is where we both belong'],
      ['The journey never ends, just begins anew', 'I believe in me, I believe in you'],
    ],
  },
  romantic: {
    verses: [
      [
        'Your eyes tell stories words could never say',
        'In your arms is where I want to stay',
        'Every heartbeat syncs to your melody',
        'You are everything I need to be free',
      ],
      [
        'Time stands still when I am next to you',
        'Colors seem more vivid, skies more blue',
        'In this chaos you became my peace',
        'With every touch my doubts release',
      ],
      [
        'Written in the stars before we met',
        'A love story I could never forget',
        'Your laughter echoes through my soul',
        'With you beside me I am whole',
      ],
    ],
    choruses: [
      [
        'You are my always, my forever',
        'Through every storm and sunny weather',
        'Hand in hand, heart to heart',
        'Nothing could tear us apart',
      ],
      [
        'Fall into love with me tonight',
        'Hold me close until the morning light',
        'Every moment spent with you',
        'Makes my wildest dreams come true',
      ],
    ],
    bridges: [
      [
        'I never knew what love could mean',
        'Until you showed me things unseen',
        'Now every song reminds me of your face',
        'You are my shelter, my saving grace',
      ],
    ],
    intros: [
      ['Soft whispers in the evening air', 'Searching for you everywhere'],
      ['Hearts colliding like the tide', 'No more reason left to hide'],
    ],
    outros: [
      ['Forever yours until the end of time', 'Your heart entwined so close to mine'],
      ['Love like ours will never fade away', 'I choose you every single day'],
    ],
  },
  melancholic: {
    verses: [
      [
        'Empty halls where laughter used to ring',
        'Photographs of summers past still sting',
        'Memories painted in shades of grey',
        'Wishing things had gone another way',
      ],
      [
        'Rain falls down like tears upon the glass',
        'Holding on to moments that have passed',
        'Silent rooms echo with your name',
        'Nothing here will ever be the same',
      ],
      [
        'I trace the lines of what we used to be',
        'A ghost of love that haunts my memory',
        'Windows fog with every heavy sigh',
        'Still searching for the reason why',
      ],
    ],
    choruses: [
      [
        'I am lost without your guiding light',
        'Wandering through this endless night',
        'Broken pieces scattered on the floor',
        'Not sure who I am anymore',
      ],
      [
        'These empty spaces where you used to stand',
        'Slip like water through my trembling hands',
        'Every sunset paints a lonely view',
        'Everything reminds me of you',
      ],
    ],
    bridges: [
      [
        'Maybe someday I will understand',
        'Why fate had other things planned',
        'Until then I will carry this weight',
        'Learning to accept my fate',
      ],
    ],
    intros: [
      ['Another night without your warmth', 'Counting stars from here up north'],
      ['Silence speaks the loudest here', 'Echoes of a vanished year'],
    ],
    outros: [
      ['Goodbye is just a word we say', 'But in my heart you always stay'],
      ['Fading out like evening sun', 'The story ends before begun'],
    ],
  },
  empowering: {
    verses: [
      [
        'They said I could not make it on my own',
        'But look at how much stronger I have grown',
        'Every obstacle became a stepping stone',
        'Building my kingdom, claiming my throne',
      ],
      [
        'Breaking barriers they tried to set in place',
        'Running this marathon at my own pace',
        'Voices of doubt fade into the crowd',
        'Standing tall, speaking clear and loud',
      ],
      [
        'Fire in my veins, thunder in my chest',
        'I was born to conquer every test',
        'No more hiding in the shadow of fear',
        'My purpose finally crystal clear',
      ],
    ],
    choruses: [
      [
        'I am unstoppable, I am unbreakable',
        'Every limit now is shakeable',
        'Watch me rise above the noise',
        'I have found my voice',
      ],
      [
        'Nothing can hold me down',
        'I wear my scars like a crown',
        'Born to lead, made to fight',
        'Shining through the darkest night',
      ],
    ],
    bridges: [
      [
        'They threw me in the fire but I did not burn',
        'Every lesson that life taught I had to learn',
        'Phoenix from the ashes, diamond from the coal',
        'Unbreakable spirit, unconquerable soul',
      ],
    ],
    intros: [
      ['Feel the power surging through my veins', 'Breaking free from all these chains'],
      ['This is my moment, this is my time', 'Every mountain I will climb'],
    ],
    outros: [
      ['Nothing can stop me now I am free', 'I became who I was meant to be'],
      ['The battle is won but the war carries on', 'I will keep fighting until I am gone'],
    ],
  },
  energetic: {
    verses: [
      [
        'Bass is pumping, feel it in your chest',
        'Tonight we party harder than the rest',
        'Hands up high, let go of all control',
        'Music takes over body, mind, and soul',
      ],
      [
        'Dancing through the chaos, feeling so alive',
        'This is what it means to truly thrive',
        'Speakers blasting, crowd is going wild',
        'Let your inner spirit run like a child',
      ],
      [
        'Adrenaline rushing, heart is beating fast',
        'Living in the moment, making memories last',
        'Jump into the rhythm, feel the groove',
        'Nothing left to prove, just move',
      ],
    ],
    choruses: [
      [
        'Turn it up, let the music take control',
        'Feel the beat deep down in your soul',
        'Tonight we dance until the break of dawn',
        'Keep it going, keep it going on',
      ],
      [
        'Lose yourself in the sound',
        'Feet off the ground',
        'This is our anthem, our battle cry',
        'Reaching for the sky',
      ],
    ],
    bridges: [
      [
        'Drop the beat and watch the crowd explode',
        'Energy electric, ready to download',
        'Every single person feeling the vibe',
        'This is our tribe, this is our tribe',
      ],
    ],
    intros: [
      ['Three, two, one, here we go', 'Ready for the show'],
      ['Feel the energy rise', 'Fire in our eyes'],
    ],
    outros: [
      ['The night is young and so are we', 'Living wild, living free'],
      ['Until the sun comes up again', 'This party never ends'],
    ],
  },
};

// Map moods to theme keys
function getMoodTheme(mood: string): string {
  const moodMap: Record<string, string> = {
    'Hopeful': 'hopeful',
    'Dark': 'melancholic',
    'Romantic': 'romantic',
    'Melancholic': 'melancholic',
    'Empowering': 'empowering',
    'Nostalgic': 'melancholic',
    'Euphoric': 'energetic',
  };
  return moodMap[mood] || 'hopeful';
}

// Pick a random item from an array
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Track used indices to avoid repetition within a song
interface UsedIndices {
  verses: Set<number>;
  choruses: Set<number>;
  bridges: Set<number>;
  intros: Set<number>;
  outros: Set<number>;
}

function pickUniqueRandom<T>(arr: T[], used: Set<number>): { item: T; index: number } {
  const available = arr.map((item, idx) => ({ item, idx })).filter(({ idx }) => !used.has(idx));
  if (available.length === 0) {
    // Reset if all used
    used.clear();
    const idx = Math.floor(Math.random() * arr.length);
    return { item: arr[idx], index: idx };
  }
  const choice = available[Math.floor(Math.random() * available.length)];
  return { item: choice.item, index: choice.idx };
}

// Personalize lyrics by inserting concept keywords
function personalizeLyrics(lines: string[], keywords: string[]): string[] {
  if (keywords.length === 0) return lines;
  
  // Substitution patterns
  const substitutions: Record<string, string[]> = {
    'love': ['passion', 'devotion', 'affection', 'desire'],
    'heart': ['soul', 'spirit', 'being', 'core'],
    'night': ['evening', 'dusk', 'twilight', 'darkness'],
    'light': ['glow', 'radiance', 'shine', 'brightness'],
    'dream': ['vision', 'aspiration', 'hope', 'fantasy'],
    'fire': ['flame', 'blaze', 'spark', 'inferno'],
    'sky': ['heavens', 'cosmos', 'atmosphere', 'expanse'],
    'rain': ['storm', 'downpour', 'showers', 'tempest'],
  };
  
  return lines.map(line => {
    // 30% chance to personalize a line with a keyword
    if (Math.random() < 0.3 && keywords.length > 0) {
      const keyword = capitalize(pickRandom(keywords));
      // Replace generic words with keywords where it makes sense
      if (line.includes('world')) {
        return line.replace('world', keyword.toLowerCase());
      }
      if (line.includes('life')) {
        return line.replace('life', keyword.toLowerCase());
      }
    }
    return line;
  });
}

export function buildFallbackLyrics(params: FallbackParams): string {
  const structureParts = params.structureTemplate.split('→').map(part => part.trim()).filter(Boolean);
  const keywords = extractKeywords(params.concept);
  const title = generateCreativeTitle(params.concept, params.mood);
  const themeKey = getMoodTheme(params.mood);
  const theme = LYRIC_THEMES[themeKey] || LYRIC_THEMES.hopeful;
  
  const tagBlock = [
    `[Title: ${title}]`,
    `[Genre: ${params.genre}]`,
    `[Style: ${params.style}]`,
    `[Language: ${params.language}]`,
    `[Mood: ${params.mood}]`,
    `[Target BPM: ${params.targetBpm ?? 'Auto'}]`,
    `[Structure Template: ${params.structureTemplate}]`,
  ].join('\n');

  // Track used sections to avoid repetition
  const used: UsedIndices = {
    verses: new Set(),
    choruses: new Set(),
    bridges: new Set(),
    intros: new Set(),
    outros: new Set(),
  };

  const sections: string[] = [];
  
  for (const section of structureParts) {
    const key = section.toLowerCase();
    let lines: string[];
    
    if (key.startsWith('intro')) {
      const { item, index } = pickUniqueRandom(theme.intros, used.intros);
      used.intros.add(index);
      lines = personalizeLyrics([...item], keywords);
    } else if (key.startsWith('verse')) {
      const { item, index } = pickUniqueRandom(theme.verses, used.verses);
      used.verses.add(index);
      lines = personalizeLyrics([...item], keywords);
    } else if (key.startsWith('chorus') || key.startsWith('hook')) {
      const { item, index } = pickUniqueRandom(theme.choruses, used.choruses);
      used.choruses.add(index);
      lines = personalizeLyrics([...item], keywords);
    } else if (key.startsWith('bridge')) {
      const { item, index } = pickUniqueRandom(theme.bridges, used.bridges);
      used.bridges.add(index);
      lines = personalizeLyrics([...item], keywords);
    } else if (key.startsWith('outro')) {
      const { item, index } = pickUniqueRandom(theme.outros, used.outros);
      used.outros.add(index);
      lines = personalizeLyrics([...item], keywords);
    } else {
      // Default to verse
      const { item, index } = pickUniqueRandom(theme.verses, used.verses);
      used.verses.add(index);
      lines = personalizeLyrics([...item], keywords);
    }
    
    sections.push(`[${section}]\n${lines.join('\n')}`);
  }

  return `${tagBlock}\n\n${sections.join('\n\n')}`.trim();
}

// ============================================================================
// METADATA PARSING
// ============================================================================

export function parseLyricsMetadata(text: string): ParsedLyricsMetadata {
  const getTag = (key: string) => {
    const match = text.match(new RegExp(`\\[${key}:\\s*([^\\]]+)\\]`, 'i'));
    return match?.[1]?.trim();
  };

  const bpmRaw = getTag('Target BPM');
  const bpmValue = bpmRaw ? parseInt(bpmRaw, 10) : undefined;
  const bpm = bpmValue !== undefined && !Number.isNaN(bpmValue) ? bpmValue : undefined;

  return {
    title: getTag('Title'),
    style: getTag('Style'),
    bpm,
    structureTemplate: getTag('Structure Template'),
    language: getTag('Language'),
    mood: getTag('Mood'),
  };
}

// ============================================================================
// RHYME SUGGESTIONS
// ============================================================================

/**
 * Common rhyme endings for suggestions
 */
const RHYME_FAMILIES: Record<string, string[]> = {
  'ight': ['night', 'light', 'right', 'fight', 'sight', 'bright', 'flight', 'might', 'tight', 'white'],
  'ove': ['love', 'above', 'dove', 'shove', 'glove'],
  'ain': ['rain', 'pain', 'gain', 'train', 'brain', 'main', 'chain', 'plain', 'strain', 'vain'],
  'eart': ['heart', 'start', 'part', 'art', 'smart', 'chart', 'dart'],
  'oul': ['soul', 'goal', 'role', 'whole', 'control', 'roll', 'toll'],
  'ire': ['fire', 'desire', 'higher', 'wire', 'inspire', 'tire'],
  'eam': ['dream', 'stream', 'team', 'cream', 'gleam', 'beam', 'seem', 'scheme'],
  'ay': ['day', 'way', 'say', 'stay', 'play', 'away', 'today', 'display', 'delay'],
  'ine': ['time', 'rhyme', 'climb', 'prime', 'sublime', 'crime', 'dime'],
  'ue': ['blue', 'true', 'new', 'view', 'through', 'few', 'knew', 'flew'],
  'ee': ['free', 'me', 'be', 'see', 'key', 'tree', 'sea', 'agree', 'decree'],
  'ow': ['know', 'go', 'show', 'flow', 'glow', 'grow', 'slow', 'blow', 'throw'],
};

/**
 * Suggest rhyming words for a given word
 */
export function suggestRhymes(word: string, limit: number = 5): string[] {
  const rhymeEnd = getRhymeEnd(word);
  
  for (const [ending, words] of Object.entries(RHYME_FAMILIES)) {
    if (rhymeEnd.endsWith(ending) || ending.endsWith(rhymeEnd)) {
      return words.filter(w => w !== word.toLowerCase()).slice(0, limit);
    }
  }
  
  // Fallback: find words with similar ending
  const allWords = Object.values(RHYME_FAMILIES).flat();
  return allWords
    .filter(w => getRhymeEnd(w) === rhymeEnd && w !== word.toLowerCase())
    .slice(0, limit);
}
