import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing workspace ID' });
    }

    // Don't allow deleting the default workspace
    if (id === 'workspace-default') {
      return res.status(400).json({ error: 'Cannot delete the default workspace' });
    }

    // Move songs from this workspace to the default workspace
    await sql`
      UPDATE workspace_songs 
      SET workspace_id = 'workspace-default'
      WHERE workspace_id = ${id}
    `;

    // Delete the workspace
    const result = await sql`
      DELETE FROM workspaces WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Update default workspace timestamp
    await sql`
      UPDATE workspaces SET updated_at = NOW() WHERE id = 'workspace-default'
    `;

    return res.status(200).json({
      success: true,
      message: `Deleted workspace ${id}, songs moved to default workspace`,
    });

  } catch (error) {
    console.error('Delete workspace error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete workspace',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


