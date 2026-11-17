import React from 'react';
import './AnimatedWeatherLayer.css';

interface AnimatedWeatherLayerProps {
  condition: string;
}

export const AnimatedWeatherLayer: React.FC<AnimatedWeatherLayerProps> = ({ condition }) => {
  const condLower = (condition || '').toLowerCase();

  const isRain = condLower.includes('chuva') || condLower.includes('garoa') || condLower.includes('tempestade');
  const isSun = condLower.includes('sol') || condLower.includes('ensolarado') || condLower.includes('limpo');
  const isNight = condLower.includes('noite');
  const isClouds = condLower.includes('nublado') || condLower.includes('parcialmente') || (!isRain && !isSun && !isNight);

  return (
    <div className="weather-animated-container" aria-hidden="true">
      {/* 1. Nuvens em Camadas de Parallax Sutil (Nublado / Parcialmente Nublado) */}
      {(isClouds || condLower.includes('parcialmente') || isRain) && (
        <>
          {/* Camada Traseira (Lenta) */}
          <div className="cloud-parallax-layer layer-back">
            <svg className="svg-cloud cloud-svg-1" viewBox="0 0 100 50">
              <path d="M10,40 Q20,20 40,25 Q55,10 75,25 Q90,20 95,40 Z" fill="rgba(255, 255, 255, 0.28)" />
            </svg>
          </div>

          {/* Camada Frontal (Mais rápida) */}
          <div className="cloud-parallax-layer layer-front">
            <svg className="svg-cloud cloud-svg-2" viewBox="0 0 120 60">
              <path d="M10,45 Q25,15 50,20 Q70,5 95,20 Q110,25 115,45 Z" fill="rgba(255, 255, 255, 0.45)" />
            </svg>
          </div>
        </>
      )}

      {/* 2. Sol Brilhante Pulsante e Raios (Ensolarado / Céu Limpo) */}
      {isSun && (
        <div className="sun-glowing-wrapper">
          <div className="sun-core" />
        </div>
      )}

      {/* 3. Gotas de Chuva (Chuva) */}
      {isRain && (
        <div className="rain-curtain">
          <div className="rain-drop drop-1" />
          <div className="rain-drop drop-2" />
          <div className="rain-drop drop-3" />
        </div>
      )}

      {/* 4. Estrelas Cintilantes (Noite Limpa) */}
      {isNight && (
        <div className="night-stars-field">
          <span className="twinkle-star star-1" />
          <span className="twinkle-star star-2" />
        </div>
      )}
    </div>
  );
};
