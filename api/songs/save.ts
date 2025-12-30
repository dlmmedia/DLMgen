import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increased to handle audio files
    },
  },
};

interface SaveSongRequest {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  audioBase64?: string;
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

    if (!songData.id || !songData.title) {
      return res.status(400).json({ error: 'Missing required fields: id, title' });
    }

    // Handle audio file - upload to blob if base64 provided
    let finalAudioUrl = songData.audioUrl || '';
    if (songData.audioBase64) {
      try {
        const base64Match = songData.audioBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = mimeType.includes('mpeg') ? 'mp3' : (mimeType.split('/')[1] || 'mp3');
          
          const audioBlob = await put(`audio/${songData.id}.${ext}`, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          finalAudioUrl = audioBlob.url;
          console.log(`Audio uploaded to: ${finalAudioUrl}`);
        }
      } catch (audioError) {
        console.error('Failed to upload audio:', audioError);
      }
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
        }
      } catch (coverError) {
        console.error('Failed to upload cover:', coverError);
        finalCoverUrl = `https://picsum.photos/seed/${songData.id}/300/300`;
      }
    }

    // Insert into Neon Postgres database
    const now = new Date().toISOString();
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

    return res.status(200).json({
      success: true,
      song: songMetadata,
    });

  } catch (error) {
    console.error('Save song error:', error);
    return res.status(500).json({ 
      error: 'Failed to save song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
