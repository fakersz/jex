import React from 'react';
import { SpotifyStatus } from '../../../hooks/useMusicPlayer';

interface SettingsPanelProps {
  spotifyStatus: SpotifyStatus;
  onLoginSpotify: () => void;
  onLogoutSpotify: () => void;
  voices: SpeechSynthesisVoice[];
  voicePreferences: any;
  selectedVoiceName: string;
  voiceDiagnostics: any;
  onTestVoice: () => void;
  onUpdateVoicePreferences: (prefs: any) => void;
  onResetVoicePreferences: () => void;
  apiCounters: any;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  spotifyStatus,
  onLoginSpotify,
  onLogoutSpotify,
  voices,
  voicePreferences,
  selectedVoiceName,
  voiceDiagnostics,
  onTestVoice,
  onUpdateVoicePreferences,
  onResetVoicePreferences,
  apiCounters,
}) => {
  return (
    <div className="carplay-settings-container">
      {/* 1. SEÇÃO SPOTIFY */}
      <div className="settings-section-card glass-panel">
        <h3 className="section-title">🟢 Integração Spotify</h3>
        <div className="settings-row">
          <span>Status do Serviço</span>
          <span className={`status-pill ${spotifyStatus.authenticated ? 'active' : 'inactive'}`}>
            {spotifyStatus.authenticated ? 'Autenticado' : 'Não Autenticado'}
          </span>
        </div>

        {spotifyStatus.user && (
          <p className="user-info-text">
            Conectado como: <strong>{spotifyStatus.user.displayName}</strong> ({spotifyStatus.user.isPremium ? 'Premium' : 'Free'})
          </p>
        )}

        <div className="settings-row" style={{ marginTop: '0.5rem' }}>
          {spotifyStatus.authenticated ? (
            <button type="button" className="action-button danger" onClick={onLogoutSpotify}>
              Desconectar do Spotify
            </button>
          ) : (
            <button type="button" className="action-button primary" onClick={onLoginSpotify}>
              Conectar Conta do Spotify
            </button>
          )}
        </div>
      </div>

      {/* 2. SEÇÃO SÍNTESE DE VOZ (TTS) */}
      <div className="settings-section-card glass-panel">
        <h3 className="section-title">🎙️ Configurações de Voz (TTS)</h3>
        <div className="settings-row">
          <label htmlFor="voice-select">Voz Selecionada</label>
          <select
            id="voice-select"
            value={selectedVoiceName}
            onChange={(e) => onUpdateVoicePreferences({ voiceName: e.target.value })}
            className="source-selector-select"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <span>Velocidade ({voicePreferences.rate}x)</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={voicePreferences.rate}
            onChange={(e) => onUpdateVoicePreferences({ rate: parseFloat(e.target.value) })}
          />
        </div>

        <div className="settings-row">
          <span>Tom ({voicePreferences.pitch})</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={voicePreferences.pitch}
            onChange={(e) => onUpdateVoicePreferences({ pitch: parseFloat(e.target.value) })}
          />
        </div>

        <div className="settings-row" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
          <button type="button" className="action-button secondary" onClick={onTestVoice}>
            🔊 Testar Voz
          </button>
          <button type="button" className="action-button danger" onClick={onResetVoicePreferences}>
            Restaurar Padrões
          </button>
        </div>
      </div>

      {/* 3. MÉTRICAS DE DESEMPENHO E REDE */}
      <div className="settings-section-card glass-panel">
        <h3 className="section-title">📊 Estatísticas e Requisições API</h3>
        {voiceDiagnostics?.lastError && (
          <p style={{ fontSize: '0.72rem', color: '#ff453a' }}>Diagnostic: {voiceDiagnostics.lastError}</p>
        )}
        <div className="settings-metrics-grid">
          <div className="metric-box">
            <span className="metric-num">{apiCounters?.totalRequests || 0}</span>
            <span className="metric-label">Total Requisições</span>
          </div>
          <div className="metric-box">
            <span className="metric-num">{apiCounters?.successfulRequests || 0}</span>
            <span className="metric-label">Sucesso</span>
          </div>
          <div className="metric-box">
            <span className="metric-num">{apiCounters?.failedRequests || 0}</span>
            <span className="metric-label">Falhas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
