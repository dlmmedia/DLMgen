import { CreateSongParams, VocalStyle } from '../types';

/**
 * ElevenLabs Music Generation Service
 * 
 * Constructs optimized prompts following ElevenLabs best practices:
 * - Includes vocal descriptors (male, female, duet, choir)
 * - Properly formats lyrics with structure markers
 * - Adds style, tempo (BPM), and key signature
 * - Explicitly marks instrumentals
 * 
 * Reference: https://elevenlabs.io/docs/overview/capabilities/music/best-practices
 */

/**
 * Build a vocal descriptor string based on vocal style
 */
function getVocalDescriptor(vocalStyle: VocalStyle): string {
    switch (vocalStyle) {
        case 'male':
            return 'male vocals, male singer';
        case 'female':
            return 'female vocals, female singer';
        case 'duet':
            return 'duet, two singers harmonizing, male and female vocals';
        case 'choir':
            return 'choir vocals, multiple singers, harmonized vocals';
        case 'auto':
        default:
            return ''; // Let the model decide
    }
}

/**
 * Format lyrics with proper structure markers for ElevenLabs
 * The model understands [Verse], [Chorus], [Bridge], etc.
 */
function formatLyrics(lyrics: string): string {
    if (!lyrics.trim()) return '';
    
    // Check if lyrics already have structure markers
    const hasStructure = /\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook)\s*\d?\]/i.test(lyrics);
    
    if (hasStructure) {
        return lyrics;
    }
    
    // If no structure, wrap in verse/chorus structure
    const lines = lyrics.split('\n').filter(l => l.trim());
    if (lines.length <= 4) {
        return `[Verse]\n${lyrics}`;
    }
    
    // Split roughly in half for verse/chorus
    const midpoint = Math.floor(lines.length / 2);
    const verse = lines.slice(0, midpoint).join('\n');
    const chorus = lines.slice(midpoint).join('\n');
    
    return `[Verse 1]\n${verse}\n\n[Chorus]\n${chorus}`;
}

/**
 * Build the full prompt for ElevenLabs music generation
 * Following best practices from ElevenLabs documentation
 */
function buildElevenLabsPrompt(params: CreateSongParams): string {
    const parts: string[] = [];
    
    // 1. Style/Genre description (most important for setting the tone)
    if (params.customStyle) {
        parts.push(params.customStyle);
    } else if (params.prompt) {
        parts.push(params.prompt);
    }
    
    // 2. Add vocal descriptors (crucial for getting vocals!)
    if (!params.isInstrumental) {
        const vocalDesc = getVocalDescriptor(params.vocalStyle);
        if (vocalDesc) {
            parts.push(vocalDesc);
        } else {
            // Always add some vocal indication if not instrumental
            parts.push('with vocals');
        }
    }
    
    // 3. Add tempo/BPM if specified
    if (params.bpm) {
        parts.push(`${params.bpm} BPM`);
    }
    
    // 4. Add key signature if specified
    if (params.keySignature) {
        parts.push(`in ${params.keySignature}`);
    }
    
    // 5. Handle instrumental vs vocal track
    if (params.isInstrumental) {
        parts.push('instrumental only, no vocals');
    } else if (params.customLyrics && params.customLyrics.trim()) {
        // Include formatted lyrics in the prompt
        const formattedLyrics = formatLyrics(params.customLyrics);
        parts.push(`\n\nLyrics:\n${formattedLyrics}`);
    }
    
    // 6. Add title context if provided
    if (params.customTitle) {
        parts.unshift(`Song: "${params.customTitle}"`);
    }
    
    return parts.join(', ').replace(/, \n/g, '\n');
}

/**
 * Generate a music track using ElevenLabs API
 * Returns the audio as a Blob
 */
export async function generateElevenLabsTrack(params: CreateSongParams): Promise<Blob> {
    // Build the optimized prompt
    const prompt = buildElevenLabsPrompt(params);
    
    // Basic validation
    if (!prompt.trim()) {
        throw new Error("Prompt is required for music generation");
    }
    
    console.log('ElevenLabs Generation Request:', {
        prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
        duration: params.durationSeconds,
        instrumental: params.isInstrumental
    });

    const response = await fetch('/api/elevenlabs/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: prompt,
            duration_seconds: params.durationSeconds || 60,
            instrumental: params.isInstrumental,
            output_format: 'mp3_44100_128'
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle prompt suggestions from ElevenLabs
        if (errorData.suggestion) {
            throw new Error(`${errorData.error}. Suggested prompt: ${errorData.suggestion}`);
        }
        
        throw new Error(errorData.error || 'Failed to generate music via ElevenLabs');
    }

    return await response.blob();
}

/**
 * Helper to estimate generation time based on duration
 */
export function estimateGenerationTime(durationSeconds: number): number {
    // Roughly 1-2 seconds per second of audio, plus overhead
    return Math.ceil(durationSeconds * 1.5) + 10;
}
