import { defineConfig, loadEnv } from 'vite';
import config from './api/config.js';
import addVoice from './api/add-voice.js';
import speech from './api/speech.js';
import voices from './api/voices.js';
export default defineConfig(({ mode }) => {
  const env=loadEnv(mode,process.cwd(),'ELEVENLABS_');
  if(env.ELEVENLABS_API_KEY) process.env.ELEVENLABS_API_KEY=env.ELEVENLABS_API_KEY;
  return {
  plugins: [{
    name: 'local-speech-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        const routes={'/api/speech':speech,'/api/voices':voices,'/api/config':config,'/api/add-voice':addVoice};
        if (!routes[path]) return next();
        res.status = code => { res.statusCode = code; return res; };
        res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        try {
          if (req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) { raw += chunk; if (raw.length > 500000) return res.status(413).json({ error: 'Yêu cầu quá lớn.' }); }
            req.body = JSON.parse(raw || '{}');
          }
          await routes[path](req, res);
        } catch { res.status(400).json({ error: 'Yêu cầu không hợp lệ.' }); }
      });
    }
  }]
}; });
