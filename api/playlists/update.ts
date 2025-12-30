import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface UpdatePlaylistRequest {
  id: string;
  name?: string;
  description?: string;
  coverUrl?: string;
  isPublic?: boolean;
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
    const data: UpdatePlaylistRequest = req.body;

    if (!data.id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }

    const now = new Date().toISOString();

    // Build dynamic update
    const result = await sql`
      UPDATE playlists SET
        name = COALESCE(${data.name}, name),
        description = COALESCE(${data.description}, description),
        cover_url = COALESCE(${data.coverUrl}, cover_url),
        is_public = COALESCE(${data.isPublic}, is_public),
        updated_at = ${now}
      WHERE id = ${data.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = result[0];

    // Get track IDs
    const trackIds = await sql`
      SELECT song_id FROM playlist_songs 
      WHERE playlist_id = ${data.id} 
      ORDER BY position
    `;

    return res.status(200).json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.cover_url,
        isPublic: playlist.is_public,
        trackIds: trackIds.map(t => t.song_id),
        createdAt: new Date(playlist.created_at).getTime(),
        updatedAt: new Date(playlist.updated_at).getTime(),
      },
    });

  } catch (error) {
    console.error('Update playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to update playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

