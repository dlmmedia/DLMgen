import { Track, GeneratedMetadata } from '../types';

export function selectTrackForMetadata(metadata: GeneratedMetadata, tracks: Track[], excludeIds: string[] = []): Track {
    const styleTags = metadata.styleTags.map(t => t.toLowerCase());

    // Filter out excluded IDs first
    const availableTracks = tracks.filter(t => !excludeIds.includes(t.id));

    // If we exhausted everything (unlikely with hundreds), fallback to all
    const pool = availableTracks.length > 0 ? availableTracks : tracks;

    // Scoring system
    const scoredTracks = pool.map(track => {
        let score = 0;
        const genre = track.genre.toLowerCase();

        // Direct genre match
        if (styleTags.some(tag => tag.includes(genre) || genre.includes(tag))) {
            score += 5;
        }

        // Specific mood/style keywords mapping (simple heuristics)
        if (genre === 'ambient') {
            if (styleTags.some(t => t.match(/calm|peaceful|relax|sleep|meditat|soft/))) score += 2;
            if (styleTags.some(t => t.match(/upbeat|dance|party|hard/))) score -= 2;
        }
        if (genre === 'edm') {
            if (styleTags.some(t => t.match(/upbeat|dance|electronic|party|club|bass/))) score += 2;
            if (styleTags.some(t => t.match(/rock|metal|guitar|acoustic/))) score -= 1;
        }
        if (genre === 'rock') {
            if (styleTags.some(t => t.match(/rock|guitar|band|heavy|metal/))) score += 2;
            if (styleTags.some(t => t.match(/electronic|synth|ambient/))) score -= 1;
        }

        // Randomize slightly to not always pick the same one for same genre
        score += Math.random();

        return { track, score };
    });

    // Sort by score descending
    scoredTracks.sort((a, b) => b.score - a.score);

    // Return best match, fallback to random if everything is low/zero
    return scoredTracks[0].track;
}
