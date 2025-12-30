import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Fetch all liked song IDs
    if (req.method === 'GET') {
      const likes = await sql`
        SELECT song_id FROM liked_songs ORDER BY liked_at DESC
      `;

      return res.status(200).json({
        success: true,
        likedTrackIds: likes.map(l => l.song_id),
        count: likes.length,
      });
    }

    // POST - Like a song
    if (req.method === 'POST') {
      const { songId } = req.body;

      if (!songId) {
        return res.status(400).json({ error: 'Missing required field: songId' });
      }

      // Check if song exists
      const songs = await sql`SELECT id FROM songs WHERE id = ${songId}`;
      if (songs.length === 0) {
        return res.status(404).json({ error: 'Song not found' });
      }

      // Add like (ignore if already exists)
      await sql`
        INSERT INTO liked_songs (song_id, liked_at)
        VALUES (${songId}, NOW())
        ON CONFLICT (song_id) DO NOTHING
      `;

      return res.status(200).json({
        success: true,
        liked: true,
        songId,
      });
    }

    // DELETE - Unlike a song
    if (req.method === 'DELETE') {
      const { songId } = req.query;

      if (!songId || typeof songId !== 'string') {
        return res.status(400).json({ error: 'Missing required query param: songId' });
      }

      await sql`DELETE FROM liked_songs WHERE song_id = ${songId}`;

      return res.status(200).json({
        success: true,
        liked: false,
        songId,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Likes API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process likes request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

