import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, isDatabaseConfigured } from '../lib/db.js';

const HISTORY_MAX_ENTRIES = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    console.error('[History] DATABASE_URL environment variable is not set');
    return res.status(500).json({
      error: 'Database not configured',
      code: 'DATABASE_NOT_CONFIGURED',
      hint: 'Please set DATABASE_URL environment variable in Vercel Project Settings > Environment Variables'
    });
  }

  try {
    // GET - Fetch play history
    if (req.method === 'GET') {
      const { limit = '100' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 100, HISTORY_MAX_ENTRIES);

      const history = await sql`
        SELECT ph.song_id, ph.played_at, s.title, s.artist, s.cover_url
        FROM play_history ph
        LEFT JOIN songs s ON ph.song_id = s.id
        ORDER BY ph.played_at DESC
        LIMIT ${limitNum}
      `;

      const transformedHistory = history.map(h => ({
        trackId: h.song_id,
        playedAt: new Date(h.played_at).getTime(),
        // Include basic song info for convenience
        songTitle: h.title,
        songArtist: h.artist,
        coverUrl: h.cover_url,
      }));

      return res.status(200).json({
        success: true,
        history: transformedHistory,
        count: transformedHistory.length,
      });
    }

    // POST - Add to history
    if (req.method === 'POST') {
      const { songId } = req.body;

      if (!songId) {
        return res.status(400).json({ error: 'Missing required field: songId' });
      }

      // Check if the song exists in the database
      // Generated songs may not exist yet, and pre-built tracks are not in the DB
      const songExists = await sql`
        SELECT id FROM songs WHERE id = ${songId} LIMIT 1
      `;

      if (songExists.length === 0) {
        // Song doesn't exist in database - this is normal for pre-built tracks
        // Return success without inserting (history is also tracked in localStorage)
        return res.status(200).json({
          success: true,
          message: 'History tracked locally only (song not in database)',
          isLocalOnly: true,
        });
      }

      // Add new entry
      await sql`
        INSERT INTO play_history (song_id, played_at)
        VALUES (${songId}, NOW())
      `;

      // Clean up old entries to keep only the last HISTORY_MAX_ENTRIES
      await sql`
        DELETE FROM play_history
        WHERE id NOT IN (
          SELECT id FROM play_history
          ORDER BY played_at DESC
          LIMIT ${HISTORY_MAX_ENTRIES}
        )
      `;

      return res.status(200).json({
        success: true,
        message: 'Added to history',
      });
    }

    // DELETE - Clear history
    if (req.method === 'DELETE') {
      await sql`DELETE FROM play_history`;

      return res.status(200).json({
        success: true,
        message: 'History cleared',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('History API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process history request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


