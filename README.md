<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Music Generator

An AI-powered music generation app built with React, Vite, and Google Gemini. Generated songs are stored using Vercel Blob storage.

## Features

- 🎵 AI-powered song generation with customizable prompts
- 🎨 AI-generated album artwork
- 📚 Persistent song library using Vercel Blob storage
- 🎧 Built-in audio player
- 🌈 Beautiful dark-themed UI

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then fill in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```
   If you change `.env.local`, restart the dev server (and avoid leading/trailing spaces in keys).

3. Run the development server:

   **Option A: Using Vercel CLI (Recommended - Full API support)**
   ```bash
   npx vercel dev
   ```
   This runs both the frontend and API routes. The API will be available at `http://localhost:3000/api/*`

   **Option B: Using Vite only (Frontend only - API routes won't work)**
   ```bash
   npm run dev
   ```
   ⚠️ **Note**: If you use `npm run dev`, the Vite proxy will handle `/api/elevenlabs/generate`, but other API routes (like `/api/songs/*`) won't work. Use `npx vercel dev` for full functionality.

## Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel Dashboard

3. Add environment variables in Vercel:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key (required for music generation)
   - `BLOB_READ_WRITE_TOKEN` - Your Vercel Blob storage token

4. Deploy!

## API Routes

The app includes serverless API routes:

- `POST /api/elevenlabs/generate` - Generate music using ElevenLabs API
- `POST /api/songs/save` - Save a generated song
- `GET /api/songs/list` - List all saved songs
- `DELETE /api/songs/delete?id=<song_id>` - Delete a song

## Getting API Keys

1. **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **ElevenLabs API Key**: Get from [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)
3. **Vercel Blob Token**: Get from [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Storage → Blob

## Tech Stack

- React 19
- Vite
- TypeScript
- Google Gemini AI
- Vercel Blob Storage
- Tailwind CSS
- Lucide Icons
