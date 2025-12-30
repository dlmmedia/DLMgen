import { del, list } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

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

    // First, get the song to find its audio and cover URLs
    const songs = await sql`SELECT audio_url, cover_url FROM songs WHERE id = ${id}`;
    
    if (songs.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = songs[0];

    // Delete from Neon database first
    await sql`DELETE FROM songs WHERE id = ${id}`;

    // Delete associated files from Vercel Blob
    let deletedFiles = 0;
    
    // Delete audio file if it's stored in Vercel Blob
    if (song.audio_url && song.audio_url.includes('vercel-storage.com')) {
      try {
        await del(song.audio_url);
        deletedFiles++;
      } catch (e) {
        console.warn('Failed to delete audio file:', e);
      }
    }

    // Delete cover file if it's stored in Vercel Blob
    if (song.cover_url && song.cover_url.includes('vercel-storage.com')) {
      try {
        await del(song.cover_url);
        deletedFiles++;
      } catch (e) {
        console.warn('Failed to delete cover file:', e);
      }
    }

    // Also try to find any legacy blob files with this ID prefix
    try {
      const { blobs: audioBlobs } = await list({ prefix: `audio/${id}` });
      const { blobs: coverBlobs } = await list({ prefix: `covers/${id}` });
      const { blobs: songBlobs } = await list({ prefix: `songs/${id}` });
      
      const allBlobs = [...audioBlobs, ...coverBlobs, ...songBlobs];
      for (const blob of allBlobs) {
        try {
          await del(blob.url);
          deletedFiles++;
        } catch (e) {
          console.warn('Failed to delete blob:', blob.url, e);
        }
      }
    } catch (e) {
      console.warn('Failed to list/delete legacy blobs:', e);
    }

    return res.status(200).json({
      success: true,
      message: `Deleted song ${id} and ${deletedFiles} associated files`,
    });

  } catch (error) {
    console.error('Delete song error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
