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
// FALLBACK LYRICS BUILDER
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

function buildFallbackLyrics(params: FallbackParams): string {
  const structureParts = params.structureTemplate.split('→').map(part => part.trim()).filter(Boolean);
  const title = `${params.concept ? params.concept.split(' ').slice(0, 3).join(' ') : 'Untitled'} Signal`.trim();
  const tagBlock = [
    `[Title: ${title}]`,
    `[Genre: ${params.genre}]`,
    `[Style: ${params.style}]`,
    `[Language: ${params.language}]`,
    `[Mood: ${params.mood}]`,
    `[Target BPM: ${params.targetBpm ?? 'Auto'}]`,
    `[Structure Template: ${params.structureTemplate}]`,
    `[Vocal Style: airy lead, layered harmonies]`,
    `[Delivery: emotive, breathy]`,
  ].join('\n');

  const motif = params.concept || 'neon night';
  const hook = 'we are signal in the glow';

  const sectionText = structureParts.map(section => formatSection(section, motif, hook)).join('\n\n');
  return `${tagBlock}\n\n${sectionText}`.trim();
}

function formatSection(section: string, motif: string, hook: string): string {
  const key = section.toLowerCase();

  const verseLines = [
    `I trace the city, ${motif} on repeat`,
    `Echoes turn to verses under streetlight heat`,
    `Every step a rhythm, every sign a clue`,
    `I keep the channel open just to call to you`,
  ];

  const chorusLines = [
    `Meet me where the skylines glow`,
    `${hook}`,
    `Hold the spark and let it show`,
    `Heartbeats sending radio`,
  ];

  const bridgeLines = [
    `If the dawn runs slow, we bend the time`,
    `Orbit on a promise, keep the rhyme`,
    `Gravity can wait, we take the climb`,
    `Signal to the stars that you are mine`,
  ];

  const introLines = [
    `Neon in my lungs, the evening flows`,
    `Footsteps in the hush where the current grows`,
  ];

  const outroLines = [
    `Neon fades but the hum stays in our chest`,
    `Promise holds the light while the night finds rest`,
  ];

  if (key.startsWith('intro')) return wrapSection(section, introLines);
  if (key.startsWith('verse')) return wrapSection(section, verseLines);
  if (key.startsWith('chorus') || key.startsWith('hook')) return wrapSection(section, chorusLines);
  if (key.startsWith('bridge')) return wrapSection(section, bridgeLines);
  if (key.startsWith('outro')) return wrapSection(section, outroLines);

  return wrapSection(section, verseLines);
}

const wrapSection = (label: string, lines: string[]) => `[${label}]\n${lines.join('\n')}`;

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
