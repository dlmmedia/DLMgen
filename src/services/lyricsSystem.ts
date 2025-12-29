import { GoogleGenAI } from "@google/genai";

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
}

const resolveApiKey = (): string => {
  // Prefer Vite-style env vars in the browser; fall back to Node-style for SSR/API contexts
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  return (
    metaEnv.VITE_GEMINI_API_KEY ||
    metaEnv.VITE_API_KEY ||
    metaEnv.GEMINI_API_KEY ||
    metaEnv.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  );
};

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
`;

const DEFAULT_STRUCTURE = 'Intro → Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus → Outro';

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

Reminder:
- Begin with metadata tags.
- Keep line syllables within the ranges.
- No explanations—lyrics only.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

interface FallbackParams extends LyricsGenerationParams {
  genre: string;
  style: string;
  mood: string;
  language: string;
  structureTemplate: string;
  perspective: string;
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

export interface ParsedLyricsMetadata {
  title?: string;
  style?: string;
  bpm?: number;
  structureTemplate?: string;
  language?: string;
  mood?: string;
}

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
