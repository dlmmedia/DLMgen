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
    // Fetch all library data in one request

    // 1. Get all playlists with track IDs
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

    // 2. Get all workspaces with track IDs
    const workspaces = await sql`
      SELECT 
        w.*,
        COALESCE(
          (SELECT array_agg(ws.song_id)
           FROM workspace_songs ws 
           WHERE ws.workspace_id = w.id),
          ARRAY[]::text[]
        ) as track_ids
      FROM workspaces w
      ORDER BY 
        CASE WHEN w.id = 'workspace-default' THEN 0 ELSE 1 END,
        w.updated_at DESC
    `;

    // 3. Get play history (last 100)
    const history = await sql`
      SELECT song_id, played_at
      FROM play_history
      ORDER BY played_at DESC
      LIMIT 100
    `;

    // 4. Get liked song IDs
    const likes = await sql`
      SELECT song_id FROM liked_songs ORDER BY liked_at DESC
    `;

    // Transform data
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

    const transformedWorkspaces = workspaces.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      coverUrl: w.cover_url,
      trackIds: w.track_ids || [],
      createdAt: new Date(w.created_at).getTime(),
      updatedAt: new Date(w.updated_at).getTime(),
    }));

    const transformedHistory = history.map(h => ({
      trackId: h.song_id,
      playedAt: new Date(h.played_at).getTime(),
    }));

    const likedTrackIds = likes.map(l => l.song_id);

    return res.status(200).json({
      success: true,
      data: {
        playlists: transformedPlaylists,
        workspaces: transformedWorkspaces,
        history: transformedHistory,
        likedTrackIds,
      },
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ 
      error: 'Failed to sync library data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

