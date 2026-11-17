import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { resolveLocalIntent } from './intentRouter';
import { generateGeminiResponse } from './geminiService';
import {
  getTrackList,
  getTrackById,
  rescanMusicLibrary,
  getLibraryStatus,
} from './musicService';
import {
  isSpotifyConfigured,
  getSpotifyAuthUrl,
  handleSpotifyCallback,
  logoutSpotify,
  getSpotifyStatus,
  getValidAccessToken,
  searchSpotify,
} from './spotifyService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Cache de desduplicação (10s window)
const recentRequestsMap = new Map<string, { timestamp: number; response: any }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of recentRequestsMap.entries()) {
    if (now - value.timestamp > 15000) {
      recentRequestsMap.delete(key);
    }
  }
}, 30000);

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
};

// Endpoint de Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'JEX Assistant Backend',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    spotifyConfigured: isSpotifyConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  });
});

// ============================================================================
// ENDPOINTS DO SPOTIFY (AUTENTICAÇÃO & CONTROLE)
// ============================================================================

app.get('/api/spotify/login', (_req: Request, res: Response) => {
  try {
    if (!isSpotifyConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'SPOTIFY_NOT_CONFIGURED',
        message: 'Credenciais SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET não configuradas no arquivo .env do backend.',
      });
    }
    const authUrl = getSpotifyAuthUrl();
    res.json({ success: true, authUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/spotify/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send('Código de autorização não fornecido pelo Spotify.');
    }
    await handleSpotifyCallback(code);
    // Redirecionar de volta para o frontend
    res.redirect('http://localhost:5173/?spotify=success');
  } catch (error: any) {
    console.error('[SpotifyCallback] Erro:', error);
    res.redirect('http://localhost:5173/?spotify=error');
  }
});

app.get('/api/spotify/status', async (_req: Request, res: Response) => {
  try {
    const status = await getSpotifyStatus();
    res.json({ success: true, ...status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/spotify/token', async (_req: Request, res: Response) => {
  try {
    const token = await getValidAccessToken();
    if (!token) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }
    res.json({ success: true, token });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/spotify/logout', (_req: Request, res: Response) => {
  logoutSpotify();
  res.json({ success: true, message: 'Sessão do Spotify encerrada.' });
});

app.get('/api/spotify/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'Consulta de busca vazia.' });
    }
    const result = await searchSpotify(q);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy de Playback para Spotify Web API
app.post('/api/spotify/play', async (req: Request, res: Response) => {
  try {
    const token = await getValidAccessToken();
    if (!token) return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });

    const { uris, context_uri } = req.body || {};
    const payload: any = {};
    if (uris) payload.uris = uris;
    if (context_uri) payload.context_uri = context_uri;

    const spRes = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
    });

    if (spRes.status === 204 || spRes.status === 200) {
      return res.json({ success: true, message: 'Reprodução iniciada no Spotify.' });
    }

    const errText = await spRes.text();
    return res.status(spRes.status).json({ success: false, error: errText });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/spotify/pause', async (_req: Request, res: Response) => {
  try {
    const token = await getValidAccessToken();
    if (!token) return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });

    const spRes = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (spRes.status === 204 || spRes.status === 200) {
      return res.json({ success: true, message: 'Spotify pausado.' });
    }
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/spotify/next', async (_req: Request, res: Response) => {
  try {
    const token = await getValidAccessToken();
    if (!token) return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });

    await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/spotify/previous', async (_req: Request, res: Response) => {
  try {
    const token = await getValidAccessToken();
    if (!token) return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });

    await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ENDPOINTS DE MÚSICA LOCAL
// ============================================================================

