import { del, list } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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
      return res.status(400).json({ error: 'Missing song ID' });
    }

    // Find and delete all blobs associated with this song
    const { blobs } = await list({ prefix: `songs/${id}` });
    const coverBlobs = await list({ prefix: `covers/${id}` });
    
    const allBlobs = [...blobs, ...coverBlobs.blobs];
    
    if (allBlobs.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Delete all related blobs
    for (const blob of allBlobs) {
      await del(blob.url);
    }

    return res.status(200).json({
      success: true,
      message: `Deleted song ${id} and ${allBlobs.length} associated files`,
    });

  } catch (error) {
    console.error('Delete song error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
