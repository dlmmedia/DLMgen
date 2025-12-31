import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing song ID' });
    }

    const songs = await sql`SELECT * FROM songs WHERE id = ${id}`;

    if (songs.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = songs[0];

    // Transform to match frontend expected format
    const transformedSong = {
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
    };

    return res.status(200).json({
      success: true,
      song: transformedSong,
    });

  } catch (error) {
    console.error('Get song error:', error);
    return res.status(500).json({ 
      error: 'Failed to get song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


