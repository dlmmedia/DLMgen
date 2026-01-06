import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';

interface AddSongRequest {
  playlistId: string;
  songId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const data: AddSongRequest = req.body;

    if (!data.playlistId || !data.songId) {
      return res.status(400).json({ error: 'Missing required fields: playlistId, songId' });
    }

    // Check if playlist exists
    const playlists = await sql`SELECT id FROM playlists WHERE id = ${data.playlistId}`;
    if (playlists.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if song exists
    const songs = await sql`SELECT id FROM songs WHERE id = ${data.songId}`;
    if (songs.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Get current max position
    const maxPos = await sql`
      SELECT COALESCE(MAX(position), -1) as max_position 
      FROM playlist_songs 
      WHERE playlist_id = ${data.playlistId}
    `;
    const newPosition = (maxPos[0]?.max_position ?? -1) + 1;

    // Add song to playlist
    await sql`
      INSERT INTO playlist_songs (playlist_id, song_id, position, added_at)
      VALUES (${data.playlistId}, ${data.songId}, ${newPosition}, NOW())
      ON CONFLICT (playlist_id, song_id) DO NOTHING
    `;

    // Update playlist timestamp
    await sql`
      UPDATE playlists SET updated_at = NOW() WHERE id = ${data.playlistId}
    `;

    // Get updated track IDs
    const trackIds = await sql`
      SELECT song_id FROM playlist_songs 
      WHERE playlist_id = ${data.playlistId} 
      ORDER BY position
    `;

    return res.status(200).json({
      success: true,
      trackIds: trackIds.map(t => t.song_id),
    });

  } catch (error) {
    console.error('Add song to playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to add song to playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


