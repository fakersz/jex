import React, { useState } from 'react';
import { AssistantState } from '../types';
import { stateMessages } from '../data/mockData';
import { SpeechDiagnosticInfo } from '../hooks/useSpeechRecognition';
import { SynthesisState, VoicePreferences, SystemVoiceDiagnosticInfo } from '../hooks/useSpeechSynthesis';
import { AssistantApiResponse, AssistantCounters } from '../hooks/useAssistantApi';
import { VoiceSettingsModal } from './VoiceSettingsModal/VoiceSettingsModal';
import '../styles/MessageDisplay.css';

interface MessageDisplayProps {
  currentState: AssistantState;
  transcript?: string;
  interimTranscript?: string;
  lastTranscript?: string;
  speechErrorMessage?: string | null;
  technicalError?: string | null;
  isSpeechSupported?: boolean;
  diagnostics?: SpeechDiagnosticInfo;
  onClearTranscript?: () => void;

  // Speech Synthesis (TTS) props
  synthesisState?: SynthesisState;
  voices?: SpeechSynthesisVoice[];
  voicePreferences?: VoicePreferences;
  selectedVoice?: SpeechSynthesisVoice | null;
  selectedVoiceName?: string | null;
  voiceDiagnostics?: SystemVoiceDiagnosticInfo;
  onRepeatSpeech?: () => void;
  onStopSpeech?: () => void;
  onTestVoice?: () => void;
  onUpdateVoicePreferences?: (newPrefs: Partial<VoicePreferences>) => void;
  onResetVoicePreferences?: () => void;

