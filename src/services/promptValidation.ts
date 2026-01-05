/**
 * Prompt Validation Service
 * 
 * Client-side validation for music generation prompts.
 * Allows generic musical references while blocking actual copyrighted content.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  warningLevel?: 'none' | 'info' | 'warning' | 'error';
}

// Classical works and compositions that should be ALLOWED
const ALLOWED_CLASSICAL_WORKS = [
  'canon in d', 'canon d', 'pachelbel', 'pachelbel canon',
  'fur elise', 'moonlight sonata', 'clair de lune',
  'swan lake', 'nutcracker', 'four seasons', 'vivaldi',
  'beethoven', 'mozart', 'bach', 'chopin', 'debussy',
  'symphony no', 'concerto', 'sonata', 'prelude', 'fugue',
  'nocturne', 'waltz', 'etude', 'rhapsody', 'requiem',
  'ave maria', 'hallelujah', 'ode to joy',
  'ride of the valkyries', 'flight of the bumblebee',
  'hungarian rhapsody', 'turkish march', 'spring',
  'winter', 'summer', 'autumn', 'the planets',
];

// Musical terms that should be ALLOWED
const ALLOWED_MUSICAL_TERMS = [
  // Genres
  'rock', 'pop', 'jazz', 'blues', 'country', 'folk', 'classical',
  'electronic', 'edm', 'hip hop', 'rap', 'r&b', 'soul', 'funk',
  'reggae', 'metal', 'punk', 'indie', 'ambient', 'lo-fi', 'lofi',
  'trap', 'house', 'techno', 'dubstep', 'drum and bass', 'dnb',
  'trance', 'progressive', 'psychedelic', 'disco', 'synthwave',
  'vaporwave', 'chillwave', 'shoegaze', 'grunge', 'alternative',
  'orchestra', 'orchestral', 'cinematic', 'epic', 'dramatic',
  'acoustic', 'unplugged', 'ballad', 'anthem', 'hymn',
  
  // Instruments
  'piano', 'guitar', 'violin', 'cello', 'drums', 'bass',
  'saxophone', 'trumpet', 'flute', 'clarinet', 'oboe',
  'harp', 'organ', 'synthesizer', 'synth', 'keyboard',
  'strings', 'brass', 'woodwinds', 'percussion',
  
  // Musical terms
  'melody', 'harmony', 'rhythm', 'beat', 'tempo', 'bpm',
  'chord', 'progression', 'key', 'minor', 'major', 'scale',
  'verse', 'chorus', 'bridge', 'intro', 'outro', 'hook',
  'riff', 'solo', 'instrumental', 'vocal', 'vocals',
  'soprano', 'alto', 'tenor', 'baritone', 'bass voice',
  'duet', 'trio', 'quartet', 'choir', 'ensemble',
  
  // Moods and styles
  'upbeat', 'mellow', 'chill', 'relaxing', 'energetic',
  'melancholic', 'nostalgic', 'romantic', 'dark', 'bright',
  'dreamy', 'ethereal', 'powerful', 'gentle', 'aggressive',
  'happy', 'sad', 'angry', 'peaceful', 'intense',
  
  // Descriptors
  'catchy', 'groovy', 'smooth', 'raw', 'polished',
  'minimalist', 'complex', 'simple', 'layered',
];

// Generic song/band name patterns that should be ALLOWED
const ALLOWED_NAME_PATTERNS = [
  // Spanish/Portuguese/Italian common phrases
  /^los\s+\w+$/i,        // Los Tres, Los Hermanos, etc.
  /^las\s+\w+$/i,        // Las Vegas, etc.
  /^el\s+\w+$/i,         // El Camino, etc.
  /^la\s+\w+$/i,         // La Bamba, etc.
  /^tres\s+\w+$/i,       // Tres Hermanos, etc.
  /^hermanos?\s*$/i,     // Hermanos, Hermano
  
  // Common band name patterns
  /^the\s+\w+$/i,        // The Beatles style (but not actual band names)
  /^(black|white|red|blue|green)\s+\w+$/i,  // Color + noun patterns
  
  // Generic descriptive names
  /^(midnight|sunrise|sunset|dawn|dusk)\s+\w+$/i,
  /^(fire|water|earth|wind|air)\s+\w+$/i,
  /^(electric|acoustic|cosmic|stellar)\s+\w+$/i,
];

// Patterns that indicate potential copyright issues (multi-line exact lyrics)
// These are patterns that suggest someone is pasting actual copyrighted lyrics
const BLOCKED_PATTERNS = [
  // Very long verbatim text (likely pasted lyrics)
  /(.+\n){10,}/,  // More than 10 lines of text might be pasted lyrics
  
  // Known copyright phrases (famous lyrics that are very specific)
  /never gonna give you up.*never gonna let you down/i,
  /we will we will rock you/i,
  /all you need is love.*love is all you need/i,
  /yesterday.*all my troubles seemed so far away/i,
  /bohemian rhapsody/i,
  
  // Explicit content markers
  /\b(fuck|shit|bitch|nigga|nigger)\b/gi, // Block explicit slurs
];

// Artist names that might trigger false positives but should be allowed as style references
const ALLOWED_ARTIST_REFERENCES = [
  'in the style of',
  'like', 'similar to', 'inspired by',
  'genre', 'type of', 'kind of',
];

/**
 * Check if a prompt contains allowed classical works
 */
