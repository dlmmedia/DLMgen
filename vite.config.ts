import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
            const { prompt, duration = 30, model_id = 'music_v1' } = JSON.parse(body);

            if (!prompt) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Prompt is required' }));
              return;
            }

            console.log('Proxying to ElevenLabs Sound Generation:', { duration });

            const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
              },
              body: JSON.stringify({
                text: prompt,
                duration_seconds: duration,
                prompt_influence: 0.3 // Default influence
              }),
            });

            if (!elevenLabsResponse.ok) {
              const errorText = await elevenLabsResponse.text();
              console.error('ElevenLabs API Error:', elevenLabsResponse.status, errorText);
              res.statusCode = elevenLabsResponse.status;
              res.end(JSON.stringify({ error: `ElevenLabs API error: ${errorText}` }));
              return;
            }

            const audioBuffer = await elevenLabsResponse.arrayBuffer();
            res.setHeader('Content-Type', 'audio/mpeg');
            res.end(Buffer.from(audioBuffer));
          } catch (error) {
            console.error('Proxy error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to generate music' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      elevenLabsProxy(env.ELEVENLABS_API_KEY || '')
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.BLOB_READ_WRITE_TOKEN': JSON.stringify(env.BLOB_READ_WRITE_TOKEN)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
