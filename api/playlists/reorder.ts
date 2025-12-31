import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface ReorderRequest {
  playlistId: string;
  songIds: string[]; // New order of song IDs
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: ReorderRequest = req.body;

    if (!data.playlistId || !data.songIds || !Array.isArray(data.songIds)) {
      return res.status(400).json({ error: 'Missing required fields: playlistId, songIds' });
    }

    // Update positions for each song
    for (let i = 0; i < data.songIds.length; i++) {
      await sql`
        UPDATE playlist_songs 
        SET position = ${i}
        WHERE playlist_id = ${data.playlistId} AND song_id = ${data.songIds[i]}
      `;
    }

    // Update playlist timestamp
    await sql`
      UPDATE playlists SET updated_at = NOW() WHERE id = ${data.playlistId}
    `;

    return res.status(200).json({
      success: true,
      trackIds: data.songIds,
    });

  } catch (error) {
    console.error('Reorder playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to reorder playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