  // Backend API response & Counters
  apiResponse?: AssistantApiResponse | null;
  counters?: AssistantCounters;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  currentState,
  transcript = '',
  interimTranscript = '',
  lastTranscript = '',
  speechErrorMessage = null,
  technicalError = null,
  isSpeechSupported = true,
  diagnostics,
  onClearTranscript,
  synthesisState = 'idle',
  voices = [],
  voicePreferences = { voiceURI: '', rate: 1.0, pitch: 1.0, volume: 1.0 },
  selectedVoice = null,
  selectedVoiceName = null,
  voiceDiagnostics = { mechanism: 'Voz do sistema', voiceName: 'Voz Padrão', lang: 'pt-BR', rate: 1.0, pitch: 1.0, volume: 1.0 },
  onRepeatSpeech,
  onStopSpeech,
  onTestVoice,
  onUpdateVoicePreferences,
  onResetVoicePreferences,
  apiResponse = null,
  counters = { totalCommands: 0, totalGeminiCalls: 0, totalLocalResponses: 0, total429Errors: 0 },
}) => {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const currentConfig = stateMessages[currentState];
  const activeText = transcript || lastTranscript;

  const getDisplayText = () => {
    if (currentState === 'processing') {
      return 'Pensando...';
    }
    if (apiResponse && apiResponse.text) {
      return apiResponse.text;
    }
    if (activeText && currentState === 'responding') {
      return `Entendi o seu comando: "${activeText}". Como posso ajudar?`;
    }
    return currentConfig.detail;
  };

  return (
    <>
      <div className="message-display-card glass-panel">
        <div className="message-header">
          <div className="assistant-avatar" aria-hidden="true">
            <span>JEX</span>
          </div>
          <div className="message-meta">
            <span className="assistant-name">JEX Intelligence</span>
            <span className="message-timestamp">Agora</span>
          </div>

          {apiResponse && (
            <div className="api-source-badge-container">
              <span className={`source-pill pill-${apiResponse.source}`}>
                {apiResponse.source === 'local' ? '⚡ Roteador Local' : '✨ Gemini AI'}
              </span>
            </div>
          )}

          {(currentState === 'responding' || synthesisState === 'speaking') && (
            <div className="audio-wave-bars" aria-label="JEX falando">
              <span className="bar bar1"></span>
              <span className="bar bar2"></span>
              <span className="bar bar3"></span>
              <span className="bar bar4"></span>
            </div>
          )}
        </div>

        {!isSpeechSupported && (
          <div className="speech-unsupported-notice">
            <span>⚠️ Seu navegador não possui suporte à Web Speech API. Use o Google Chrome.</span>
          </div>
        )}

        {speechErrorMessage && (
          <div className="speech-error-notice" role="alert">
            <span>⚠️ {speechErrorMessage}</span>
            {technicalError && <span className="tech-error-tag">[{technicalError}]</span>}
          </div>
        )}

        {/* Real-time Interim (partial) Transcript */}
        {interimTranscript && (
          <div className="transcript-box interim">
            <div className="transcript-header">
              <span className="transcript-label interim-label">🎙️ Ouvindo você (parcial)...</span>
            </div>
            <p className="transcript-text interim-text">"{interimTranscript}..."</p>
          </div>
        )}

        {/* Definitive Final Transcript */}
        {!interimTranscript && activeText && (
          <div className="transcript-box final">
            <div className="transcript-header">
              <span className="transcript-label">🗣️ Comando do usuário:</span>
              {onClearTranscript && lastTranscript && (
                <button
                  type="button"
                  className="clear-transcript-btn"
                  onClick={onClearTranscript}
                  title="Limpar texto gravado"
                >
                  Limpar
                </button>
              )}
            </div>
            <p className="transcript-text">"{activeText}"</p>
          </div>
        )}

        <div className="message-body">
          <p className="message-text">{getDisplayText()}</p>
        </div>

        {/* Speech Controls Bar */}
        <div className="speech-controls-bar">
          <div className="speech-left-btns">
            {synthesisState === 'speaking' ? (
              <button
                type="button"
                className="speech-btn stop-btn"
                onClick={onStopSpeech}
                title="Parar reprodução de voz do assistente"
              >
                ⏹️ Parar Fala
              </button>
            ) : (
              <button
                type="button"
                className="speech-btn repeat-btn"
                onClick={onRepeatSpeech}
                title="Ouvir a resposta do assistente novamente em voz alta"
              >
                🔊 Ouvir Resposta
              </button>
            )}

            {onTestVoice && (
              <button
                type="button"
                className="speech-btn test-btn"
                onClick={onTestVoice}
                title="Testar a voz configurada"
              >
                🧪 Testar Voz
              </button>
            )}
          </div>

          <button
            type="button"
            className="voice-config-pill-btn"
            onClick={() => setIsVoiceModalOpen(true)}
            title="Clique para escolher a voz e ajustar velocidade, tom e volume"
          >
            🎙️ {selectedVoiceName || 'Configurar Voz'} ⚙️
          </button>
        </div>

        {currentState === 'processing' && (
          <div className="typing-indicator" aria-label="Pensando...">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {/* Painel de Diagnóstico do Sistema */}
        {diagnostics && (
          <div className="speech-diagnostic-panel">
            <div className="diagnostic-header">
              <span>🔍 Painel de Diagnóstico (Voz do Sistema & API)</span>
            </div>
            <div className="diagnostic-grid">
              <div className="diag-item">
                <span className="diag-key">Estado JEX:</span>
                <span className="diag-val">{diagnostics.currentState}</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Mecanismo Voz:</span>
                <span className="diag-val source-local">{voiceDiagnostics.mechanism}</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Voz Selecionada:</span>
                <span className="diag-val highlight-event">{voiceDiagnostics.voiceName}</span>
              </div>

              <div className="diag-item">
                <span className="diag-key">Idioma:</span>
                <span className="diag-val">{voiceDiagnostics.lang}</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Velocidade:</span>
                <span className="diag-val">{voiceDiagnostics.rate.toFixed(2)}x</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Tom / Volume:</span>
                <span className="diag-val">{voiceDiagnostics.pitch.toFixed(2)} / {Math.round(voiceDiagnostics.volume * 100)}%</span>
              </div>

              <div className="diag-item">
                <span className="diag-key">Comandos Totais:</span>
                <span className="diag-val">{counters.totalCommands}</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Respostas Locais:</span>
                <span className="diag-val source-local">{counters.totalLocalResponses}</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Chamadas Gemini:</span>
                <span className="diag-val source-gemini">{counters.totalGeminiCalls}</span>
              </div>

              <div className="diag-item full-width">
                <span className="diag-key">Comando do Usuário:</span>
                <span className="diag-val">{diagnostics.finalTranscript || '(nenhum)'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voices={voices}
        preferences={voicePreferences}
        selectedVoice={selectedVoice}
        onUpdatePreferences={onUpdateVoicePreferences || (() => {})}
        onResetPreferences={onResetVoicePreferences || (() => {})}
        onTestVoice={onTestVoice || (() => {})}
      />
    </>
  );
};
