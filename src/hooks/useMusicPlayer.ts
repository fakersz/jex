import { useState, useEffect, useRef, useCallback } from 'react';

export type AudioSource = 'local' | 'spotify' | 'disabled';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  format: string;
  streamUrl: string;
}

export interface SpotifyTrackItem {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  coverUrl?: string;
  videoUrl?: string;
  durationMs: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export interface SpotifyStatus {
  configured: boolean;
  authenticated: boolean;
  user: {
    displayName: string;
    isPremium: boolean;
    product?: string;
  } | null;
  activeDevice: string | null;
}

export type RepeatMode = 'off' | 'context' | 'track' | 'one' | 'all';
export type DuckingSetting = 'reduce' | 'pause' | 'none';

const PLAYER_STORAGE_KEY = 'jex_music_player_state';
const PLAYLISTS_STORAGE_KEY = 'jex_playlists';
const SOURCE_STORAGE_KEY = 'jex_audio_source';

export interface UseMusicPlayerReturn {
  audioSource: AudioSource;
  tracks: Track[];
  currentTrack: Track | null;
  spotifyCurrentTrack: SpotifyTrackItem | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  spotifyVolume: number;
  isMuted: boolean;
  progressSeconds: number;
  durationSeconds: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  duckingSetting: DuckingSetting;
  playlists: Playlist[];
  spotifyStatus: SpotifyStatus;
  spotifySearchResults: SpotifyTrackItem[];
  spotifyProgressMs: number;
  spotifyDurationMs: number;
  isSearchingSpotify: boolean;
  isLoading: boolean;
  error: string | null;

  // Ações de Fonte e Player
  setAudioSource: (source: AudioSource) => void;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  pause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setDuckingSetting: (setting: DuckingSetting) => void;

  // Fila e Biblioteca Local
  addToQueue: (track: Track) => void;
  playNextInQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  rescanLibrary: () => Promise<number>;