app.get('/api/music/tracks', async (_req: Request, res: Response) => {
  try {
    const tracks = await getTrackList();
    res.json({ success: true, tracks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Falha ao buscar biblioteca de músicas.' });
  }
});

app.get('/api/music/status', async (_req: Request, res: Response) => {
  try {
    const status = await getLibraryStatus();
    res.json({ success: true, ...status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Falha ao buscar status da biblioteca.' });
  }
});

app.post('/api/music/rescan', async (_req: Request, res: Response) => {
  try {
    const { count } = await rescanMusicLibrary();
    res.json({ success: true, count, message: `Biblioteca atualizada com ${count} faixa(s).` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Falha ao atualizar biblioteca.' });
  }
});

app.get('/api/music/stream/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const track = await getTrackById(id);

    if (!track || !fs.existsSync(track.fullPath)) {
      return res.status(404).json({ success: false, error: 'Faixa de áudio não encontrada.' });
    }

    const stat = await fs.promises.stat(track.fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mimeType = MIME_TYPES[track.format] || 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(track.fullPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(track.fullPath).pipe(res);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Erro interno ao transmitir áudio.' });
  }
});

// ============================================================================
// ENDPOINT PRINCIPAL DO ASSISTENTE JEX (Texto & Roteamento Local)
// ============================================================================

app.post('/api/assistant', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        source: 'local',
        intent: 'invalido',
        text: 'Por favor, envie um comando de voz ou mensagem de texto válida.',
        requestId,
        durationMs: Date.now() - startTime,
        textLength: 0,
      });
    }

    const trimmedMessage = message.trim();
    const messageKey = trimmedMessage.toLowerCase();

    // Cache de desduplicação
    const cached = recentRequestsMap.get(messageKey);
    if (cached && startTime - cached.timestamp < 10000) {
      console.log(`[JEX Backend][req:${requestId}] Cache recente retornado para "${trimmedMessage}".`);
      return res.json({
        ...cached.response,
        requestId,
        durationMs: Date.now() - startTime,
        cached: true,
      });
    }

    // 1. ROTEAMENTO LOCAL DE INTENÇÕES
    const localIntent = resolveLocalIntent(trimmedMessage);

    if (localIntent) {
      const durationMs = Date.now() - startTime;
      console.log(`[JEX Backend][req:${requestId}] Intenção Local: "${localIntent.intent}" | Duração: ${durationMs}ms`);
      const responsePayload = {
        success: true,
        source: 'local',
        intent: localIntent.intent,
        text: localIntent.text,
        action: localIntent.action,
        data: localIntent.data,
        finishReason: 'STOP',
        requestId,
        durationMs,
        textLength: localIntent.text.length,
        retryCount: 0,
      };
      recentRequestsMap.set(messageKey, { timestamp: startTime, response: responsePayload });
      return res.json(responsePayload);
    }

    // 2. CHAMADA SÍNCRONA AO GEMINI
    console.log(`[JEX Backend][req:${requestId}] Chamando Gemini API: "${trimmedMessage}"`);
    const geminiResult = await generateGeminiResponse(trimmedMessage, requestId);

    const responsePayload = {
      success: geminiResult.success,
      source: 'gemini',
      intent: 'gemini_generico',
      text: geminiResult.text,
      finishReason: geminiResult.finishReason || 'STOP',
      errorType: geminiResult.errorType,
      durationMs: geminiResult.durationMs,
      textLength: geminiResult.textLength,
      retryCount: geminiResult.retryCount,
      retryDelaySeconds: geminiResult.retryDelaySeconds,
      requestId,
    };

    if (geminiResult.success) {
      recentRequestsMap.set(messageKey, { timestamp: startTime, response: responsePayload });
    }

    return res.json(responsePayload);
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error(`[JEX Backend][req:${requestId}] Erro interno:`, error?.message || error);

    return res.status(500).json({
      success: false,
      source: 'local',
      intent: 'erro_servidor',
      text: 'Ocorreu um erro interno no servidor do assistente JEX.',
      errorType: 'UNKNOWN_ERROR',
      finishReason: 'ERROR',
      requestId,
      durationMs,
      textLength: 0,
      retryCount: 0,
    });
  }
});

app.listen(PORT, async () => {
  console.log(`[JEX Backend] Servidor rodando na porta ${PORT}`);
  console.log(`[JEX Backend] Endpoints: http://localhost:${PORT}/api/assistant e http://localhost:${PORT}/api/spotify/status`);
  try {
    await rescanMusicLibrary();
  } catch (e) {}
});
