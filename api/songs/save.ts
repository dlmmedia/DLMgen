import { put, list } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface SaveSongRequest {
  id: string;
  title: string;
  artist: string;
  audioUrl: string; // Source audio URL to copy
  genre: string;
  duration: number;
  coverUrl?: string;
  coverBase64?: string; // Base64 image data for generated covers
  lyrics?: string;
  styleTags?: string[];
  description?: string;
  isInstrumental?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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
    const songData: SaveSongRequest = req.body;

    if (!songData.id || !songData.title) {
      return res.status(400).json({ error: 'Missing required fields: id, title' });
    }

    // Handle cover image - upload to blob if base64 provided
    let finalCoverUrl = songData.coverUrl || '';
    if (songData.coverBase64) {
      try {
        // Extract the actual base64 data (remove data:image/...;base64, prefix)
        const base64Match = songData.coverBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = mimeType.split('/')[1] || 'png';
          
          const coverBlob = await put(`covers/${songData.id}.${ext}`, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          finalCoverUrl = coverBlob.url;
        }
      } catch (coverError) {
        console.error('Failed to upload cover:', coverError);
        // Fall back to placeholder
        finalCoverUrl = `https://picsum.photos/seed/${songData.id}/300/300`;
      }
    }

    // Create song metadata JSON
    const songMetadata = {
      id: songData.id,
      title: songData.title,
      artist: songData.artist,
      audioUrl: songData.audioUrl,
      genre: songData.genre,
      duration: songData.duration,
      coverUrl: finalCoverUrl,
      lyrics: songData.lyrics || '',
      styleTags: songData.styleTags || [],
      description: songData.description || '',
      isInstrumental: songData.isInstrumental || false,
      createdAt: Date.now(),
    };

    // Save metadata to blob storage
    const metadataBlob = await put(
      `songs/${songData.id}.json`,
      JSON.stringify(songMetadata),
      {
        access: 'public',
        contentType: 'application/json',
      }
    );

    return res.status(200).json({
      success: true,
      song: songMetadata,
      metadataUrl: metadataBlob.url,
    });

  } catch (error) {
    console.error('Save song error:', error);
    return res.status(500).json({ 
      error: 'Failed to save song',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
