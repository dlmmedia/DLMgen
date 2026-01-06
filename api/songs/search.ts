import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';

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
    const { q, limit = '20' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Missing search query' });
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 50);

    // Full-text search on title and lyrics
    const songs = await sql`
      SELECT *, 
        ts_rank(to_tsvector('english', title || ' ' || COALESCE(lyrics, '')), plainto_tsquery('english', ${q})) as rank
      FROM songs 
      WHERE to_tsvector('english', title || ' ' || COALESCE(lyrics, '')) @@ plainto_tsquery('english', ${q})
      ORDER BY rank DESC, created_at DESC
      LIMIT ${limitNum}
    `;

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
      query: q,
    });

  } catch (error) {
    console.error('Search songs error:', error);
    return res.status(500).json({ 
      error: 'Failed to search songs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


