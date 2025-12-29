import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { config as loadDotEnv } from 'dotenv';

// Local dev plugin to handle /api/elevenlabs/generate
function elevenLabsProxy(apiKey: string): Plugin {
  return {
    name: 'elevenlabs-proxy',
    configureServer(server) {
      server.middlewares.use('/api/elevenlabs/generate', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { 
              prompt, 
              duration_seconds = 60, 
              instrumental = false,
              output_format = 'mp3_44100_128'
            } = JSON.parse(body);

            if (!prompt) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Prompt is required' }));
              return;
            }

            // Check if API key is missing
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: 'Server configuration error: ELEVENLABS_API_KEY environment variable is not set.',
                code: 'MISSING_API_KEY'
              }));
              return;
            }

            // Validate duration (10-300 seconds per ElevenLabs docs)
            const validDuration = Math.max(10, Math.min(300, duration_seconds));
            const durationMs = validDuration * 1000;

            console.log('Proxying to ElevenLabs Music Compose:', { 
              prompt: prompt.substring(0, 100) + '...',
              duration_seconds: validDuration,
              instrumental 
            });

            // Use the same endpoint as the Vercel API route
            const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/music/compose', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
              },
              body: JSON.stringify({
                prompt: prompt,
                duration_ms: durationMs,
                instrumental: instrumental,
                output_format: output_format
              }),
            });

            if (!elevenLabsResponse.ok) {
              const errorText = await elevenLabsResponse.text();
              console.error('ElevenLabs API Error:', elevenLabsResponse.status, errorText);
              
              // Handle 401 Unauthorized (Invalid API Key)
              if (elevenLabsResponse.status === 401) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: 'Invalid API key. Please check your ELEVENLABS_API_KEY environment variable.',
                  code: 'INVALID_API_KEY',
                  hint: 'Make sure your API key is correct and has not expired. You can get a new key from https://elevenlabs.io/app/settings/api-keys'
                }));
                return;
              }
              
              // Check if API key is missing
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: 'Server configuration error: ELEVENLABS_API_KEY environment variable is not set.',
                  code: 'MISSING_API_KEY'
                }));
                return;
              }
              
              res.statusCode = elevenLabsResponse.status;
              res.setHeader('Content-Type', 'application/json');
              
              // Try to parse error for better messaging
              try {
                const errorJson = JSON.parse(errorText);
                res.end(JSON.stringify({ 
                  error: errorJson.detail?.message || errorJson.message || 'ElevenLabs API error',
                  code: 'ELEVENLABS_API_ERROR',
                  details: errorJson
                }));
              } catch {
                res.end(JSON.stringify({ 
                  error: `ElevenLabs API error: ${errorText}`,
                  code: 'ELEVENLABS_API_ERROR'
                }));
              }
              return;
            }

            const audioBuffer = await elevenLabsResponse.arrayBuffer();
            res.setHeader('Content-Type', 'audio/mpeg');
            res.end(Buffer.from(audioBuffer));
          } catch (error) {
            console.error('Proxy error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            
            // Handle connection errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
              res.end(JSON.stringify({ 
                error: 'Failed to connect to ElevenLabs API. Please check your internet connection.',
                code: 'CONNECTION_ERROR'
              }));
            } else {
              res.end(JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Failed to generate music',
                code: 'PROXY_ERROR'
              }));
            }
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Load custom local.env if present (for developers who use that filename)
  loadDotEnv({ path: 'local.env' });

  // Then load standard Vite env files and process.env (including the above)
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      elevenLabsProxy((env.ELEVENLABS_API_KEY || '').trim())
    ],
    define: {
      // Expose Gemini keys for both process.env and import.meta.env lookups
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      'import.meta.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY),
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || env.GEMINI_API_KEY),
      'process.env.BLOB_READ_WRITE_TOKEN': JSON.stringify(env.BLOB_READ_WRITE_TOKEN)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
