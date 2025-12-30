import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    // Get all playlists with their song counts
    const playlists = await sql`
      SELECT 
        p.*,
        COALESCE(
          (SELECT array_agg(ps.song_id ORDER BY ps.position)
           FROM playlist_songs ps 
           WHERE ps.playlist_id = p.id),
          ARRAY[]::text[]
        ) as track_ids
      FROM playlists p
      ORDER BY p.updated_at DESC
    `;

    const transformedPlaylists = playlists.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      coverUrl: p.cover_url,
      isPublic: p.is_public,
      trackIds: p.track_ids || [],
      createdAt: new Date(p.created_at).getTime(),
      updatedAt: new Date(p.updated_at).getTime(),
    }));

    return res.status(200).json({
      success: true,
      playlists: transformedPlaylists,
      count: transformedPlaylists.length,
    });

  } catch (error) {
    console.error('List playlists error:', error);
    return res.status(500).json({ 
      error: 'Failed to list playlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

