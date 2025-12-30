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
    // Get all workspaces with their song IDs
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

    const transformedWorkspaces = workspaces.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      coverUrl: w.cover_url,
      trackIds: w.track_ids || [],
      createdAt: new Date(w.created_at).getTime(),
      updatedAt: new Date(w.updated_at).getTime(),
    }));

    return res.status(200).json({
      success: true,
      workspaces: transformedWorkspaces,
      count: transformedWorkspaces.length,
    });

  } catch (error) {
    console.error('List workspaces error:', error);
    return res.status(500).json({ 
      error: 'Failed to list workspaces',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

