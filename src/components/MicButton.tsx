import React from 'react';
import { AssistantState } from '../types';
import '../styles/MicButton.css';

interface MicButtonProps {
  currentState: AssistantState;
  onToggleMic: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({ currentState, onToggleMic }) => {
  const getAriaLabel = () => {
    switch (currentState) {
      case 'available':
        return 'JEX Disponível. Clique para ativar a escuta de voz';
      case 'listening':
        return 'JEX Ouvindo. Clique para pausar ou alterar estado';
      case 'processing':
        return 'JEX Processando comando';
      case 'responding':
        return 'JEX Respondendo. Clique para pausar fala';
    }
  };

  return (
    <div className={`mic-section-container state-${currentState}`}>
      <div className="mic-outer-ring ring-3" aria-hidden="true"></div>
      <div className="mic-outer-ring ring-2" aria-hidden="true"></div>
      <div className="mic-outer-ring ring-1" aria-hidden="true"></div>

      <button
        type="button"
        className={`central-mic-button ${currentState}`}
        onClick={onToggleMic}
        aria-label={getAriaLabel()}
        title="Clique para alternar o estado do assistente JEX"
      >
        <div className="mic-icon-wrapper">
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="8" y1="22" x2="16" y2="22"></line>
          </svg>
        </div>
      </button>

      <div className="mic-state-label" role="status" aria-live="polite">
        {currentState === 'available' && 'Clique para falar'}
        {currentState === 'listening' && 'Escutando você...'}
        {currentState === 'processing' && 'Processando resposta...'}
        {currentState === 'responding' && 'Respondendo...'}
      </div>
    </div>
  );
};
