import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface MoveSongRequest {
  songId: string;
  workspaceId: string;
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
    const data: MoveSongRequest = req.body;

    if (!data.songId || !data.workspaceId) {
      return res.status(400).json({ error: 'Missing required fields: songId, workspaceId' });
    }

    // Check if workspace exists
    const workspaces = await sql`SELECT id FROM workspaces WHERE id = ${data.workspaceId}`;
    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if song exists
    const songs = await sql`SELECT id FROM songs WHERE id = ${data.songId}`;
    if (songs.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Remove song from all workspaces first (song can only be in one workspace)
    await sql`DELETE FROM workspace_songs WHERE song_id = ${data.songId}`;

    // Add song to the target workspace
    await sql`
      INSERT INTO workspace_songs (workspace_id, song_id, added_at)
      VALUES (${data.workspaceId}, ${data.songId}, NOW())
    `;

    // Update workspace timestamp
    await sql`
      UPDATE workspaces SET updated_at = NOW() WHERE id = ${data.workspaceId}
    `;

    return res.status(200).json({
      success: true,
      message: `Moved song ${data.songId} to workspace ${data.workspaceId}`,
    });

  } catch (error) {
    console.error('Move song error:', error);
    return res.status(500).json({ 
      error: 'Failed to move song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


