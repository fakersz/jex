import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SpotifyTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userProfile?: {
    id: string;
    displayName: string;
    email: string;
    product: string; // 'premium' | 'free'
    images?: Array<{ url: string }>;
  };
}

const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'data/spotify_tokens.json');
let storedTokens: SpotifyTokenData | null = null;

// Carregar tokens salvos do arquivo ao inicializar o backend
function loadTokensFromFile(): void {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const raw = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
      storedTokens = JSON.parse(raw);
      console.log('[SpotifyService] Tokens salvos carregados do disco com sucesso.');
    }
  } catch (e) {
    console.warn('[SpotifyService] Erro ao carregar arquivo de tokens:', e);
  }
}

// Salvar tokens no disco para persistência permanente
function saveTokensToFile(): void {
  try {
    const dir = path.dirname(TOKEN_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (storedTokens) {
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(storedTokens, null, 2), 'utf-8');
      console.log('[SpotifyService] Tokens salvos no disco.');
    } else if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
    }
  } catch (e) {
    console.warn('[SpotifyService] Erro ao gravar tokens no disco:', e);
  }
}

// Inicializar carregando tokens existentes
loadTokensFromFile();

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_ID.trim());
}

/**
 * Gera a URL de autenticação OAuth 2.0 do Spotify.
 */
export function getSpotifyAuthUrl(state?: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5173/auth/spotify/callback';

  if (!clientId) {
    throw new Error('SPOTIFY_CLIENT_ID não configurado no backend.');
  }

  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: state || crypto.randomBytes(16).toString('hex'),
    show_dialog: 'true',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Troca o código de autorização por Access Token e Refresh Token.
 */
export async function handleSpotifyCallback(code: string): Promise<SpotifyTokenData> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5173/auth/spotify/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Spotify não configuradas no backend.');
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[SpotifyService] Erro ao trocar código por token:', errorBody);
    throw new Error('Falha ao autenticar com o Spotify.');
  }

  const data = await response.json();
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

  storedTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };

  // Buscar perfil do usuário
  try {
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      storedTokens.userProfile = {
        id: profile.id,
        displayName: profile.display_name || profile.id,
        email: profile.email || '',
        product: profile.product || 'free',
        images: profile.images,
      };
    }
  } catch (e) {
    console.warn('[SpotifyService] Aviso ao buscar perfil do usuário:', e);
  }

  saveTokensToFile();
  return storedTokens;
}

/**
 * Renova automaticamente o Access Token utilizando o Refresh Token.
 */
export async function refreshSpotifyAccessToken(): Promise<string> {
  if (!storedTokens || !storedTokens.refreshToken) {
    throw new Error('Nenhum Refresh Token do Spotify disponível.');
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Spotify não configuradas.');
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: storedTokens.refreshToken,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SpotifyService] Erro ao renovar token:', errorText);
    storedTokens = null;
    saveTokensToFile();
    throw new Error('Sessão do Spotify expirou. Por favor, conecte-se novamente.');
  }

  const data = await response.json();
  storedTokens.accessToken = data.access_token;
  storedTokens.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  if (data.refresh_token) {
    storedTokens.refreshToken = data.refresh_token;
  }

  saveTokensToFile();
  return storedTokens.accessToken;
}

/**
 * Retorna um Access Token válido, renovando se necessário.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (!storedTokens) return null;
  if (Date.now() >= storedTokens.expiresAt) {
    try {
      return await refreshSpotifyAccessToken();
    } catch (e) {
      return null;
    }
  }
  return storedTokens.accessToken;
}

/**
 * Encerra a sessão do Spotify e remove o arquivo de tokens.
 */
export function logoutSpotify(): void {
  storedTokens = null;
  saveTokensToFile();
  console.log('[SpotifyService] Sessão do Spotify encerrada.');
}

/**
 * Retorna o status de conexão do Spotify sem expor segredos.
 */
export async function getSpotifyStatus() {
  const configured = isSpotifyConfigured();
  const token = await getValidAccessToken();
  const authenticated = Boolean(token && storedTokens?.userProfile);

  let user = null;
  let activeDevice = null;

  if (authenticated && storedTokens?.userProfile) {
    user = {
      displayName: storedTokens.userProfile.displayName,
      isPremium: storedTokens.userProfile.product === 'premium',
      product: storedTokens.userProfile.product,
    };

    try {
      if (token) {
        const playbackRes = await fetch('https://api.spotify.com/v1/me/player', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (playbackRes.status === 200) {
          const playback = await playbackRes.json();
          if (playback.device) {
            activeDevice = playback.device.name;
          }
        }
      }
    } catch (e) {}
  }

  return {
    configured,
    authenticated,
    user,
    activeDevice,
  };
}

/**
 * Realiza uma busca de faixas, artistas, álbuns ou playlists no Spotify.
 */
export async function searchSpotify(query: string, types = 'track,artist,album,playlist') {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Spotify não autenticado.');
  }

  const params = new URLSearchParams({
    q: query,
    type: types,
    limit: '10',
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar no Spotify.');
  }

  return await response.json();
}
