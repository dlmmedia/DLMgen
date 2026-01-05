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
 * Get creativity descriptor based on slider value (0-100)
 */
function getCreativityDescriptor(creativity: number): string {
    if (creativity < 20) {
        return 'conventional, familiar, mainstream sound';
    } else if (creativity < 40) {
        return 'accessible, slightly unconventional';
    } else if (creativity < 60) {
        return ''; // Neutral, let the model decide
    } else if (creativity < 80) {
        return 'creative, unique arrangement, fresh sound';
    } else {
        return 'experimental, avant-garde, unconventional, innovative';
    }
}

/**
 * Get energy descriptor based on slider value (0-100)
 */
function getEnergyDescriptor(energy: number): string {
    if (energy < 20) {
        return 'very chill, relaxed, mellow, downtempo, calm';
    } else if (energy < 40) {
        return 'laid-back, easygoing, smooth';
    } else if (energy < 60) {
        return ''; // Neutral energy
    } else if (energy < 80) {
        return 'upbeat, energetic, lively, dynamic';
    } else {
        return 'high energy, intense, powerful, driving, explosive';
    }
}

/**
 * Build instrumental-specific prompt components
 */
function buildInstrumentalPrompt(params: CreateSongParams): string {
    const parts: string[] = [];
    
    // Add preset style if selected
    if (params.instrumentalPreset) {
        const presetDescriptors: Record<string, string> = {
            'cinematic': 'cinematic orchestral soundtrack, epic, dramatic, sweeping strings',
            'lofi': 'lo-fi hip hop beats, jazzy chords, warm vinyl crackle, relaxed',
            'ambient': 'ambient soundscape, ethereal pads, atmospheric, dreamy textures',
            'jazz': 'smooth jazz, sophisticated harmonies, improvised feel, groovy',
            'electronic': 'modern electronic, synth-driven, polished production',
            'acoustic': 'acoustic, organic instruments, warm and natural sound',
        };
        const presetDesc = presetDescriptors[params.instrumentalPreset];
        if (presetDesc) {
            parts.push(presetDesc);
        }
    }
    
    // Add selected instruments with emphasis
    if (params.instruments && params.instruments.length > 0) {
        const instrumentsStr = params.instruments.join(', ');
        parts.push(`featuring ${instrumentsStr}`);
    }
    
    // Add structure hints
    if (params.structureSections && params.structureSections.length > 0) {
        const structureDescriptors: Record<string, string> = {
            'intro': 'atmospheric intro',
            'verse': 'melodic verse section',
            'buildup': 'rising buildup with tension',
            'drop': 'powerful drop with energy release',
            'breakdown': 'stripped down breakdown',
            'bridge': 'transitional bridge section',
            'loop': 'repetitive loop pattern',
            'outro': 'fading outro',
        };
        
        const structureDesc = params.structureSections
            .map(s => structureDescriptors[s.type] || s.type)
            .join(', then ');
        
        if (structureDesc) {
            parts.push(`structure: ${structureDesc}`);
        }
    }
    
    return parts.join(', ');
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
    
    // 2. Add creativity descriptor based on slider
    const creativityDesc = getCreativityDescriptor(params.creativity ?? 50);
    if (creativityDesc) {
        parts.push(creativityDesc);
    }
    
    // 3. Add energy descriptor based on slider
    const energyDesc = getEnergyDescriptor(params.energy ?? 50);
    if (energyDesc) {
        parts.push(energyDesc);
    }
    
    // 4. Add vocal descriptors (crucial for getting vocals!)
    if (!params.isInstrumental) {
        const vocalDesc = getVocalDescriptor(params.vocalStyle);
        if (vocalDesc) {
            parts.push(vocalDesc);
        } else {
            // Always add some vocal indication if not instrumental
            parts.push('with vocals');
        }
    }
    
    // 5. Add tempo/BPM if specified
    if (params.bpm) {
        parts.push(`${params.bpm} BPM`);
    }
    
    // 6. Add key signature if specified
    if (params.keySignature) {
        parts.push(`in ${params.keySignature}`);
    }
    
    // 7. Handle instrumental vs vocal track
    if (params.isInstrumental) {
        parts.push('instrumental only, no vocals');
        
        // Add detailed instrumental controls
        const instrumentalPrompt = buildInstrumentalPrompt(params);
        if (instrumentalPrompt) {
            parts.push(instrumentalPrompt);
        }
    } else if (params.customLyrics && params.customLyrics.trim()) {
        // Include formatted lyrics in the prompt
        const formattedLyrics = formatLyrics(params.customLyrics);
        parts.push(`\n\nLyrics:\n${formattedLyrics}`);
    }
    
    // 8. Add title context if provided
    if (params.customTitle) {
        parts.unshift(`Song: "${params.customTitle}"`);
    }
    
    // 9. Add exclusions (negative prompting)
    if (params.excludeStyles && params.excludeStyles.trim()) {
        parts.push(`\n\nAvoid: ${params.excludeStyles}`);
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

    let response: Response;
    try {
        response = await fetch('/api/elevenlabs/generate', {
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
    } catch (fetchError) {
        // Handle network errors (connection refused, etc.)
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
            throw new Error('Cannot connect to the API server. Make sure you are running the dev server with "npm run dev" or "npx vercel dev".');
        }
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error codes
        if (response.status === 401 || errorData.code === 'INVALID_API_KEY') {
            const hint = typeof errorData.hint === 'string' ? `\n\n${errorData.hint}` : '';
            throw new Error(`Invalid API key. Please check your ELEVENLABS_API_KEY environment variable.${hint}`);
        }
        
        if (errorData.code === 'MISSING_API_KEY') {
            throw new Error('Server configuration error: ELEVENLABS_API_KEY is not set.');
        }
        
        if (errorData.code === 'CONNECTION_ERROR') {
            throw new Error('Failed to connect to ElevenLabs API. Please check your internet connection and API key.');
        }
        
        // Handle prompt suggestions from ElevenLabs
        if (errorData.suggestion) {
            throw new Error(`${errorData.error}. Suggested prompt: ${errorData.suggestion}`);
        }
        
        throw new Error(errorData.error || `Failed to generate music via ElevenLabs (Status: ${response.status})`);
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
