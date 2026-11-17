import React, { useState, useEffect } from 'react';
import { TimerItem } from '../types';
import '../styles/Cards.css';

interface TimersCardProps {
  initialTimers: TimerItem[];
}

export const TimersCard: React.FC<TimersCardProps> = ({ initialTimers }) => {
  const [timers, setTimers] = useState<TimerItem[]>(initialTimers);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (!timer.active || timer.remainingSeconds <= 0) return timer;
          return { ...timer, remainingSeconds: timer.remainingSeconds - 1 };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleTimerState = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) =>
        timer.id === id ? { ...timer, active: !timer.active } : timer
      )
    );
  };

  return (
    <div className="widget-card glass-panel timers-card">
      <div className="card-header">
        <div className="header-title-group">
          <svg className="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="2" x2="14" y2="2"></line>
            <line x1="12" y1="14" x2="15" y2="11"></line>
            <circle cx="12" cy="14" r="8"></circle>
          </svg>
          <h3>Timers Ativos</h3>
        </div>
        <span className="count-badge">{timers.length} Rodando</span>
      </div>

      <div className="timer-list">
        {timers.map((timer) => {
          const progressPercent = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;
          return (
            <div key={timer.id} className="timer-item">
              <div className="timer-info">
                <div className="timer-top-row">
                  <span className="timer-title">{timer.label}</span>
                  <span className="timer-digits">{formatTimer(timer.remainingSeconds)}</span>
                </div>
                <div className="timer-progress-bg">
                  <div
                    className="timer-progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                  ></div>
                </div>
              </div>

              <button
                className="timer-control-btn"
                onClick={() => toggleTimerState(timer.id)}
                title={timer.active ? 'Pausar' : 'Iniciar'}
              >
                {timer.active ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21"></polygon>
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
