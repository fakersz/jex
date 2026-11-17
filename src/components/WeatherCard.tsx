import React, { useState } from 'react';
import { WeatherData } from '../types';
import { useLocation } from '../hooks/useLocation';
import { LocationSettingsModal } from './LocationSettingsModal/LocationSettingsModal';
import '../styles/Cards.css';

interface WeatherCardProps {
  simulatedMetrics: WeatherData;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ simulatedMetrics }) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const {
    displayName,
    source,
    isLoading,
    errorMessage,
    preferences,
    savePreferences,
    clearManualLocation,
    retryGeolocation,
  } = useLocation();

  const getSourceBadgeLabel = () => {
    switch (source) {
      case 'automatic':
        return 'Automática';
      case 'manual':
        return 'Manual';
      case 'fallback':
        return 'Padrão';
    }
  };

  return (
    <>
      <div className="widget-card glass-panel weather-card">
        <div className="card-header">
          <div className="header-title-group">
            <svg
              className="card-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
              <circle cx="12" cy="12" r="5"></circle>
            </svg>
            <h3>Clima Local</h3>
          </div>

          <div className="card-header-actions">
            <span className={`source-badge badge-${source}`} title={`Origem: ${getSourceBadgeLabel()}`}>
              {getSourceBadgeLabel()}
            </span>
            <button
              type="button"
              className="icon-btn-settings"
              onClick={() => setIsModalOpen(true)}
              aria-label="Configurar localização"
              title="Configurar localização"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="location-name-row">
          <span className="location-display-name">📍 {displayName}</span>
          {isLoading && <span className="location-loading-spinner" title="Localizando...">⏳</span>}
        </div>

        {errorMessage && (
          <div className="location-error-notice">
            <span className="error-text">{errorMessage}</span>
            <button type="button" className="retry-geo-btn" onClick={retryGeolocation}>
              Tentar novamente
            </button>
          </div>
        )}

        {source === 'fallback' && !errorMessage && !isLoading && (
          <div className="location-fallback-notice">
            <span>Usando localização padrão do sistema.</span>
            <button type="button" className="inline-config-btn" onClick={() => setIsModalOpen(true)}>
              Alterar
            </button>
          </div>
        )}

        <div className="weather-main-info">
          <div className="temp-display">
            <span className="temp-value">{simulatedMetrics.temperature}°</span>
            <span className="temp-unit">C</span>
          </div>
          <div className="weather-condition-group">
            <span className="condition-text">{simulatedMetrics.condition}</span>
            <div className="high-low-temp">
              <span>Máx: {simulatedMetrics.tempHigh}°</span>
              <span>Mín: {simulatedMetrics.tempLow}°</span>
            </div>
          </div>
        </div>

        <div className="weather-metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Umidade</span>
            <span className="metric-value">{simulatedMetrics.humidity}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Vento</span>
            <span className="metric-value">{simulatedMetrics.windSpeedKmH} km/h</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Índice UV</span>
            <span className="metric-value">{simulatedMetrics.uvIndex} (Moderado)</span>
          </div>
        </div>
      </div>

      <LocationSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPreferences={preferences}
        currentSource={source}
        onSave={savePreferences}
        onClearManual={clearManualLocation}
        onRetryGeo={retryGeolocation}
      />
    </>
  );
};
