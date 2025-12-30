import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface CreateWorkspaceRequest {
  id?: string;
  name: string;
  description?: string;
  coverUrl?: string;
  initialSongId?: string;
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
    const data: CreateWorkspaceRequest = req.body;

    if (!data.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const workspaceId = data.id || `workspace-${Date.now()}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO workspaces (id, name, description, cover_url, created_at, updated_at)
      VALUES (
        ${workspaceId},
        ${data.name},
        ${data.description || null},
        ${data.coverUrl || null},
        ${now},
        ${now}
      )
    `;

    // If an initial song is provided, add it to the workspace
    if (data.initialSongId) {
      // Remove from all other workspaces first (song can only be in one workspace)
      await sql`DELETE FROM workspace_songs WHERE song_id = ${data.initialSongId}`;
      
      await sql`
        INSERT INTO workspace_songs (workspace_id, song_id, added_at)
        VALUES (${workspaceId}, ${data.initialSongId}, ${now})
      `;
    }

    const workspace = {
      id: workspaceId,
      name: data.name,
      description: data.description || null,
      coverUrl: data.coverUrl || null,
      trackIds: data.initialSongId ? [data.initialSongId] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return res.status(200).json({
      success: true,
      workspace,
    });

  } catch (error) {
    console.error('Create workspace error:', error);
    return res.status(500).json({ 
      error: 'Failed to create workspace',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

