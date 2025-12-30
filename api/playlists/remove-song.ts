import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playlistId, songId } = req.query;

    if (!playlistId || typeof playlistId !== 'string' || !songId || typeof songId !== 'string') {
      return res.status(400).json({ error: 'Missing required query params: playlistId, songId' });
    }

    // Remove song from playlist
    await sql`
      DELETE FROM playlist_songs 
      WHERE playlist_id = ${playlistId} AND song_id = ${songId}
    `;

    // Update playlist timestamp
    await sql`
      UPDATE playlists SET updated_at = NOW() WHERE id = ${playlistId}
    `;

    // Get updated track IDs
    const trackIds = await sql`
      SELECT song_id FROM playlist_songs 
      WHERE playlist_id = ${playlistId} 
      ORDER BY position
    `;

    return res.status(200).json({
      success: true,
      trackIds: trackIds.map(t => t.song_id),
    });

  } catch (error) {
    console.error('Remove song from playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to remove song from playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

