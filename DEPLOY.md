# Vercel Deployment Guide

## Quick Deploy Steps

1. **Login to Vercel CLI:**
   ```bash
   npx vercel login
   ```
   This will open a browser for authentication.

2. **Run the deployment script:**
   ```bash
   ./deploy-vercel.sh
   ```

   Or manually run these commands:

   ```bash
   # Set environment variables for all environments
   echo "AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps" | npx vercel env add GEMINI_API_KEY production
   echo "AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps" | npx vercel env add GEMINI_API_KEY preview
   echo "AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps" | npx vercel env add GEMINI_API_KEY development
   
   echo "sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11" | npx vercel env add ELEVENLABS_API_KEY production
   echo "sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11" | npx vercel env add ELEVENLABS_API_KEY preview
   echo "sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11" | npx vercel env add ELEVENLABS_API_KEY development

   # Deploy to production
   npx vercel --prod --yes
   ```

## Environment Variables Configured

- `GEMINI_API_KEY`: AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps
- `ELEVENLABS_API_KEY`: sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11

These will be set for:
- Production
- Preview
- Development

## Alternative: Use Vercel Dashboard

You can also set environment variables via the Vercel Dashboard:
1. Go to your project: https://vercel.com/teams/team_XLS4r1tfJ0Myv7zfinX8fJmo/projects/dl-mgen
2. Navigate to Settings → Environment Variables
3. Add the variables for each environment

