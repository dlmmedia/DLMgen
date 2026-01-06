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
      return res.status(400).json({ error: 'Missing playlist ID' });
    }

    // Delete playlist (cascade will delete playlist_songs entries)
    const result = await sql`
      DELETE FROM playlists WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Deleted playlist ${id}`,
    });

  } catch (error) {
    console.error('Delete playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


