#!/bin/bash
# Script to configure Vercel environment variables and deploy

set -e

echo "🚀 Configuring Vercel environment variables..."

# Set GEMINI_API_KEY for production
echo "AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps" | npx vercel env add GEMINI_API_KEY production

# Set GEMINI_API_KEY for preview
echo "AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps" | npx vercel env add GEMINI_API_KEY preview

# Set GEMINI_API_KEY for development
echo "AIzaSyBk8kblJuM-KRj9iHMwB32HTfGu9rP0Bps" | npx vercel env add GEMINI_API_KEY development

# Set ELEVENLABS_API_KEY for production (if not already set)
echo "sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11" | npx vercel env add ELEVENLABS_API_KEY production

# Set ELEVENLABS_API_KEY for preview
echo "sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11" | npx vercel env add ELEVENLABS_API_KEY preview

# Set ELEVENLABS_API_KEY for development
echo "sk_d84870685d0f1f47cec20b97790c6900202407fefb996b11" | npx vercel env add ELEVENLABS_API_KEY development

echo "✅ Environment variables configured!"
echo ""
echo "🚀 Deploying to Vercel production..."

# Deploy to production
npx vercel --prod --yes

echo "✅ Deployment complete!"


