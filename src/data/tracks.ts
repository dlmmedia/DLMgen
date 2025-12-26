import { Track, Genre, Creator } from '../types';

// Base collection of working file paths (from local project)
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

// All audio paths for random assignment
const allAudioPaths = [...basePaths.ambient, ...basePaths.edm, ...basePaths.rock];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Genre-specific song data for realistic tracks
const songData: Record<Genre, { titles: string[], artists: string[], tags: string[] }> = {
    'J-Trap': {
        titles: ["I'm not sure", "Tokyo Drift", "Neon Samurai", "Shibuya Nights", "Digital Ronin", "Cherry Blossom Beat", "Akira Dreams"],
        artists: ["Fire Lit AI", "YUKI BEATS", "Sakura Sound", "Neo Tokyo", "Hana Music"],
        tags: ["J-Trap", "Autotune Rap", "Comical", "Japanese", "Bass"]
    },
    'Pop': {
        titles: ["Dancing in the Moonlight", "Summer Love", "Heartbeat", "You and Me", "Forever Young", "Starlight", "Golden Hour"],
        artists: ["Luna", "Stella Pop", "The Dreamers", "Sunset Club", "Melody Makers"],
        tags: ["Pop", "Dance", "Radio Hit", "Catchy", "Upbeat"]
    },
    'Hip-Hop': {
        titles: ["Street Dreams", "Rise Up", "Hustle Hard", "City Lights", "Real Talk", "Crown Me", "Legacy"],
        artists: ["MC Flux", "King Verse", "The Foundation", "Street Poets", "Lyric Lords"],
        tags: ["Hip-Hop", "Rap", "Boom Bap", "Urban", "Flow"]
    },
    'Lo-fi': {
        titles: ["Neon Forever", "Rainy Day Study", "Coffee Shop Vibes", "Midnight Thoughts", "Dreamy Afternoons", "Chill Session"],
        artists: ["JamesLook", "Lo-fi Larry", "Chill Beats Co", "Study Sounds", "Mellow Mind"],
        tags: ["lo-fi", "indie folk", "chill", "study", "relaxing"]
    },
    'Folk': {
        titles: ["Azalea Lights", "Mountain Song", "River Dreams", "Homeward Bound", "Wildflower", "Dusty Roads"],
        artists: ["Professor Joseph Hamburger", "The Wanderers", "Acoustic Soul", "Timber Creek", "Forest Folk"],
        tags: ["Lo-fi", "70s folk rock", "shakers", "acoustic", "earthy"]
    },
    'Rock': {
        titles: ["You tune my lips to sing", "Winning the Game", "Thunder Road", "Rebel Heart", "Electric Soul", "Breaking Free"],
        artists: ["Jojo", "Rock Legends", "The Amplifiers", "Stone Cold", "Power Chord"],
        tags: ["rock ballad", "soft rock ballad", "arena rock", "guitar", "powerful"]
    },
    'EDM': {
        titles: ["Bass Drop", "Rave Nation", "Electric Dreams", "Pulse", "Synth Wave", "Festival Anthem"],
        artists: ["DJ Nexus", "Beat Factory", "Synth Lords", "Drop Zone", "Rave Master"],
        tags: ["EDM", "Electronic", "Dance", "Festival", "Bass"]
    },
    'R&B': {
        titles: ["Вместе этот мир не увидит нас", "Midnight Serenade", "Velvet Touch", "Slow Dance", "Soulful Nights"],
        artists: ["Ruskolan", "Soul Sisters", "Velvet Voice", "Rhythm & Blues Co", "Smooth Operator"],
        tags: ["ведьмин дом", "romantic", "лоу флай", "smooth", "soulful"]
    },
    'Ambient': {
        titles: ["Cosmic Drift", "Stellar Meditation", "Ocean of Stars", "Void Walker", "Ethereal Space"],
        artists: ["Space Ambient", "Cosmic Sound", "Ethereal Waves", "Void Music", "Stargazer"],
        tags: ["Ambient", "Space", "Meditation", "Atmospheric", "Calm"]
    },
    'Jazz': {
        titles: ["Midnight in Paris", "Smoky Lounge", "Blue Notes", "Swing Time", "Bebop Dreams"],
        artists: ["Jazz Collective", "Blue Note Trio", "Swing Kings", "Smooth Jazz Inc", "The Standards"],
        tags: ["Jazz", "Smooth", "Swing", "Classic", "Sophisticated"]
    },
    'Classical': {
        titles: ["Symphony No. 9", "Moonlight Sonata", "Four Seasons", "Nocturne", "Prelude in C"],
        artists: ["Orchestra AI", "Piano Masters", "String Ensemble", "Classical Dreams", "Opus One"],
        tags: ["Classical", "Orchestral", "Piano", "Elegant", "Timeless"]
    },
    'Country': {
        titles: ["Need To Forget You", "Backroad Memories", "Whiskey Sunset", "Honky Tonk Heart", "Truck Stop"],
        artists: ["Groove NCS Music", "Country Roads", "Nashville Sound", "Dusty Boots", "Southern Comfort"],
        tags: ["hard rock", "arena rock", "country", "guitar", "heartfelt"]
    },
    'Metal': {
        titles: ["Fury Unleashed", "Iron Will", "Dark Descent", "Chaos Reign", "Shattered Glass"],
        artists: ["Metal Forge", "Iron Lords", "Chaos Theory", "Dark Empire", "Steel Dragon"],
        tags: ["Metal", "Heavy", "Aggressive", "Powerful", "Intense"]
    },
    'Indie': {
        titles: ["nikiDUA - How Are You Today?", "Basement Tapes", "Garage Dreams", "DIY Love", "Underground"],
        artists: ["nikiDORA nikiDUA", "Indie Kids", "Basement Dwellers", "The Unknowns", "DIY Records"],
        tags: ["grumpy old man vocal", "old male vocal", "guitar slap", "indie", "authentic"]
    },
    'Soul': {
        titles: ["Come What May", "Heart and Soul", "Deep Feelings", "Motown Magic", "Soul Fire"],
        artists: ["Weaver of Moments💛", "Soul Brothers", "Motown Revival", "Heart & Soul", "Soulful Sound"],
        tags: ["and hi-hats", "with a bright", "soul", "emotional", "powerful"]
    },
    'Funk': {
        titles: ["Get Up and Dance", "Funky Town", "Groove Machine", "Bass Line", "Disco Inferno"],
        artists: ["Funk Factory", "Groove Masters", "Bass Brothers", "Disco Kings", "Funkadelic"],
        tags: ["Funk", "Groove", "Disco", "Bass", "Dance"]
    },
    'Reggae': {
        titles: ["Island Vibes", "One Love", "Rasta Heart", "Sunshine Day", "Jamaican Dream"],
        artists: ["Island Sound", "Rasta Roots", "Caribbean Beats", "One Love Band", "Sunshine Reggae"],
        tags: ["Reggae", "Island", "Chill", "Roots", "Caribbean"]
    },
    'Blues': {
        titles: ["Crossroads", "Delta Dawn", "Muddy Waters", "Chicago Nights", "Blues for You"],
        artists: ["Blues Brothers", "Delta Sound", "Chicago Blues", "Muddy Soul", "Blues Legend"],
        tags: ["Blues", "Delta", "Soul", "Guitar", "Classic"]
    },
    'Punk': {
        titles: ["Anarchy Now", "Rebel Yell", "No Future", "Street Fighter", "Riot Act"],
        artists: ["Punk Rock Inc", "The Anarchists", "Street Punks", "Rebel Alliance", "Chaos Crew"],
        tags: ["Punk", "Raw", "Fast", "Rebellious", "Energy"]
    },
    'Electronic': {
        titles: ["午夜女王💙", "Circuit Board", "Digital Love", "Cyber Space", "Neon City"],
        artists: ["Synth Wave", "Digital Dreams", "Cyber Sound", "Electronic Arts", "Neon Lights"],
        tags: ["acid house cars", "warm 808", "acid kicks", "body shaker", "high hats"]
    },
    'Other': {
        titles: ["Experimental", "Unknown Genre", "Fusion", "Mixed Bag", "Eclectic"],
        artists: ["Various Artists", "Unknown", "Experimental Lab", "Fusion Masters", "Eclectic Sound"],
        tags: ["Experimental", "Fusion", "Unique", "Creative", "Different"]
    }
};

