import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface UpdateWorkspaceRequest {
  id: string;
  name?: string;
  description?: string;
  coverUrl?: string;
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
    const data: UpdateWorkspaceRequest = req.body;

    if (!data.id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }

    const now = new Date().toISOString();

    const result = await sql`
      UPDATE workspaces SET
        name = COALESCE(${data.name}, name),
        description = COALESCE(${data.description}, description),
        cover_url = COALESCE(${data.coverUrl}, cover_url),
        updated_at = ${now}
      WHERE id = ${data.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = result[0];

    // Get track IDs
    const trackIds = await sql`
      SELECT song_id FROM workspace_songs WHERE workspace_id = ${data.id}
    `;

    return res.status(200).json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        coverUrl: workspace.cover_url,
        trackIds: trackIds.map(t => t.song_id),
        createdAt: new Date(workspace.created_at).getTime(),
        updatedAt: new Date(workspace.updated_at).getTime(),
      },
    });

  } catch (error) {
    console.error('Update workspace error:', error);
    return res.status(500).json({ 
      error: 'Failed to update workspace',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

