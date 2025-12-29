import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ElevenLabs Music Generation API
 * 
 * Uses the /v1/music/compose endpoint for full control over:
 * - Vocals with lyrics
 * - Instrumental tracks
 * - Duration (10-300 seconds)
 * - Output quality
 * 
 * Best practices from ElevenLabs:
 * - By default, prompts will include lyrics/vocals
 * - Add "instrumental only" to get pure instrumentals
 * - Include lyrics with [Verse], [Chorus] markers
 * - Use vocal descriptors like "female vocals", "male singer"
 */

interface GenerateRequest {
    prompt: string;
    duration_seconds?: number; // 10-300
    instrumental?: boolean;
    output_format?: string; // e.g., 'mp3_44100_192'
    lyrics?: string;
    style?: string;
    title?: string;
}

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const {
        prompt: initialPrompt,
        duration_seconds = 60,
        instrumental = false,
        output_format = 'mp3_44100_128',
        lyrics,
        style,
        title
    }: GenerateRequest = request.body;

    let prompt = initialPrompt;

    // Construct a rich prompt if custom parameters are provided and it's not a simple prompt
    if (lyrics || style || title) {
        const parts = [];
        if (title) parts.push(`Title: ${title}`);
        if (style) parts.push(`Style: ${style}`);
        if (lyrics) parts.push(`Lyrics:\n${lyrics}`);

        // If there's an initial prompt (e.g. from the simple input while also sending extra data), include it too, 
        // but typically the frontend handles this separation. 
        // If pure custom mode is used, initialPrompt might be empty or auxiliary.
        if (initialPrompt && !lyrics) {
            // If we have explicit lyrics, we prioritize them over a generic prompt description 
            // but we can append the prompt as "Description: " if needed.
            parts.push(`Description: ${initialPrompt}`);
        }

        prompt = parts.join('. ');
    }

    if (!prompt) {
        return response.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating with prompt:', prompt);

    // Validate duration (10-300 seconds per ElevenLabs docs)
    const validDuration = Math.max(10, Math.min(300, duration_seconds));
    const durationMs = validDuration * 1000;

    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_elevenlabs_api_key') {
        console.error('ELEVENLABS_API_KEY is not set');
        return response.status(500).json({ 
            error: 'Server configuration error: ELEVENLABS_API_KEY environment variable is not set. Please add it to your .env.local file or Vercel environment variables.',
            code: 'MISSING_API_KEY'
        });
    }

    // Light sanity check without exposing the key
    const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : 'present';
    console.log(`[ElevenLabs] API key detected (${maskedKey}), duration ${validDuration}s, instrumental=${instrumental}`);

    try {
        // Use the compose endpoint for full music generation
        // This endpoint supports vocals, lyrics, and complex compositions
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/music/compose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                prompt: prompt,
                duration_ms: durationMs,
                instrumental: instrumental,
                output_format: output_format
            }),
        });

        if (!elevenLabsResponse.ok) {
            const errorText = await elevenLabsResponse.text();
            console.error('ElevenLabs API Error:', elevenLabsResponse.status, errorText);

            // Handle 401 Unauthorized (Invalid API Key)
            if (elevenLabsResponse.status === 401) {
                return response.status(401).json({
                    error: 'Invalid API key. Please check your ELEVENLABS_API_KEY environment variable.',
                    code: 'INVALID_API_KEY',
                    hint: 'Make sure your API key is correct and has not expired. You can get a new key from https://elevenlabs.io/app/settings/api-keys'
                });
            }

            // Parse error for better messaging
            try {
                const errorJson = JSON.parse(errorText);
                // ElevenLabs returns suggestions for bad prompts
                if (errorJson.detail?.status === 'bad_prompt' && errorJson.detail?.prompt_suggestion) {
                    return response.status(400).json({
                        error: 'Prompt contains restricted content',
                        suggestion: errorJson.detail.prompt_suggestion
                    });
                }
                return response.status(elevenLabsResponse.status).json({
                    error: errorJson.detail?.message || errorJson.message || 'ElevenLabs API error',
                    details: errorJson,
                    code: 'ELEVENLABS_API_ERROR'
                });
            } catch {
                return response.status(elevenLabsResponse.status).json({
                    error: `ElevenLabs API error: ${errorText}`,
                    code: 'ELEVENLABS_API_ERROR'
                });
            }
        }

        // The compose endpoint returns audio directly
        const audioBuffer = await elevenLabsResponse.arrayBuffer();

        // Set appropriate headers for audio streaming
        response.setHeader('Content-Type', 'audio/mpeg');
        response.setHeader('Content-Length', audioBuffer.byteLength);
        response.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error('Internal Server Error:', error);
        return response.status(500).json({
            error: 'Failed to generate music',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