// Generate diverse tracks
function generateTracks(): Track[] {
    const tracks: Track[] = [];
    const genres: Genre[] = ['J-Trap', 'Lo-fi', 'Folk', 'Rock', 'R&B', 'Country', 'Indie', 'Soul', 'Electronic', 'Pop', 'Hip-Hop', 'EDM', 'Ambient', 'Jazz', 'Metal'];
    
    // Generate 6 tracks per genre for "For You" and "Trending"
    genres.forEach((genre, genreIndex) => {
        const data = songData[genre];
        for (let i = 0; i < 6; i++) {
            const title = data.titles[i % data.titles.length];
            const artist = data.artists[i % data.artists.length];
            tracks.push({
                id: `${genre.toLowerCase().replace(/[^a-z0-9]/g, '')}-${i}`,
                title: title,
                artist: artist,
                url: pick(allAudioPaths),
                genre: genre,
                duration: randInt(150, 240),
                coverUrl: `https://picsum.photos/seed/${genre}${i}/300/300`,
                styleTags: data.tags.slice(0, 3),
                plays: randInt(1000, 50000),
                likes: randInt(50, 2000),
                comments: randInt(0, 150),
                isVerified: Math.random() > 0.7,
                createdAt: Date.now() - randInt(0, 30 * 24 * 60 * 60 * 1000) // Last 30 days
            });
        }
    });
    
    return tracks;
}

// Suggested creators
export const CREATORS: Creator[] = [
    { id: 'c1', name: 'DSK', handle: '@kanherkards_04', avatarUrl: 'https://picsum.photos/seed/dsk/100/100', followers: 1200, isVerified: true, isSuggested: true },
    { id: 'c2', name: 'Giaguaro', handle: '@giaguaro63', avatarUrl: 'https://picsum.photos/seed/giag/100/100', followers: 4500, isVerified: true, isSuggested: true },
    { id: 'c3', name: 'JPichardo', handle: '@jpichardo', avatarUrl: 'https://picsum.photos/seed/jpich/100/100', followers: 1700, isVerified: false, isSuggested: true },
    { id: 'c4', name: 'Nada', handle: '@nada5321', avatarUrl: 'https://picsum.photos/seed/nada/100/100', followers: 176, isVerified: false, isSuggested: true },
    { id: 'c5', name: 'NifumeSound', handle: '@nifumesound', avatarUrl: 'https://picsum.photos/seed/nifu/100/100', followers: 2100, isVerified: true, isSuggested: true },
    { id: 'c6', name: 'BeatMaster', handle: '@beatmaster', avatarUrl: 'https://picsum.photos/seed/beat/100/100', followers: 8500, isVerified: true, isSuggested: true },
];

export const TRACKS: Track[] = generateTracks();
