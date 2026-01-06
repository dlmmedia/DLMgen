import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing playlist ID' });
    }

    const playlists = await sql`
      SELECT * FROM playlists WHERE id = ${id}
    `;

    if (playlists.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = playlists[0];

    // Get songs in this playlist with full song data
    const songs = await sql`
      SELECT s.*, ps.position
      FROM songs s
      JOIN playlist_songs ps ON s.id = ps.song_id
      WHERE ps.playlist_id = ${id}
      ORDER BY ps.position
    `;

    const transformedSongs = songs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      audioUrl: song.audio_url,
      url: song.audio_url,
      genre: song.genre,
      duration: song.duration,
      coverUrl: song.cover_url,
      lyrics: song.lyrics,
      styleTags: song.style_tags,
      description: song.description,
      isInstrumental: song.is_instrumental,
      createdAt: new Date(song.created_at).getTime(),
    }));

    return res.status(200).json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.cover_url,
        isPublic: playlist.is_public,
        trackIds: songs.map(s => s.id),
        createdAt: new Date(playlist.created_at).getTime(),
        updatedAt: new Date(playlist.updated_at).getTime(),
      },
      songs: transformedSongs,
    });

  } catch (error) {
    console.error('Get playlist error:', error);
    return res.status(500).json({ 
      error: 'Failed to get playlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


