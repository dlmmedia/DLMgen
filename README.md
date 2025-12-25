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

2. Set up environment variables in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```

3. Run with Vercel CLI (for API routes):
   ```bash
   npx vercel dev
   ```

   Or run just the frontend (Blob storage won't work):
   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel Dashboard

3. Add environment variables in Vercel:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `BLOB_READ_WRITE_TOKEN` - Your Vercel Blob storage token

4. Deploy!

## API Routes

The app includes serverless API routes for song storage:

- `POST /api/songs/save` - Save a generated song
- `GET /api/songs/list` - List all saved songs
- `DELETE /api/songs/delete?id=<song_id>` - Delete a song

## Tech Stack

- React 19
- Vite
- TypeScript
- Google Gemini AI
- Vercel Blob Storage
- Tailwind CSS
- Lucide Icons
