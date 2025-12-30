import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedMetadata } from "../types";
import { buildFallbackLyrics, generateCreativeTitle } from "./lyricsSystem";

// Initialize Gemini
// Note: API Key must be in VITE_GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are an expert music composer and songwriter for a top-tier AI music generation app. 
Your goal is to create creative, catchy, and coherent song metadata (lyrics, title, style tags) based on user prompts.
If the user requests an instrumental, do not generate lyrics (return empty string).
Ensure lyrics follow a standard song structure (Verse, Chorus, Verse, Chorus, Bridge, Chorus).
IMPORTANT: Generate UNIQUE, CREATIVE lyrics. Never use generic placeholder text or reference the prompt directly in lyrics.
Each song should feel original with meaningful, poetic words.`;

// Detect mood from prompt keywords
function detectMood(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  const moodKeywords: Record<string, string[]> = {
    'Romantic': ['love', 'heart', 'romance', 'kiss', 'together', 'forever', 'passion', 'beloved'],
    'Melancholic': ['sad', 'tears', 'cry', 'lost', 'miss', 'gone', 'lonely', 'goodbye', 'farewell', 'broken'],
    'Empowering': ['strong', 'power', 'rise', 'fight', 'conquer', 'unstoppable', 'warrior', 'victory', 'champion'],
    'Energetic': ['party', 'dance', 'club', 'bass', 'beat', 'pump', 'wild', 'crazy', 'edm', 'rave'],
    'Dark': ['dark', 'shadow', 'night', 'demon', 'death', 'evil', 'horror', 'fear', 'nightmare'],
    'Nostalgic': ['remember', 'memory', 'past', 'old', 'childhood', 'yesterday', 'back then', 'used to'],
    'Euphoric': ['joy', 'happy', 'bliss', 'ecstasy', 'amazing', 'wonderful', 'incredible', 'magic'],
  };
  
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(kw => lowerPrompt.includes(kw))) {
      return mood;
    }
  }
  
  return 'Hopeful'; // Default mood
}

// Infer genre/style from prompt
function inferStyleTags(prompt: string, customStyle?: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const tags: string[] = [];
  
  // Genre detection
  const genreKeywords: Record<string, string[]> = {
    'Rock': ['rock', 'guitar', 'band', 'grunge', 'metal'],
    'Pop': ['pop', 'catchy', 'radio', 'mainstream'],
    'Hip-Hop': ['hip hop', 'rap', 'beat', 'flow', 'bars'],
    'Electronic': ['electronic', 'synth', 'edm', 'techno', 'house', 'dubstep'],
    'R&B': ['r&b', 'rnb', 'soul', 'groove', 'smooth'],
    'Jazz': ['jazz', 'swing', 'bebop', 'blues'],
    'Country': ['country', 'western', 'cowboy', 'nashville'],
    'Acoustic': ['acoustic', 'unplugged', 'folk', 'singer-songwriter'],
    'Classical': ['classical', 'orchestra', 'symphony', 'piano'],
    'Ambient': ['ambient', 'atmospheric', 'soundscape', 'chill'],
  };
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(kw => lowerPrompt.includes(kw))) {
      tags.push(genre);
      break;
    }
  }
  
  // Energy detection
  if (lowerPrompt.match(/fast|upbeat|energetic|dance|party/)) {
    tags.push('Upbeat');
  } else if (lowerPrompt.match(/slow|chill|relaxed|calm|mellow/)) {
    tags.push('Mellow');
  }
  
  // Add custom style if provided
  if (customStyle) {
    tags.push(customStyle.split(',')[0].trim());
  }
  
  // Default tags if none detected
  if (tags.length === 0) {
    tags.push('Pop', 'Modern');
  }
  
  return tags.slice(0, 4);
}

export async function generateSongMetadata(
  prompt: string,
  isInstrumental: boolean,
  customLyrics?: string,
  customStyle?: string,
  customTitle?: string
): Promise<GeneratedMetadata> {

  // If user provided everything in custom mode, we might just need to format it or fill gaps.
  // But generally, we use the model to fill in the blanks.

  const model = "gemini-3-flash-preview";

  const userPrompt = `
    Create song metadata for the following request: "${prompt}".
    
    Configuration:
    - Instrumental: ${isInstrumental}
    - Custom Lyrics Provided: ${!!customLyrics ? "Yes (use these exactly)" : "No (generate creative lyrics)"}
    - Custom Style Provided: ${!!customStyle ? "Yes" : "No"}
    - Custom Title Provided: ${!!customTitle ? "Yes" : "No"}

    ${customLyrics ? `Use these lyrics: \n${customLyrics}\n` : ''}
    ${customStyle ? `Use this musical style: ${customStyle}` : ''}
    ${customTitle ? `Use this title: ${customTitle}` : ''}
    
    CRITICAL: Create ORIGINAL, MEANINGFUL lyrics that tell a story. 
    Do NOT include placeholder text, the prompt itself, or generic filler content.
    Each line should be poetic and singable.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A catchy title for the song" },
            lyrics: { type: Type.STRING, description: "Full song lyrics with structure headers like [Verse], [Chorus]" },
            styleTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 3-5 genre/style tags (e.g., 'Upbeat', 'Synthwave', 'Female Vocals')"
            },
            description: { type: Type.STRING, description: "A short visual description for the album cover art" }
          },
          required: ["title", "lyrics", "styleTags", "description"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as GeneratedMetadata;
      // Force empty lyrics if instrumental (double check)
      if (isInstrumental) {
        data.lyrics = "[Instrumental]";
      }
      return data;
    }
    throw new Error("No text response from Gemini");
  } catch (error) {
    console.error("Metadata Generation Error (switching to fallback):", error);

    // Detect mood from prompt for better fallback generation
    const mood = detectMood(prompt);
    const styleTags = inferStyleTags(prompt, customStyle);
    
    // Use the improved fallback lyrics generator
    const fallbackLyrics = isInstrumental 
      ? "[Instrumental]"
      : customLyrics || buildFallbackLyrics({
          concept: prompt,
          genre: styleTags[0] || 'Pop',
          style: customStyle || 'Modern',
          mood: mood,
          language: 'English',
          structureTemplate: 'Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Chorus',
          perspective: 'first person',
        });
    
    // Generate a creative title instead of generic "Song about..."
    const title = customTitle || generateCreativeTitle(prompt, mood);
    
    return {
      title,
      lyrics: fallbackLyrics,
      styleTags,
      description: `A ${mood.toLowerCase()} ${styleTags[0]?.toLowerCase() || 'pop'} song about ${prompt.substring(0, 50)}`
    };
  }
}

export async function generateAlbumArt(description: string): Promise<string> {
  const model = "gemini-2.5-flash-image";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: `High quality, artistic album cover for a song described as: ${description}. Square aspect ratio, no text, 4k resolution style, vibrant.` }]
      },
      config: {
        // We don't have explicit aspectRatio control in generateContent for this model,
        // but the prompt helps.
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    // Fallback if no image found in response
    return "https://picsum.photos/500/500";

  } catch (error) {
    console.error("Image Generation Error:", error);
    return "https://picsum.photos/500/500"; // Fallback
  }
}
