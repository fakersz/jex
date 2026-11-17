import React, { useState, useEffect } from 'react';
import { formatFullDate, formatTime24h } from '../utils/dateFormat';
import '../styles/ClockDisplay.css';

export const ClockDisplay: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="clock-display-container glass-panel">
      <div className="clock-glowing-backdrop" aria-hidden="true"></div>
      <div className="clock-content">
        <div className="clock-time" id="realtime-clock" aria-label={`Hora atual ${formatTime24h(time)}`}>
          {formatTime24h(time)}
        </div>
        <div className="clock-date" id="realtime-date">
          {formatFullDate(time)}
        </div>
      </div>
    </section>
  );
};
