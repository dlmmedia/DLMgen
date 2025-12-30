import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

const HISTORY_MAX_ENTRIES = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

