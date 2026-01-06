import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

/**
 * Save Song Metadata Endpoint
 * 
 * IMPORTANT: Audio should already be stored in Vercel Blob from the generate endpoint.
 * This endpoint validates that audio is properly stored and saves metadata to the database.
 * Cover images are uploaded here if provided as base64.
 * 
 * The flow is now:
 * 1. /api/elevenlabs/generate - Generates audio AND saves to Vercel Blob immediately
 * 2. /api/songs/save - Validates audio URL and saves metadata to database
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Reduced - audio is already stored, only covers need upload
    },
  },
};

// Vercel Blob URL patterns
const VERCEL_BLOB_PATTERNS = [
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//,
  /^https:\/\/[a-z0-9]+\.blob\.vercel-storage\.com\//,
];

/**
 * Check if a URL is a valid permanent storage URL
 */
function isPermanentStorageUrl(url: string): boolean {
  if (!url) return false;
  // Accept Vercel Blob URLs
  if (VERCEL_BLOB_PATTERNS.some(pattern => pattern.test(url))) return true;
  // Accept HTTPS URLs (external storage or CDN)
  if (url.startsWith('https://')) return true;
  return false;
}

interface SaveSongRequest {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  audioBase64?: string; // Kept for backwards compatibility, but should not be used
  genre: string;
  duration: number;
  coverUrl?: string;
  coverBase64?: string;
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
  bpm?: number;
  keySignature?: string;
  vocalStyle?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const songData: SaveSongRequest = req.body;

    // Validate required fields
    if (!songData.id || !songData.title) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, title',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // CRITICAL: Validate that audioUrl is a permanent storage URL
    // Audio should already be stored from the generate endpoint
    const finalAudioUrl = songData.audioUrl || '';
    
    if (!finalAudioUrl) {
      console.error(`[SaveSong] CRITICAL: No audio URL provided for song ${songData.id}`);
      return res.status(400).json({
        error: 'Audio URL is required. Audio must be generated and stored before saving metadata.',
        code: 'MISSING_AUDIO_URL'
      });
    }
    
    // Reject temporary blob: URLs - they cannot be persisted
    if (finalAudioUrl.startsWith('blob:')) {
      console.error(`[SaveSong] CRITICAL: Received temporary blob URL for song ${songData.id}`);
      return res.status(400).json({
        error: 'Cannot save song with temporary blob URL. Audio must be stored in permanent storage first.',
        code: 'INVALID_AUDIO_URL',
        hint: 'Audio should be automatically saved to Vercel Blob during generation. This error indicates a problem with the generation flow.'
      });
    }
    
    // Warn if URL doesn't look like permanent storage (but don't fail)
    if (!isPermanentStorageUrl(finalAudioUrl)) {
      console.warn(`[SaveSong] Warning: Audio URL may not be permanent storage: ${finalAudioUrl}`);
    } else {
      console.log(`[SaveSong] Audio URL validated: ${finalAudioUrl}`);
    }

    // Handle cover image - upload to blob if base64 provided
    let finalCoverUrl = songData.coverUrl || '';
    if (songData.coverBase64) {
      try {
        const base64Match = songData.coverBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = mimeType.split('/')[1] || 'png';
          
          const coverBlob = await put(`covers/${songData.id}.${ext}`, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          finalCoverUrl = coverBlob.url;
          console.log(`[SaveSong] Cover uploaded to: ${finalCoverUrl}`);
        }
      } catch (coverError) {
        console.error('[SaveSong] Failed to upload cover:', coverError);
        // Use placeholder for cover - this is not critical
        finalCoverUrl = `https://picsum.photos/seed/${songData.id}/300/300`;
      }
    }

    // Insert into Neon Postgres database
    // This is critical - if this fails, the song metadata is lost
    const now = new Date().toISOString();
    
    console.log(`[SaveSong] Saving song ${songData.id} to database...`);
    
    try {
      await sql`
        INSERT INTO songs (
          id, title, artist, audio_url, cover_url, genre, duration,
          lyrics, style_tags, description, is_instrumental, bpm,
          key_signature, vocal_style, created_at, updated_at
        ) VALUES (
          ${songData.id},
          ${songData.title},
          ${songData.artist || 'AI Composer'},
          ${finalAudioUrl},
          ${finalCoverUrl || null},
          ${songData.genre},
          ${songData.duration},
          ${songData.lyrics || null},
          ${songData.styleTags || []},
          ${songData.description || null},
          ${songData.isInstrumental || false},
          ${songData.bpm || null},
          ${songData.keySignature || null},
          ${songData.vocalStyle || null},
          ${now},
          ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          audio_url = EXCLUDED.audio_url,
          cover_url = EXCLUDED.cover_url,
          lyrics = EXCLUDED.lyrics,
          style_tags = EXCLUDED.style_tags,
          description = EXCLUDED.description,
          updated_at = ${now}
      `;
      console.log(`[SaveSong] Song ${songData.id} saved to database successfully`);
    } catch (dbError) {
      console.error(`[SaveSong] CRITICAL: Database save failed for song ${songData.id}:`, dbError);
      return res.status(500).json({
        error: 'Failed to save song to database',
        code: 'DATABASE_ERROR',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        // Include audioUrl so client can retry or at least has the audio
        audioUrl: finalAudioUrl
      });
    }

    // Automatically add the song to the default workspace (Your Creations)
    // This ensures all generated songs are visible in the creations view
    try {
      await sql`
        INSERT INTO workspace_songs (workspace_id, song_id, added_at)
        VALUES ('workspace-default', ${songData.id}, ${now})
        ON CONFLICT (workspace_id, song_id) DO NOTHING
      `;
      console.log(`[SaveSong] Song ${songData.id} added to default workspace`);
    } catch (workspaceError) {
      console.error('[SaveSong] Failed to add song to default workspace:', workspaceError);
      // Don't fail the request - the song is still saved in the main table
    }

    const songMetadata = {
      id: songData.id,
      title: songData.title,
      artist: songData.artist || 'AI Composer',
      audioUrl: finalAudioUrl,
      url: finalAudioUrl,
      genre: songData.genre,
      duration: songData.duration,
      coverUrl: finalCoverUrl,
      lyrics: songData.lyrics || '',
      styleTags: songData.styleTags || [],
      description: songData.description || '',
      isInstrumental: songData.isInstrumental || false,
      bpm: songData.bpm,
      keySignature: songData.keySignature,
      vocalStyle: songData.vocalStyle,
      createdAt: Date.now(),
    };

    console.log(`[SaveSong] SUCCESS: Song ${songData.id} saved with audio URL: ${finalAudioUrl}`);

    return res.status(200).json({
      success: true,
      song: songMetadata,
    });

  } catch (error) {
    console.error('[SaveSong] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Failed to save song',
      code: 'UNEXPECTED_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
