/**
 * Audio Utility Functions
 * Helpers for audio processing, duration extraction, and validation
 */

/**
 * Extract the actual duration from an audio blob using Web Audio API
 * @param audioBlob - The audio blob to analyze
 * @returns Promise resolving to duration in seconds
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio();
    
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(audioUrl);
    };
    
    const onLoaded = () => {
      const duration = audio.duration;
      cleanup();
      if (isFinite(duration) && duration > 0) {
        resolve(Math.round(duration));
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    };
    
    const onError = (e: Event) => {
      cleanup();
      reject(new Error('Failed to load audio for duration extraction'));
    };
    
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.src = audioUrl;
    audio.load();
  });
}

/**
 * Extract duration from a blob URL
 * @param blobUrl - The blob URL to analyze
 * @returns Promise resolving to duration in seconds
 */
export async function getDurationFromBlobUrl(blobUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
    };
    
    const onLoaded = () => {
      const duration = audio.duration;
      cleanup();
      if (isFinite(duration) && duration > 0) {
        resolve(Math.round(duration));
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    };
    
    const onError = () => {
      cleanup();
      reject(new Error('Failed to load audio for duration extraction'));
    };
    
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.src = blobUrl;
    audio.load();
  });
}

/**
 * Check if the actual duration is within acceptable tolerance of expected
 * @param actual - Actual duration in seconds
 * @param expected - Expected duration in seconds
 * @param tolerancePercent - Tolerance percentage (default 15%)
 * @returns Object with isWithinTolerance flag and difference
 */
export function checkDurationTolerance(
  actual: number,
  expected: number,
  tolerancePercent: number = 15
): { isWithinTolerance: boolean; difference: number; differencePercent: number } {
  const difference = actual - expected;
  const differencePercent = Math.abs((difference / expected) * 100);
  const isWithinTolerance = differencePercent <= tolerancePercent;
  
  return {
    isWithinTolerance,
    difference,
    differencePercent: Math.round(differencePercent),
  };
}

/**
 * Format duration for display
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "1:30" or "2:05")
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Format duration with expected comparison
 * @param actual - Actual duration in seconds
 * @param expected - Expected duration in seconds (optional)
 * @returns Formatted string with comparison if different
 */
export function formatDurationWithComparison(
  actual: number,
  expected?: number
): string {
  const actualStr = formatDuration(actual);
  
  if (!expected || expected === actual) {
    return actualStr;
  }
  
  const diff = actual - expected;
  const sign = diff > 0 ? '+' : '';
  return `${actualStr} (${sign}${diff}s)`;
}
