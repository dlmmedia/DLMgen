import { v4 as uuidv4 } from 'uuid';
import { Track } from '../types';

// Base collection of working file paths (from local project)
// We will reuse these with different metadata to simulate a massive library
const basePaths = {
    ambient: [
        "/music/Ambient/01 - Reckless with Love.mp3", "/music/Ambient/02 - Bye-bye Earth.mp3", "/music/Ambient/03 - Star of Wonder.mp3",
        "/music/Ambient/04 - MAY DAY! MAY DAY!.mp3", "/music/Ambient/05 - Oh Holy Night.mp3", "/music/Ambient/06 - In the Flow.mp3",
        "/music/Ambient/07 - I feel Alright.mp3", "/music/Ambient/08 - Die Wi-fi lol alweer.mp3", "/music/Ambient/09 - The Milky Way.mp3",
        "/music/Ambient/10 - First Contact.mp3"
    ],
    edm: [
        "/music/EDM/01 - Bury Me On A Backroad (Ai Muzzik Cover).mp3", "/music/EDM/02 - Bass Start Bumpin.mp3", "/music/EDM/03 - PSYCHOTIC 🔞 (Spooked Edition) (Cover).mp3",
        "/music/EDM/04 - Simple Things In Life by Caio Klin (Cover).mp3", "/music/EDM/05 - Samuel Petra - BLUSH (Cover).mp3", "/music/EDM/06 - Stay Right Here.mp3",
        "/music/EDM/07 - Stone - (Ai Muzzik Remix).mp3", "/music/EDM/08 - CAROLINA.mp3", "/music/EDM/09 - The Boneyard Bounce (Cover).mp3",
        "/music/EDM/13 - Midnight Voicemail.mp3", "/music/EDM/14 - Find me (Remix).mp3", "/music/EDM/15 - Fallen Again.mp3"
    ],
    rock: [
        "/music/Rock/01 - soul ride.mp3", "/music/Rock/02 - Telepathy!.mp3", "/music/Rock/03 - Stay with you.mp3", "/music/Rock/04 - We are One.mp3",
        "/music/Rock/05 - Under the Moonlight.mp3", "/music/Rock/06 - A Lonely Heart.mp3", "/music/Rock/07 - Love on the Spectrum.mp3",
        "/music/Rock/08 - All the colors.mp3", "/music/Rock/09 - Longing for Connection.mp3", "/music/Rock/10 - Atlas Awakened.mp3"
    ]
};

// Helper: Pick random element
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generators for fake metadata
const adjectives = ['Ethereal', 'Heavy', 'Digital', 'Lost', 'Neon', 'Cosmic', 'Broken', 'Silent', 'Electric', 'Golden', 'Dark', 'Velvet', 'Crystal', 'Future', 'Retro', 'Lunar', 'Solar', 'Oceanic', 'Urban', 'Wild'];
const nouns = ['Dreams', 'Echoes', 'Vibes', 'Waves', 'Signals', 'Memories', 'Pulse', 'Heart', 'Sky', 'Night', 'Storm', 'Light', 'Shadow', 'Ghost', 'Machine', 'Soul', 'Voyage', 'Horizon', 'Glitch', 'Rhythm'];

function generateTitle() {
    return `${pick(adjectives)} ${pick(nouns)}`;
}

function generateArtist() {
    const prefixes = ['The', 'Dj', 'Project', 'System', 'Dr.', 'Lil', 'Big', 'Cyber', 'Analog'];
    const names = ['Nexus', 'Void', 'Aurora', 'Flux', 'Helix', 'Prism', 'Nova', 'Pulse', 'Vertex', 'Echo', 'Spectra', 'Zenith'];
    return Math.random() > 0.5 ? `${pick(prefixes)} ${pick(names)}` : pick(names);
}

// Generate X tracks
function generateMockTracks(count: number): Track[] {
    const tracks: Track[] = [];

    // 1. Add the "Real" named files first
    Object.entries(basePaths).forEach(([genre, paths]) => {
        paths.forEach((path, i) => {
            const filename = path.split('/').pop() || '';
            const title = filename.replace(/\.mp3$/, '').replace(/^\d+\s*-\s*/, '');
            tracks.push({
                id: `real-${genre}-${i}`,
                title: title,
                artist: 'Original Artist',
                url: path,
                genre: genre.charAt(0).toUpperCase() + genre.slice(1) as any,
                duration: 180 + Math.floor(Math.random() * 60),
                coverUrl: `https://picsum.photos/seed/${genre}${i}/300/300`,
                styleTags: [genre, 'Original', 'Showcase']
            });
        });
    });

    // 2. Generate procedural tracks pointing to the real files
    for (let i = 0; i < count; i++) {
        const genre = pick(['Ambient', 'EDM', 'Rock']);
        const style = genre.toLowerCase() as keyof typeof basePaths;
        const audioUrl = pick(basePaths[style]);

        tracks.push({
            id: `mock-${i}`,
            title: generateTitle(),
            artist: generateArtist(),
            url: audioUrl, // Reusing valid URL
            genre: genre as any,
            duration: 120 + Math.floor(Math.random() * 180),
            coverUrl: `https://picsum.photos/seed/${i + 100}/300/300`,
            styleTags: [genre, pick(adjectives), pick(nouns)],
            description: `A ${pick(adjectives).toLowerCase()} ${genre.toLowerCase()} track about ${pick(nouns).toLowerCase()}.`
        });
    }

    return tracks;
}

// Generate ~200 tracks
export const TRACKS: Track[] = generateMockTracks(200);
