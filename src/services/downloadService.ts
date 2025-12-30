import { Track } from '../types';

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Convert a blob URL to a Blob object
 */
async function fetchAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Trigger browser download of a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download a track as MP3
 */
export async function downloadTrackAsMP3(track: Track): Promise<void> {
  const audioUrl = track.audioUrl || track.url;
  
  if (!audioUrl) {
    throw new Error('No audio URL available for this track');
  }

  try {
    const blob = await fetchAsBlob(audioUrl);
    const filename = `${sanitizeFilename(track.title)}_${sanitizeFilename(track.artist)}.mp3`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Failed to download track:', error);
    throw new Error('Failed to download track. Please try again.');
  }
}

/**
 * Download a track (format selection - WAV conversion not implemented, downloads as MP3)
 */
export async function downloadTrack(track: Track, format: 'mp3' | 'wav' = 'mp3'): Promise<void> {
  // Note: WAV conversion would require audio processing
  // For now, both formats download the original file
  const audioUrl = track.audioUrl || track.url;
  
  if (!audioUrl) {
    throw new Error('No audio URL available for this track');
  }

  try {
    const blob = await fetchAsBlob(audioUrl);
    const extension = format; // Using requested format as extension
    const filename = `${sanitizeFilename(track.title)}_${sanitizeFilename(track.artist)}.${extension}`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Failed to download track:', error);
    throw new Error('Failed to download track. Please try again.');
  }
}

/**
 * Download track cover art
 */
export async function downloadCoverArt(track: Track): Promise<void> {
  if (!track.coverUrl) {
    throw new Error('No cover art available for this track');
  }

  try {
    const blob = await fetchAsBlob(track.coverUrl);
    const extension = track.coverUrl.includes('.png') ? 'png' : 'jpg';
    const filename = `${sanitizeFilename(track.title)}_cover.${extension}`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Failed to download cover art:', error);
    throw new Error('Failed to download cover art. Please try again.');
  }
}

/**
 * Generate a shareable link for a track
 */
export function generateShareLink(track: Track): string {
  // For now, generate a local link - in production this would be a public URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/track/${track.id}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Share track via Web Share API (if available)
 */
export async function shareTrack(track: Track): Promise<boolean> {
  const shareData = {
    title: track.title,
    text: `Check out "${track.title}" by ${track.artist}`,
    url: generateShareLink(track),
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  }

  // Fallback to copying link
  return copyToClipboard(generateShareLink(track));
}