function containsAllowedClassical(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return ALLOWED_CLASSICAL_WORKS.some(work => lower.includes(work));
}

/**
 * Check if a prompt is primarily musical terminology
 */
function isPrimarilyMusicalTerms(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return false;
  
  const musicalWords = words.filter(word => 
    ALLOWED_MUSICAL_TERMS.some(term => word.includes(term) || term.includes(word))
  );
  
  // If more than 30% of words are musical terms, it's probably fine
  return musicalWords.length / words.length > 0.3;
}

/**
 * Check if prompt matches allowed name patterns
 */
function matchesAllowedNamePattern(prompt: string): boolean {
  return ALLOWED_NAME_PATTERNS.some(pattern => pattern.test(prompt.trim()));
}

/**
 * Check if prompt contains blocked patterns
 */
function containsBlockedPatterns(prompt: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) {
      if (pattern.toString().includes('fuck|shit|bitch')) {
        return { 
          blocked: true, 
          reason: 'Prompt contains explicit language. Consider using cleaner alternatives.' 
        };
      }
      return { 
        blocked: true, 
        reason: 'This appears to contain copyrighted lyrics. Try describing the song you want instead.' 
      };
    }
  }
  return { blocked: false };
}

/**
 * Generate helpful suggestions based on what was blocked
 */
function generateSuggestion(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  // If it looks like someone tried to paste lyrics
  if (prompt.includes('\n') && prompt.split('\n').length > 5) {
    return 'Instead of pasting lyrics, try describing the song: "A melancholic ballad about lost love with piano and strings"';
  }
  
  // If it mentions a specific song
  if (lower.includes('song') || lower.includes('track') || lower.includes('single')) {
    return 'Try describing the mood and style you want: "An upbeat pop song with 80s synthesizers and energetic drums"';
  }
  
  // Default suggestion
  return 'Describe the music you want: genre, mood, instruments, tempo, and theme work best!';
}

/**
 * Validate a prompt for music generation
 * Returns validation result with helpful feedback
 */
export function validatePrompt(prompt: string): ValidationResult {
  // Empty prompt is handled elsewhere
  if (!prompt || !prompt.trim()) {
    return { isValid: true, warningLevel: 'none' };
  }
  
  const trimmed = prompt.trim();
  
  // Check for blocked patterns first
  const blockedCheck = containsBlockedPatterns(trimmed);
  if (blockedCheck.blocked) {
    return {
      isValid: false,
      error: blockedCheck.reason,
      suggestion: generateSuggestion(trimmed),
      warningLevel: 'error',
    };
  }
  
  // Allow classical works explicitly
  if (containsAllowedClassical(trimmed)) {
    return { isValid: true, warningLevel: 'none' };
  }
  
  // Allow if primarily musical terminology
  if (isPrimarilyMusicalTerms(trimmed)) {
    return { isValid: true, warningLevel: 'none' };
  }
  
  // Allow generic name patterns (Los Tres Hermanos, etc.)
  if (matchesAllowedNamePattern(trimmed)) {
    return { isValid: true, warningLevel: 'none' };
  }
  
  // Allow short, simple prompts (likely descriptions)
  if (trimmed.length < 200 && !trimmed.includes('\n')) {
    return { isValid: true, warningLevel: 'none' };
  }
  
  // Warn about very long prompts (might be pasted content)
  if (trimmed.length > 500) {
    return {
      isValid: true,
      warningLevel: 'warning',
      suggestion: 'Long prompts work better when they describe style and mood rather than including full lyrics.',
    };
  }
  
  // Default: allow with no warnings
  return { isValid: true, warningLevel: 'none' };
}

/**
 * Get real-time validation feedback as user types
 */
export function getPromptFeedback(prompt: string): {
  status: 'valid' | 'warning' | 'error';
  message?: string;
} {
  const result = validatePrompt(prompt);
  
  if (!result.isValid) {
    return {
      status: 'error',
      message: result.error,
    };
  }
  
  if (result.warningLevel === 'warning') {
    return {
      status: 'warning',
      message: result.suggestion,
    };
  }
  
  return { status: 'valid' };
}
