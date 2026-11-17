import React from 'react';
import { AssistantState } from '../types';
import { stateMessages } from '../data/mockData';
import '../styles/AssistantStatus.css';

interface AssistantStatusProps {
  currentState: AssistantState;
  onSelectState: (state: AssistantState) => void;
}

export const AssistantStatus: React.FC<AssistantStatusProps> = ({ currentState, onSelectState }) => {
  const states: AssistantState[] = ['available', 'listening', 'processing', 'responding'];

  const getStatusColor = (state: AssistantState) => {
    return stateMessages[state].statusColor;
  };

  return (
    <section className="assistant-status-panel glass-panel" aria-label="Controle de Status do Assistente">
      <div className="status-header">
        <span className="status-label-title">Status do Assistente</span>
        <div
          className="current-badge"
          style={{
            borderColor: `${getStatusColor(currentState)}40`,
            backgroundColor: `${getStatusColor(currentState)}15`,
          }}
          role="status"
          aria-live="polite"
        >
          <span
            className="status-indicator-dot"
            style={{
              backgroundColor: getStatusColor(currentState),
              boxShadow: `0 0 8px ${getStatusColor(currentState)}`,
            }}
            aria-hidden="true"
          ></span>
          <span className="status-indicator-text" style={{ color: getStatusColor(currentState) }}>
            {stateMessages[currentState].label}
          </span>
        </div>
      </div>

      <div className="state-selector-group" role="tablist" aria-label="Alternar estados visuais">
        {states.map((state) => {
          const isActive = currentState === state;
          const config = stateMessages[state];
          return (
            <button
              key={state}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`state-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectState(state)}
            >
              <span
                className="btn-dot"
                style={{
                  backgroundColor: config.statusColor,
                }}
                aria-hidden="true"
              ></span>
              <span className="btn-text">{config.label.replace('...', '')}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
