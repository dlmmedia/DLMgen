import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

interface UpdateSongRequest {
  id: string;
  title?: string;
  description?: string;
  styleTags?: string[];
  lyrics?: string;
  genre?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const updateData: UpdateSongRequest = req.body;

    if (!updateData.id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }

    // Build dynamic update query
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.title !== undefined) {
      updates.push('title = $' + (values.length + 1));
      values.push(updateData.title);
    }
    if (updateData.description !== undefined) {
      updates.push('description = $' + (values.length + 1));
      values.push(updateData.description);
    }
    if (updateData.styleTags !== undefined) {
      updates.push('style_tags = $' + (values.length + 1));
      values.push(updateData.styleTags);
    }
    if (updateData.lyrics !== undefined) {
      updates.push('lyrics = $' + (values.length + 1));
      values.push(updateData.lyrics);
    }
    if (updateData.genre !== undefined) {
      updates.push('genre = $' + (values.length + 1));
      values.push(updateData.genre);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at
    updates.push('updated_at = $' + (values.length + 1));
    values.push(now);

    // Add id for WHERE clause
    values.push(updateData.id);

    // Execute update using tagged template - but we need raw query for dynamic updates
    await sql`
      UPDATE songs 
      SET 
        title = COALESCE(${updateData.title}, title),
        description = COALESCE(${updateData.description}, description),
        style_tags = COALESCE(${updateData.styleTags}, style_tags),
        lyrics = COALESCE(${updateData.lyrics}, lyrics),
        genre = COALESCE(${updateData.genre}, genre),
        updated_at = ${now}
      WHERE id = ${updateData.id}
    `;

    // Fetch the updated song
    const result = await sql`
      SELECT 
        id, title, artist, audio_url, cover_url, genre, duration,
        lyrics, style_tags, description, is_instrumental, bpm,
        key_signature, vocal_style, created_at, updated_at,
        expected_duration, actual_duration
      FROM songs 
      WHERE id = ${updateData.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const row = result[0];
    const song = {
      id: row.id,
      title: row.title,
      artist: row.artist,
      audioUrl: row.audio_url,
      url: row.audio_url,
      coverUrl: row.cover_url,
      genre: row.genre,
      duration: row.actual_duration || row.duration,
      expectedDuration: row.expected_duration,
      actualDuration: row.actual_duration,
      lyrics: row.lyrics,
      styleTags: row.style_tags || [],
      description: row.description,
      isInstrumental: row.is_instrumental,
      bpm: row.bpm,
      keySignature: row.key_signature,
      vocalStyle: row.vocal_style,
      createdAt: new Date(row.created_at).getTime(),
    };

    return res.status(200).json({
      success: true,
      song,
    });

  } catch (error) {
    console.error('Update song error:', error);
    return res.status(500).json({ 
      error: 'Failed to update song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
