import { list } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StoredSong {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  genre: string;
  duration: number;
  coverUrl: string;
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
  createdAt: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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
    // List all song metadata files
    const { blobs } = await list({ prefix: 'songs/' });

    // Fetch and parse each song's metadata
    const songs: StoredSong[] = [];
    
    for (const blob of blobs) {
      if (blob.pathname.endsWith('.json')) {
        try {
          const response = await fetch(blob.url);
          if (response.ok) {
            const songData = await response.json() as StoredSong;
            songs.push(songData);
          }
        } catch (fetchError) {
          console.error(`Failed to fetch song metadata: ${blob.pathname}`, fetchError);
        }
      }
    }

    // Sort by createdAt (newest first)
    songs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json({
      success: true,
      songs,
      count: songs.length,
    });

  } catch (error) {
    console.error('List songs error:', error);
    return res.status(500).json({ 
      error: 'Failed to list songs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
