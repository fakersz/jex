import React from 'react';
import { AlarmItem } from '../types';
import '../styles/Cards.css';

interface AlarmsCardProps {
  initialAlarms: AlarmItem[];
  onToggleAlarm?: (id: string) => void;
  onDeleteAlarm?: (id: string) => string;
}

export const AlarmsCard: React.FC<AlarmsCardProps> = ({ initialAlarms, onToggleAlarm }) => {
  return (
    <div className="widget-card glass-panel alarms-card">
      <div className="card-header">
        <div className="header-title-group">
          <svg className="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="13" r="8"></circle>
            <path d="M12 9v4l2 2"></path>
            <path d="M5 3L2 6M22 6l-3-3"></path>
          </svg>
          <h3>Alarmes Agendados</h3>
        </div>
        <span className="count-badge">{initialAlarms.filter((a) => a.active || a.enabled).length} Ativos</span>
      </div>

      <div className="alarm-list">
        {initialAlarms.map((alarm) => {
          const isActive = alarm.active ?? alarm.enabled ?? true;
          const daysStr = Array.isArray(alarm.days) ? alarm.days.join(', ') : alarm.days;

          return (
            <div key={alarm.id} className={`alarm-item ${isActive ? 'active' : 'disabled'}`}>
              <div className="alarm-info">
                <span className="alarm-time">{alarm.time}</span>
                <div className="alarm-details">
                  <span className="alarm-label">{alarm.label}</span>
                  <span className="alarm-days">{daysStr}</span>
                </div>
              </div>

              <button
                className={`toggle-switch ${isActive ? 'on' : 'off'}`}
                onClick={() => onToggleAlarm && onToggleAlarm(alarm.id)}
                aria-label={`Alternar alarme ${alarm.label}`}
                type="button"
              >
                <span className="switch-thumb"></span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
