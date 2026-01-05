/**
 * Track Service
 * Handles track metadata updates and management
 */

import { Track } from '../types';

const getApiBase = () => '/api';

export interface UpdateTrackParams {
  title?: string;
  description?: string;
  styleTags?: string[];
  lyrics?: string;
  genre?: string;
}

/**
 * Update track metadata in the database
 */
export async function updateTrack(trackId: string, updates: UpdateTrackParams): Promise<Track> {
  const response = await fetch(`${getApiBase()}/songs/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: trackId,
      ...updates,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update track: ${response.status}`);
  }

  const data = await response.json();
  return data.song as Track;
}

/**
 * Batch update multiple tracks
 */
export async function updateTracks(
  updates: Array<{ id: string; updates: UpdateTrackParams }>
): Promise<Track[]> {
  const results = await Promise.all(
    updates.map(({ id, updates }) => updateTrack(id, updates))
  );
  return results;
}
