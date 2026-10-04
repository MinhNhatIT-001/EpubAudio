import { defineConfig } from 'vite';
import speech from './api/speech.js';
import voices from './api/voices.js';
export default defineConfig({
  plugins: [{
    name: 'local-speech-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (!['/api/speech', '/api/voices'].includes(path)) return next();
        res.status = code => { res.statusCode = code; return res; };
        res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        try {
          if (req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) { raw += chunk; if (raw.length > 500000) return res.status(413).json({ error: 'Yêu cầu quá lớn.' }); }
            req.body = JSON.parse(raw || '{}');
          }
          await (path === '/api/speech' ? speech : voices)(req, res);
        } catch { res.status(400).json({ error: 'Yêu cầu không hợp lệ.' }); }
      });
    }
  }]
});
