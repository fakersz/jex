import React, { useState } from 'react';
import { AudioSource, UseMusicPlayerReturn } from '../hooks/useMusicPlayer';
import { MusicLibraryModal } from './MusicLibraryModal/MusicLibraryModal';
import '../styles/Cards.css';

interface NowPlayingCardProps {
  player: UseMusicPlayerReturn;
}

export const NowPlayingCard: React.FC<NowPlayingCardProps> = ({ player }) => {
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  const {
    audioSource,
    tracks,
    currentTrack,
    spotifyCurrentTrack,
    queue,
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
    isSearchingSpotify,
    setAudioSource,
    playTrack,
    togglePlayPause,
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
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    playPlaylist,
    loginSpotify,
    logoutSpotifySession,
    searchSpotifyQuery,
    playSpotifyTrack,
  } = player;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSecs = parseFloat(e.target.value);
    seekTo(newSecs);
  };

  const progressPercent = durationSeconds > 0 ? (progressSeconds / durationSeconds) * 100 : 0;
  const currentVol = audioSource === 'spotify' ? spotifyVolume : volume;

  return (
    <>
      <div className={`widget-card glass-panel now-playing-card ${audioSource === 'disabled' ? 'disabled-mode' : ''}`}>
        <div className="card-header">
          <div className="header-title-group">
            <svg className="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <h3>Reprodução Atual</h3>
          </div>

          <div className="header-right-btns">
            {/* Audio Source Selector */}
            <select
              value={audioSource}
              onChange={(e) => setAudioSource(e.target.value as AudioSource)}
              className="source-selector-select"
              title="Escolher Fonte de Áudio"
            >
              <option value="local">📁 Mídia Local</option>
              <option value="spotify">🟢 Spotify</option>
              <option value="disabled">⛔ Desligado</option>
            </select>

            {audioSource !== 'disabled' && (
              <button
                type="button"
                className="widget-mini-btn"
                onClick={() => setIsLibraryOpen(true)}
                title="Abrir Biblioteca"
              >
                🎵 Biblioteca
              </button>
            )}
          </div>
        </div>

        {audioSource === 'disabled' ? (
          <div className="empty-card-body">
            <div className="default-cover-art disabled" aria-hidden="true">
              <span>⛔</span>
            </div>
            <h4 className="empty-title">Player de Música Desligado</h4>
            <p className="empty-subtext">
              Diga <em>"Ligar o player"</em> ou selecione Mídia Local / Spotify no seletor para ativar.
            </p>
            <button
              type="button"
              className="widget-action-btn"
              onClick={() => setAudioSource('local')}
            >
              Ligar Player de Música
            </button>
          </div>
        ) : audioSource === 'spotify' ? (
          <div className="player-body">
            <div className="spotify-bar-status">
              {spotifyStatus.authenticated ? (
                <span className="sp-user-tag">
                  🟢 <strong>{spotifyStatus.user?.displayName}</strong> ({spotifyStatus.user?.isPremium ? 'Premium' : 'Free'})
                </span>
              ) : (
                <button type="button" className="widget-mini-btn" onClick={loginSpotify}>
                  🔑 Conectar Spotify
                </button>
              )}
            </div>

            <div className="track-hero">
              <div className="cover-art-box">
                {spotifyCurrentTrack?.coverUrl ? (
                  <img src={spotifyCurrentTrack.coverUrl} alt="Capa" className="cover-img" />
                ) : (
                  <div className="default-cover-art spotify-theme">🟢</div>
                )}
              </div>

              <div className="track-meta">
                <span className="track-title-hero">{spotifyCurrentTrack?.title || 'Spotify Player'}</span>
                <span className="track-artist-hero">{spotifyCurrentTrack?.artist || 'Spotify Web API'}</span>
                <span className="track-album-hero">{spotifyCurrentTrack?.album || 'Pronto para tocar'}</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="player-controls-bar">
              <button type="button" className="ctrl-btn" onClick={playPrevious} title="Música Anterior">
                ⏮️
              </button>

              <button type="button" className="ctrl-btn main-play-btn" onClick={togglePlayPause} title={isPlaying ? 'Pausar' : 'Reproduzir'}>
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              <button type="button" className="ctrl-btn" onClick={playNext} title="Próxima Música">
                ⏭️
              </button>
            </div>

            {/* Volume Control Bar */}
            <div className="volume-bar-row">
              <button type="button" className="vol-btn" onClick={toggleMute}>
                {isMuted ? '🔇' : currentVol < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : currentVol}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="music-vol-slider"
              />
              <span className="vol-percent-label">{Math.round((isMuted ? 0 : currentVol) * 100)}%</span>
            </div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="empty-card-body">
            <div className="default-cover-art" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <h4 className="empty-title">Nenhuma música local encontrada</h4>
            <p className="empty-subtext">
              Adicione arquivos à pasta <code>media/music</code> e atualize a biblioteca.
            </p>
            <button
              type="button"
              className="widget-action-btn"
              onClick={() => setIsLibraryOpen(true)}
            >
              Abrir Gerenciador de Música
            </button>
          </div>
        ) : (
          <div className="player-body">
            <div className="track-hero">
              <div className="cover-art-box">
                <div className="default-cover-art" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
              </div>

              <div className="track-meta">
                <span className="track-title-hero">{currentTrack?.title || 'Selecione uma faixa'}</span>
                <span className="track-artist-hero">{currentTrack?.artist || 'Artista'}</span>
                <span className="track-album-hero">{currentTrack?.album || 'Álbum'}</span>
              </div>
            </div>

            {/* Interactive Progress Bar */}
            <div className="progress-section">
              <input
                type="range"
                min="0"
                max={durationSeconds || 100}
                value={progressSeconds}
                onChange={handleSeek}
                className="music-progress-slider"
                style={{
                  background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
                }}
              />
              <div className="time-labels">
                <span>{formatTime(progressSeconds)}</span>
                <span>{formatTime(durationSeconds)}</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="player-controls-bar">
              <button type="button" className={`ctrl-btn ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Modo Aleatório">
                🔀
              </button>

              <button type="button" className="ctrl-btn" onClick={playPrevious} title="Música Anterior">
                ⏮️
              </button>

              <button type="button" className="ctrl-btn main-play-btn" onClick={togglePlayPause} title={isPlaying ? 'Pausar' : 'Reproduzir'}>
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              <button type="button" className="ctrl-btn" onClick={playNext} title="Próxima Música">
                ⏭️
              </button>

              <button type="button" className={`ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`} onClick={cycleRepeatMode} title={`Repetição`}>
                {repeatMode === 'one' ? '🔂' : '🔁'}
              </button>
            </div>

            {/* Volume Control Bar */}
            <div className="volume-bar-row">
              <button type="button" className="vol-btn" onClick={toggleMute}>
                {isMuted ? '🔇' : currentVol < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : currentVol}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="music-vol-slider"
              />
              <span className="vol-percent-label">{Math.round((isMuted ? 0 : currentVol) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      <MusicLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        tracks={tracks}
        currentTrack={currentTrack}
        queue={queue}
        playlists={playlists}
        duckingSetting={duckingSetting}
        spotifyStatus={spotifyStatus}
        spotifySearchResults={spotifySearchResults}
        isSearchingSpotify={isSearchingSpotify}
        onPlayTrack={playTrack}
        onAddToQueue={addToQueue}
        onPlayNextInQueue={playNextInQueue}
        onRemoveFromQueue={removeFromQueue}
        onClearQueue={clearQueue}
        onRescanLibrary={rescanLibrary}
        onCreatePlaylist={createPlaylist}
        onDeletePlaylist={deletePlaylist}
        onAddTrackToPlaylist={addTrackToPlaylist}
        onRemoveTrackFromPlaylist={removeTrackFromPlaylist}
        onPlayPlaylist={playPlaylist}
        onSetDuckingSetting={setDuckingSetting}
        onLoginSpotify={loginSpotify}
        onLogoutSpotify={logoutSpotifySession}
        onSearchSpotify={searchSpotifyQuery}
        onPlaySpotifyTrack={playSpotifyTrack}
      />
    </>
  );
};
