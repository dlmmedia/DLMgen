import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface CreatePlaylistRequest {
  id?: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isPublic?: boolean;
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
    const data: CreatePlaylistRequest = req.body;

    if (!data.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const playlistId = data.id || `playlist-${Date.now()}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO playlists (id, name, description, cover_url, is_public, created_at, updated_at)
      VALUES (
        ${playlistId},
        ${data.name},
        ${data.description || null},
        ${data.coverUrl || null},
        ${data.isPublic || false},
        ${now},
        ${now}
      )
    `;

    // If an initial song is provided, add it to the playlist
    if (data.initialSongId) {
      await sql`
        INSERT INTO playlist_songs (playlist_id, song_id, position, added_at)
        VALUES (${playlistId}, ${data.initialSongId}, 0, ${now})
        ON CONFLICT DO NOTHING
      `;
    }

    const playlist = {
      id: playlistId,
      name: data.name,
      description: data.description || null,
      coverUrl: data.coverUrl || null,
      isPublic: data.isPublic || false,
      trackIds: data.initialSongId ? [data.initialSongId] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return res.status(200).json({
      success: true,
      playlist,
    });

  } catch (error) {
    console.error('Create playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to create playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

