import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface StoredSong {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string;
  genre: string;
  duration: number;
  lyrics?: string;
  style_tags?: string[];
  description?: string;
  is_instrumental?: boolean;
  bpm?: number;
  key_signature?: string;
  vocal_style?: string;
  created_at: string;
  updated_at: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { genre, limit = '50', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    let songs: StoredSong[];

    if (genre && typeof genre === 'string') {
      songs = await sql`
        SELECT * FROM songs 
        WHERE genre = ${genre}
        ORDER BY created_at DESC 
        LIMIT ${limitNum} OFFSET ${offsetNum}
      ` as StoredSong[];
    } else {
      songs = await sql`
        SELECT * FROM songs 
        ORDER BY created_at DESC 
        LIMIT ${limitNum} OFFSET ${offsetNum}
      ` as StoredSong[];
    }

    // Transform to match frontend expected format
    const transformedSongs = songs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      audioUrl: song.audio_url,
      url: song.audio_url,
      genre: song.genre,
      duration: song.duration,
      coverUrl: song.cover_url,
      lyrics: song.lyrics,
      styleTags: song.style_tags,
      description: song.description,
      isInstrumental: song.is_instrumental,
      bpm: song.bpm,
      keySignature: song.key_signature,
      vocalStyle: song.vocal_style,
      createdAt: new Date(song.created_at).getTime(),
    }));

    return res.status(200).json({
      success: true,
      songs: transformedSongs,
      count: transformedSongs.length,
    });

  } catch (error) {
    console.error('List songs error:', error);
    return res.status(500).json({ 
      error: 'Failed to list songs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
