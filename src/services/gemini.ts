import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedMetadata } from "../types";

// Initialize Gemini
// Note: API Key must be in VITE_GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are an expert music composer and songwriter for a top-tier AI music generation app. 
Your goal is to create creative, catchy, and coherent song metadata (lyrics, title, style tags) based on user prompts.
If the user requests an instrumental, do not generate lyrics (return empty string).
Ensure lyrics follow a standard song structure (Verse, Chorus, Verse, Chorus, Bridge, Chorus).`;

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
    console.error("Metadata Generation Error (switching to mock):", error);

    // Fallback Mock Generation
    return {
      title: customTitle || `Song about ${prompt.substring(0, 20)}...`,
      lyrics: isInstrumental
        ? "[Instrumental]"
        : customLyrics || `[Verse 1]\n(Mock lyrics generated for prompt: "${prompt}")\n\n[Chorus]\nImagine a great song here...\nWith a catchy melody.`,
      styleTags: customStyle ? [customStyle] : ["Pop", "Electronic"], // Default tags
      description: prompt
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