  // Playlists
  createPlaylist: (name: string) => void;
  renamePlaylist: (id: string, newName: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  playPlaylist: (playlistNameOrId: string) => string;

  // Spotify Web API
  loginSpotify: () => Promise<void>;
  logoutSpotifySession: () => Promise<void>;
  searchSpotifyQuery: (query: string) => Promise<void>;
  playSpotifyTrack: (uri: string) => Promise<void>;

  // Executor de voz
  executeVoiceAction: (action: { type: string; [key: string]: any }) => string;
}

const DEFAULT_PLAYLISTS: Playlist[] = [
  { id: 'foco', name: 'Foco', trackIds: [] },
  { id: 'relaxar', name: 'Relaxar', trackIds: [] },
  { id: 'ambiente', name: 'Ambiente', trackIds: [] },
  { id: 'favoritas', name: 'Favoritas', trackIds: [] },
];

export function useMusicPlayer(isJexSpeaking: boolean = false): UseMusicPlayerReturn {
  const [audioSource, setAudioSourceState] = useState<AudioSource>(() => {
    try {
      const saved = localStorage.getItem(SOURCE_STORAGE_KEY);
      if (saved === 'local' || saved === 'spotify' || saved === 'disabled') return saved;
    } catch (e) {}
    return 'local';
  });

  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [spotifyCurrentTrack, setSpotifyCurrentTrack] = useState<SpotifyTrackItem | null>(null);
  const [spotifyProgressMs, setSpotifyProgressMs] = useState<number>(0);
  const [spotifyDurationMs, setSpotifyDurationMs] = useState<number>(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [spotifyVolume, setSpotifyVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progressSeconds, setProgressSeconds] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [duckingSetting, setDuckingSettingState] = useState<DuckingSetting>('reduce');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus>({
    configured: false,
    authenticated: false,
    user: null,
    activeDevice: null,
  });
  const [spotifySearchResults, setSpotifySearchResults] = useState<SpotifyTrackItem[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState<boolean>(false);

  // Polling em tempo real do Spotify para obter capa, título, artista e progresso
  useEffect(() => {
    if (audioSource !== 'spotify' || !spotifyStatus.authenticated) return;

    const fetchCurrentlyPlaying = async () => {
      try {
        const res = await fetch('/api/spotify/currently-playing');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.item) {
            setSpotifyCurrentTrack(data.item);
            setIsPlaying(data.isPlaying);
            setSpotifyProgressMs(data.progressMs || 0);
            setSpotifyDurationMs(data.item.durationMs || 0);
          }
        }
      } catch (e) {}
    };

    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 3000);
    return () => clearInterval(interval);
  }, [audioSource, spotifyStatus.authenticated]);

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PLAYLISTS;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carregar status do Spotify e capturar callback OAuth se presente na URL
  const fetchSpotifyStatus = useCallback(async () => {
    try {
      // Se houver ?code= na URL vindo do redirecionamento do Spotify
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        console.log('[Spotify] Código OAuth detectado na URL, enviando ao backend...');
        await fetch(`/api/spotify/callback?code=${encodeURIComponent(code)}`);
        // Limpar parâmetros da barra de endereço
        window.history.replaceState({}, document.title, window.location.pathname);
        setAudioSourceState('spotify');
        try {
          localStorage.setItem(SOURCE_STORAGE_KEY, 'spotify');
        } catch (e) {}
      }

      const response = await fetch('/api/spotify/status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSpotifyStatus({
            configured: data.configured,
            authenticated: data.authenticated,
            user: data.user,
            activeDevice: data.activeDevice,
          });
        }
      }
    } catch (e) {
      console.warn('[Spotify] Erro ao carregar status do Spotify:', e);
    }
  }, []);

  useEffect(() => {
    fetchSpotifyStatus();
  }, [fetchSpotifyStatus]);

  // Alterar fonte de áudio mantendo as fontes sem reproduzir simultaneamente
  const setAudioSource = useCallback((newSource: AudioSource) => {
    setAudioSourceState(newSource);
    try {
      localStorage.setItem(SOURCE_STORAGE_KEY, newSource);
    } catch (e) {}

    // Se mudou para desligado ou trocou de fonte: pausar a fonte anterior
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    if (newSource === 'disabled') {
      // Tratar pause no Spotify via backend
      fetch('/api/spotify/pause', { method: 'POST' }).catch(() => {});
    } else if (newSource === 'local') {
      fetch('/api/spotify/pause', { method: 'POST' }).catch(() => {});
    }
  }, []);

  // Carregar biblioteca de músicas locais
  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/music/tracks');
      if (!response.ok) throw new Error('Falha ao conectar com a biblioteca.');
      const data = await response.json();
      if (data.success && Array.isArray(data.tracks)) {
        setTracks(data.tracks);
        setQueue(data.tracks);

        const savedState = localStorage.getItem(PLAYER_STORAGE_KEY);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.lastTrackId) {
            const found = data.tracks.find((t: Track) => t.id === parsed.lastTrackId);
            if (found) {
              setCurrentTrack(found);
              setCurrentIndex(data.tracks.findIndex((t: Track) => t.id === parsed.lastTrackId));
              if (parsed.lastPosition) setProgressSeconds(parsed.lastPosition);
            }
          }
        }
      }
    } catch (err: any) {
      setError('Adicione arquivos à pasta media/music e atualize a biblioteca.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Instanciar HTMLAudioElement reutilizável para mídia local
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setProgressSeconds(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDurationSeconds(audio.duration || 0);
    };

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextRef.current();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [repeatMode]);

  // Sincronizar volume e mute na mídia local
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // AUDIO DUCKING: Reduzir ou pausar a música enquanto o JEX fala
  useEffect(() => {
    if (audioSource === 'disabled') return;

    if (audioSource === 'local' && audioRef.current) {
      const audio = audioRef.current;
      if (isJexSpeaking) {
        if (duckingSetting === 'reduce' && isPlaying) {
          audio.volume = isMuted ? 0 : volume * 0.2;
        } else if (duckingSetting === 'pause' && isPlaying) {
          audio.pause();
        }
      } else {
        if (duckingSetting === 'reduce') {
          audio.volume = isMuted ? 0 : volume;
        } else if (duckingSetting === 'pause' && isPlaying) {
          audio.play().catch(() => {});
        }
      }
    }
  }, [isJexSpeaking, duckingSetting, volume, isMuted, isPlaying, audioSource]);

  const playTrack = useCallback((track: Track) => {
    if (audioSource === 'disabled') return;
    if (!audioRef.current) return;
    const audio = audioRef.current;

    setCurrentTrack(track);
    setError(null);
    audio.src = track.streamUrl;
    audio.currentTime = 0;

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [audioSource]);

  const togglePlayPause = useCallback(() => {
    if (audioSource === 'disabled') return;

    if (audioSource === 'spotify') {
      if (isPlaying) {
        fetch('/api/spotify/pause', { method: 'POST' }).then(() => setIsPlaying(false));
      } else {
        fetch('/api/spotify/play', { method: 'POST' }).then(() => setIsPlaying(true));
      }
      return;
    }

    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (!currentTrack) {
      if (queue.length > 0) {
        playTrack(queue[0]);
        setCurrentIndex(0);
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src || audio.src === 'http://localhost:5173/') {
        audio.src = currentTrack.streamUrl;
      }
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [audioSource, isPlaying, currentTrack, queue, playTrack]);

  const pause = useCallback(() => {
    if (audioSource === 'spotify') {
      fetch('/api/spotify/pause', { method: 'POST' }).catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, [audioSource]);

  const playNext = useCallback(() => {
    if (audioSource === 'spotify') {
      fetch('/api/spotify/next', { method: 'POST' }).catch(() => {});
      return;
    }

    if (queue.length === 0) return;
    let nextIdx = currentIndex + 1;

    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') nextIdx = 0;
      else {
        setIsPlaying(false);
        return;
      }
    }

    setCurrentIndex(nextIdx);
    playTrack(queue[nextIdx]);
  }, [audioSource, queue, currentIndex, isShuffle, repeatMode, playTrack]);

  const playNextRef = useRef(playNext);
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrevious = useCallback(() => {
    if (audioSource === 'spotify') {
      fetch('/api/spotify/previous', { method: 'POST' }).catch(() => {});
      return;
    }

    if (queue.length === 0) return;
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = queue.length - 1;
    setCurrentIndex(prevIdx);
    playTrack(queue[prevIdx]);
  }, [audioSource, queue, currentIndex, playTrack]);

  const seekTo = useCallback((seconds: number) => {
    if (audioSource === 'local' && audioRef.current) {
      audioRef.current.currentTime = seconds;
      setProgressSeconds(seconds);
    }
  }, [audioSource]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol));
    if (audioSource === 'spotify') {
      setSpotifyVolumeState(clamped);
      fetch('/api/spotify/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: Math.round(clamped * 100) }),
      }).catch(() => {});
    } else {
      setVolumeState(clamped);
    }
    if (clamped > 0 && isMuted) setIsMuted(false);
  }, [audioSource, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const setDuckingSetting = useCallback((setting: DuckingSetting) => {
    setDuckingSettingState(setting);
  }, []);

  // Fila local
  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const playNextInQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      const nextIdx = currentIndex + 1;
      const copy = [...prev];
      copy.splice(nextIdx, 0, track);
      return copy;
    });
  }, [currentIndex]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const rescanLibrary = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch('/api/music/rescan', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await fetchLibrary();
        return data.count;
      }
    } catch (e) {}
    return 0;
  }, [fetchLibrary]);

  // Playlists
  const createPlaylist = useCallback((name: string) => {
    if (!name || !name.trim()) return;
    setPlaylists((prev) => [
      ...prev,
      { id: `pl_${Date.now()}`, name: name.trim(), trackIds: [] },
    ]);
  }, []);

  const renamePlaylist = useCallback((id: string, newName: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => (pl.id === id ? { ...pl, name: newName.trim() } : pl))
    );
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== id));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId && !pl.trackIds.includes(trackId)
          ? { ...pl, trackIds: [...pl.trackIds, trackId] }
          : pl
      )
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, trackIds: pl.trackIds.filter((t) => t !== trackId) }
          : pl
      )
    );
  }, []);

  const playPlaylist = useCallback((playlistNameOrId: string): string => {
    const searchName = playlistNameOrId.toLowerCase().trim();
    const found = playlists.find(
      (pl) => pl.id === searchName || pl.name.toLowerCase().trim() === searchName
    );

    if (!found) return `Playlist "${playlistNameOrId}" não encontrada.`;

    const playlistTracks = tracks.filter((t) => found.trackIds.includes(t.id));
    if (playlistTracks.length === 0) {
      return `A playlist "${found.name}" não possui nenhuma música cadastrada.`;
    }

    setAudioSource('local');
    setQueue(playlistTracks);
    setCurrentIndex(0);
    playTrack(playlistTracks[0]);
    return `Iniciando a reprodução da playlist "${found.name}".`;
  }, [playlists, tracks, playTrack, setAudioSource]);

  // SPOTIFY API ACTIONS
  const loginSpotify = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/login');
      const data = await response.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.message || 'Configuração SPOTIFY_CLIENT_ID não encontrada no backend.');
      }
    } catch (e) {
      alert('Falha ao obter URL de autenticação do Spotify.');
    }
  }, []);

  const logoutSpotifySession = useCallback(async () => {
    await fetch('/api/spotify/logout', { method: 'POST' });
    await fetchSpotifyStatus();
  }, [fetchSpotifyStatus]);

  const searchSpotifyQuery = useCallback(async (query: string) => {
    if (!query || !query.trim()) return;
    setIsSearchingSpotify(true);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success && data.data?.tracks?.items) {
        const parsedItems: SpotifyTrackItem[] = data.data.tracks.items.map((item: any) => ({
          id: item.id,
          uri: item.uri,
          title: item.name,
          artist: item.artists?.map((a: any) => a.name).join(', ') || 'Artista',
          album: item.album?.name || 'Álbum',
          coverUrl: item.album?.images?.[0]?.url,
          durationMs: item.duration_ms,
        }));
        setSpotifySearchResults(parsedItems);
      }
    } catch (e) {
      console.warn('[Spotify] Erro ao buscar:', e);
    } finally {
      setIsSearchingSpotify(false);
    }
  }, []);

  const playSpotifyTrack = useCallback(async (uri: string) => {
    setAudioSource('spotify');
    try {
      const response = await fetch('/api/spotify/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] }),
      });
      if (response.ok) {
        setIsPlaying(true);
      }
    } catch (e) {}
  }, [setAudioSource]);

  // EXECUTOR DE AÇÕES ESTRUTURADAS DE VOZ
  const executeVoiceAction = useCallback((action: { type: string; [key: string]: any }): string => {
    if (!action || !action.type) return '';

    if (action.type === 'music.setAudioSource') {
      const targetSource = action.source as AudioSource;
      setAudioSource(targetSource);
      if (targetSource === 'disabled') return 'O player de música está desligado.';
      if (targetSource === 'spotify') return 'Fonte de música alterada para Spotify.';
      return 'Fonte de música alterada para Mídia Local.';
    }

    if ((audioSource as string) === 'disabled') {
      return 'O player de música está desligado.';
    }

    if (action.type === 'music.getAudioSource') {
      if (audioSource === 'disabled') return 'O player de música está desligado no momento.';
      if (audioSource === 'spotify') return 'A fonte de música ativa é o Spotify.';
      return 'A fonte de música ativa é a Mídia Local.';
    }

    if (action.type === 'spotify.searchAndPlay') {
      const query = action.query || '';
      searchSpotifyQuery(query).then(() => {
        if (spotifySearchResults.length > 0) {
          playSpotifyTrack(spotifySearchResults[0].uri);
        }
      });
      return `Buscando "${query}" no Spotify.`;
    }

    switch (action.type) {
      case 'music.play':
        togglePlayPause();
        return 'Tocando música.';
      case 'music.pause':
        pause();
        return 'Música pausada.';
      case 'music.next':
        playNext();
        return 'Tocando a próxima faixa.';
      case 'music.previous':
        playPrevious();
        return 'Voltando para a faixa anterior.';
      case 'music.setVolume':
        if (typeof action.volume === 'number') setVolume(action.volume);
        return 'Volume ajustado.';
      case 'music.volumeUp':
        setVolume(volume + 0.15);
        return 'Volume aumentado.';
      case 'music.volumeDown':
        setVolume(volume - 0.15);
        return 'Volume reduzido.';
      case 'music.mute':
        setIsMuted(true);
        return 'Som silenciado.';
      case 'music.unmute':
        setIsMuted(false);
        return 'Som ativado.';
      case 'music.playPlaylist':
        return playPlaylist(action.playlist || 'Foco');
      case 'music.getCurrentTrack':
        if (audioSource === 'spotify' && spotifyCurrentTrack) {
          return `Tocando no Spotify: ${spotifyCurrentTrack.title} por ${spotifyCurrentTrack.artist}.`;
        }
        return currentTrack
          ? `Tocando no JEX: ${currentTrack.title} por ${currentTrack.artist}.`
          : 'Nenhuma música está sendo reproduzida no momento.';
    }
    return '';
  }, [audioSource, setAudioSource, togglePlayPause, pause, playNext, playPrevious, setVolume, volume, playPlaylist, currentTrack, spotifyCurrentTrack, searchSpotifyQuery, spotifySearchResults, playSpotifyTrack]);

  return {
    audioSource,
    tracks,
    currentTrack,
    spotifyCurrentTrack,
    queue,
    currentIndex,
    isPlaying,
    volume,
    spotifyVolume,
    isMuted,
    progressSeconds,
    durationSeconds,
    repeatMode,
    isShuffle,
    duckingSetting,
    playlists,
    spotifyStatus,
    spotifySearchResults,
    spotifyProgressMs,
    spotifyDurationMs,
    isSearchingSpotify,
    isLoading,
    error,
    setAudioSource,
    playTrack,
    togglePlayPause,
    pause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    setDuckingSetting,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
    clearQueue,
    rescanLibrary,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    playPlaylist,
    loginSpotify,
    logoutSpotifySession,
    searchSpotifyQuery,
    playSpotifyTrack,
    executeVoiceAction,
  };
}
