import React, { useState } from 'react';
import { Track, Playlist, DuckingSetting, SpotifyStatus, SpotifyTrackItem } from '../../hooks/useMusicPlayer';
import './MusicLibraryModal.css';

interface MusicLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrack: Track | null;
  queue: Track[];
  playlists: Playlist[];
  duckingSetting: DuckingSetting;
  spotifyStatus: SpotifyStatus;
  spotifySearchResults: SpotifyTrackItem[];
  isSearchingSpotify: boolean;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onPlayNextInQueue: (track: Track) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onRescanLibrary: () => Promise<number>;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onPlayPlaylist: (id: string) => void;
  onSetDuckingSetting: (setting: DuckingSetting) => void;
  onLoginSpotify: () => Promise<void>;
  onLogoutSpotify: () => Promise<void>;
  onSearchSpotify: (query: string) => Promise<void>;
  onPlaySpotifyTrack: (uri: string) => Promise<void>;
}

export const MusicLibraryModal: React.FC<MusicLibraryModalProps> = ({
  isOpen,
  onClose,
  tracks,
  currentTrack,
  queue,
  playlists,
  duckingSetting,
  spotifyStatus,
  spotifySearchResults,
  isSearchingSpotify,
  onPlayTrack,
  onAddToQueue,
  onPlayNextInQueue,
  onRemoveFromQueue,
  onClearQueue,
  onRescanLibrary,
  onCreatePlaylist,
  onDeletePlaylist,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onPlayPlaylist,
  onSetDuckingSetting,
  onLoginSpotify,
  onLogoutSpotify,
  onSearchSpotify,
  onPlaySpotifyTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'spotify' | 'playlists' | 'queue' | 'settings'>('tracks');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [spotifySearchInput, setSpotifySearchInput] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [isRescanning, setIsRescanning] = useState<boolean>(false);

  if (!isOpen) return null;

  const artists = Array.from(new Set(tracks.map((t) => t.artist))).filter(Boolean);
  const albums = Array.from(new Set(tracks.map((t) => t.album))).filter(Boolean);

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.album.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArtist = !selectedArtist || track.artist === selectedArtist;
    const matchesAlbum = !selectedAlbum || track.album === selectedAlbum;
    return matchesSearch && matchesArtist && matchesAlbum;
  });

  const handleRescan = async () => {
    setIsRescanning(true);
    await onRescanLibrary();
    setIsRescanning(false);
  };

  const handleSpotifySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spotifySearchInput.trim()) {
      onSearchSpotify(spotifySearchInput.trim());
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="music-modal-content glass-panel">
        <div className="modal-header">
          <div className="title-group">
            <span className="modal-icon">🎵</span>
            <h2>Gerenciador de Músicas do JEX</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'tracks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            📁 Mídia Local ({tracks.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'spotify' ? 'active' : ''}`}
            onClick={() => setActiveTab('spotify')}
          >
            🟢 Spotify
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            Playlists ({playlists.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            Fila ({queue.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Ajustes
          </button>

          {activeTab === 'tracks' && (
            <button
              type="button"
              className="rescan-btn"
              onClick={handleRescan}
              disabled={isRescanning}
            >
              {isRescanning ? '🔄 Atualizando...' : '🔄 Atualizar Local'}
            </button>
          )}
        </div>

        {/* TAB 1: ARQUIVOS LOCAIS */}
        {activeTab === 'tracks' && (
          <div className="tab-content">
            <div className="filters-bar">
              <input
                type="text"
                placeholder="Buscar por título, artista ou álbum..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />

              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os Artistas</option>
                {artists.map((art) => (
                  <option key={art} value={art}>
                    {art}
                  </option>
                ))}
              </select>

              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os Álbuns</option>
                {albums.map((alb) => (
                  <option key={alb} value={alb}>
                    {alb}
                  </option>
                ))}
              </select>
            </div>

            {filteredTracks.length === 0 ? (
              <div className="empty-music-notice">
                <span className="empty-icon">📁</span>
                <h3>Nenhuma música local encontrada</h3>
                <p>Adicione arquivos à pasta <code>media/music</code> e clique em <strong>Atualizar Local</strong>.</p>
                <span className="supported-formats-tag">Formatos aceitos: MP3, M4A, AAC, WAV, OGG, FLAC</span>
              </div>
            ) : (
              <div className="tracks-list">
                {filteredTracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div key={track.id} className={`track-item ${isCurrent ? 'playing' : ''}`}>
                      <div className="track-info">
                        <span className="track-title">{track.title}</span>
                        <span className="track-artist-album">
                          {track.artist} &bull; {track.album}
                        </span>
                      </div>

                      <div className="track-duration">{formatDuration(track.duration)}</div>

                      <div className="track-actions">
                        <button
                          type="button"
                          className="action-btn play"
                          onClick={() => onPlayTrack(track)}
                        >
                          ▶ Tocar
                        </button>
                        <button
                          type="button"
                          className="action-btn queue"
                          onClick={() => onPlayNextInQueue(track)}
                        >
                          ⏭️ Em seguida
                        </button>
                        <button
                          type="button"
                          className="action-btn queue"
                          onClick={() => onAddToQueue(track)}
                        >
                          ➕ Fila
                        </button>
                        <select
                          className="filter-select"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                          onChange={(e) => {
                            if (e.target.value) {
                              onAddTrackToPlaylist(e.target.value, track.id);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>+ Playlist</option>
                          {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SPOTIFY */}
        {activeTab === 'spotify' && (
          <div className="tab-content">
            <div className="spotify-connection-bar">
              <div className="spotify-status-info">
                <span className="spotify-logo-badge">🟢 Spotify API</span>
                {spotifyStatus.authenticated ? (
                  <span className="status-text success">
                    Conectado como <strong>{spotifyStatus.user?.displayName}</strong> ({spotifyStatus.user?.isPremium ? 'Premium' : 'Free'})
                  </span>
                ) : (
                  <span className="status-text warning">
                    {spotifyStatus.configured ? 'Conta não conectada' : 'Credenciais não configuradas no backend'}
                  </span>
                )}
              </div>

              {spotifyStatus.authenticated ? (
                <button type="button" className="action-btn delete" onClick={onLogoutSpotify}>
                  Desconectar
                </button>
              ) : (
                <button type="button" className="action-btn play" onClick={onLoginSpotify}>
                  🔑 Conectar Conta Spotify
                </button>
              )}
            </div>

            {spotifyStatus.authenticated ? (
              <div className="spotify-search-wrapper">
                <form onSubmit={handleSpotifySearchSubmit} className="filters-bar" style={{ gridTemplateColumns: '1fr auto' }}>
                  <input
                    type="text"
                    placeholder="Pesquisar músicas, artistas ou álbuns no Spotify..."
                    value={spotifySearchInput}
                    onChange={(e) => setSpotifySearchInput(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="action-btn play" disabled={isSearchingSpotify}>
                    {isSearchingSpotify ? 'Buscando...' : '🔍 Buscar'}
                  </button>
                </form>

                {spotifySearchResults.length > 0 && (
                  <div className="tracks-list" style={{ marginTop: '1rem' }}>
                    {spotifySearchResults.map((st) => (
                      <div key={st.id} className="track-item">
                        {st.coverUrl && (
                          <img src={st.coverUrl} alt={st.title} className="spotify-track-thumb" />
                        )}
                        <div className="track-info">
                          <span className="track-title">{st.title}</span>
                          <span className="track-artist-album">{st.artist} &bull; {st.album}</span>
                        </div>
                        <div className="track-duration">{formatDuration(st.durationMs / 1000)}</div>
                        <button
                          type="button"
                          className="action-btn play"
                          onClick={() => onPlaySpotifyTrack(st.uri)}
                        >
                          ▶ Tocar no Spotify
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-music-notice">
                <span className="empty-icon">🟢</span>
                <h3>Integração com Spotify</h3>
                <p>Conecte sua conta para pesquisar e controlar a reprodução diretamente pelo JEX.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <div className="tab-content">
            <form onSubmit={(e) => { e.preventDefault(); if (newPlaylistName.trim()) { onCreatePlaylist(newPlaylistName.trim()); setNewPlaylistName(''); } }} className="create-playlist-form">
              <input
                type="text"
                placeholder="Nome da nova playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="action-btn play">
                + Criar Playlist
              </button>
            </form>

            <div className="playlists-grid">
              {playlists.map((pl) => {
                const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
                return (
                  <div key={pl.id} className="playlist-card glass-panel">
                    <div className="playlist-header">
                      <h3>{pl.name}</h3>
                      <span className="pl-count">{plTracks.length} faixas</span>
                    </div>

                    <div className="playlist-btns">
                      <button
                        type="button"
                        className="action-btn play"
                        onClick={() => onPlayPlaylist(pl.id)}
                      >
                        ▶ Tocar Playlist
                      </button>
                      {!['foco', 'relaxar', 'ambiente', 'favoritas'].includes(pl.id) && (
                        <button
                          type="button"
                          className="action-btn delete"
                          onClick={() => onDeletePlaylist(pl.id)}
                        >
                          🗑️ Excluir
                        </button>
                      )}
                    </div>

                    <div className="playlist-track-preview">
                      {plTracks.length === 0 ? (
                        <span className="empty-pl-text">Nenhuma música adicionada a esta playlist.</span>
                      ) : (
                        plTracks.map((t) => (
                          <div key={t.id} className="pl-track-row">
                            <span>{t.title} - {t.artist}</span>
                            <button
                              type="button"
                              className="remove-pl-track"
                              onClick={() => onRemoveTrackFromPlaylist(pl.id, t.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: FILA */}
        {activeTab === 'queue' && (
          <div className="tab-content">
            <div className="queue-header-actions">
              <span>Músicas na Fila: {queue.length}</span>
              <button type="button" className="action-btn delete" onClick={onClearQueue}>
                Limpar Fila
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="empty-music-notice">
                <span className="empty-icon">🎵</span>
                <h3>Fila vazia</h3>
                <p>Adicione músicas da biblioteca local para criar sua fila de reprodução.</p>
              </div>
            ) : (
              <div className="tracks-list">
                {queue.map((track, idx) => (
                  <div key={`${track.id}_${idx}`} className="track-item">
                    <span className="queue-index">#{idx + 1}</span>
                    <div className="track-info">
                      <span className="track-title">{track.title}</span>
                      <span className="track-artist-album">{track.artist}</span>
                    </div>
                    <button
                      type="button"
                      className="remove-pl-track"
                      onClick={() => onRemoveFromQueue(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AJUSTES */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="settings-section">
              <h3>🔉 Convivência com a Voz do JEX (Audio Ducking)</h3>
              <p className="settings-desc">
                Escolha o comportamento do áudio quando o JEX estiver falando:
              </p>

              <div className="radio-options-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="ducking"
                    value="reduce"
                    checked={duckingSetting === 'reduce'}
                    onChange={() => onSetDuckingSetting('reduce')}
                  />
                  <span><strong>Reduzir volume (Recomendado)</strong>: Abaixa a música para 20% enquanto o JEX fala.</span>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="ducking"
                    value="pause"
                    checked={duckingSetting === 'pause'}
                    onChange={() => onSetDuckingSetting('pause')}
                  />
                  <span><strong>Pausar música</strong>: Interrompe a música e retoma quando o JEX terminar de falar.</span>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="ducking"
                    value="none"
                    checked={duckingSetting === 'none'}
                    onChange={() => onSetDuckingSetting('none')}
                  />
                  <span><strong>Não alterar</strong>: Mantém o volume da música inalterado.</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
