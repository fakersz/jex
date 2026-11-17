import React, { useEffect } from 'react';
import { VoicePreferences } from '../../hooks/useSpeechSynthesis';
import './VoiceSettingsModal.css';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voices: SpeechSynthesisVoice[];
  preferences: VoicePreferences;
  selectedVoice: SpeechSynthesisVoice | null;
  onUpdatePreferences: (newPrefs: Partial<VoicePreferences>) => void;
  onResetPreferences: () => void;
  onTestVoice: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  voices,
  preferences,
  selectedVoice,
  onUpdatePreferences,
  onResetPreferences,
  onTestVoice,
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-content glass-panel voice-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
      >
        <div className="modal-header">
          <div className="header-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
              <line x1="8" y1="22" x2="16" y2="22"></line>
            </svg>
            <h2 id="voice-modal-title">Configurar Voz do JEX</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar janela de configuração de voz"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Seletor de Voz */}
          <div className="form-group">
            <label htmlFor="voice-select">Voz do Assistente</label>
            <select
              id="voice-select"
              className="voice-select-input"
              value={selectedVoice?.voiceURI || preferences.voiceURI || ''}
              onChange={(e) => onUpdatePreferences({ voiceURI: e.target.value })}
            >
              {voices.length === 0 && <option value="">Nenhuma voz encontrada</option>}
              {voices.map((voice) => {
                const isLocal = voice.localService ? 'Local' : 'Rede';
                return (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang}) - [{isLocal}]
                  </option>
                );
              })}
            </select>
            <span className="field-hint">
              Vozes em Português (pt-BR e pt-PT) aparecem no topo da lista.
            </span>
          </div>

          {/* Slider de Velocidade (Rate) */}
          <div className="form-group slider-group">
            <div className="slider-label-row">
              <label htmlFor="rate-slider">Velocidade da Fala</label>
              <span className="slider-value-badge">{preferences.rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              id="rate-slider"
              min="0.7"
              max="1.3"
              step="0.05"
              value={preferences.rate}
              onChange={(e) => onUpdatePreferences({ rate: parseFloat(e.target.value) })}
            />
            <div className="slider-scale">
              <span>Lenta (0.7x)</span>
              <span>Normal (1.0x)</span>
              <span>Rápida (1.3x)</span>
            </div>
          </div>

          {/* Slider de Tom (Pitch) */}
          <div className="form-group slider-group">
            <div className="slider-label-row">
              <label htmlFor="pitch-slider">Tom da Voz (Pitch)</label>
              <span className="slider-value-badge">{preferences.pitch.toFixed(2)}</span>
            </div>
            <input
              type="range"
              id="pitch-slider"
              min="0.7"
              max="1.3"
              step="0.05"
              value={preferences.pitch}
              onChange={(e) => onUpdatePreferences({ pitch: parseFloat(e.target.value) })}
            />
            <div className="slider-scale">
              <span>Grave (0.7)</span>
              <span>Normal (1.0)</span>
              <span>Agudo (1.3)</span>
            </div>
          </div>

          {/* Slider de Volume */}
          <div className="form-group slider-group">
            <div className="slider-label-row">
              <label htmlFor="volume-slider">Volume do Áudio</label>
              <span className="slider-value-badge">{Math.round(preferences.volume * 100)}%</span>
            </div>
            <input
              type="range"
              id="volume-slider"
              min="0"
              max="1.0"
              step="0.05"
              value={preferences.volume}
              onChange={(e) => onUpdatePreferences({ volume: parseFloat(e.target.value) })}
            />
          </div>

          {/* Ações do Modal */}
          <div className="voice-modal-actions">
            <button
              type="button"
              className="btn-test-voice"
              onClick={onTestVoice}
              title="Testar como soa a nova voz configurada"
            >
              🔊 Testar Voz
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={onResetPreferences}
              title="Restaurar voz e parâmetros padrão"
            >
              Restaurar Padrão
            </button>

            <button type="button" className="btn-primary" onClick={onClose}>
              Concluído
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
