import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerItem, AlarmItem } from '../types';

const TIMERS_STORAGE_KEY = 'jex_active_timers';
const ALARMS_STORAGE_KEY = 'jex_active_alarms';

export interface UseTimersManagerReturn {
  timers: TimerItem[];
  alarms: AlarmItem[];
  addTimer: (data: { timerId: string; label: string; durationSeconds: number; endsAt: string }) => void;
  pauseTimer: (timerId?: string) => string;
  resumeTimer: (timerId?: string) => string;
  cancelTimer: (timerId?: string) => string;
  getTimeRemaining: (timerId?: string) => string;
  listTimers: () => string;
  addAlarm: (data: { alarmId: string; time: string }) => void;
  toggleAlarm: (id: string) => void;
  deleteAlarm: (id: string) => string;
  listAlarms: () => string;
}

function playTimerChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn('[TimerManager] Erro ao tocar sinal sonoro:', e);
  }
}

export function useTimersManager(speakCallback?: (text: string) => void): UseTimersManagerReturn {
  const [timers, setTimers] = useState<TimerItem[]>(() => {
    try {
      const saved = localStorage.getItem(TIMERS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [
      { id: '1', label: 'Molho de Tomate', totalSeconds: 600, durationSeconds: 600, remainingSeconds: 600, active: false, isRunning: false },
    ];
  });

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    try {
      const saved = localStorage.getItem(ALARMS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [
      { id: '1', time: '07:00', label: 'Acordar para Treino', active: true, enabled: true, days: 'Seg-Sex' },
      { id: '2', time: '08:30', label: 'Reunião Daily Team', active: true, enabled: true, days: 'Seg, Qua, Sex' },
    ];
  });

  const speakRef = useRef(speakCallback);
  useEffect(() => {
    speakRef.current = speakCallback;
  }, [speakCallback]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers));
    } catch (e) {}
  }, [timers]);

  useEffect(() => {
    try {
      localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (e) {}
  }, [alarms]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        let changed = false;

        const updated = prevTimers.map((t) => {
          const isRunning = t.isRunning ?? t.active ?? false;
          if (!isRunning || t.remainingSeconds <= 0) return t;

          changed = true;
          const nextRemaining = t.remainingSeconds - 1;

          if (nextRemaining === 0) {
            playTimerChime();
            const alertText = `Jean, o seu ${t.label.toLowerCase()} terminou.`;
            console.log(`[TimerManager] TIMER CONCLUÍDO: ${alertText}`);

            if (speakRef.current) {
              speakRef.current(alertText);
            }

            return {
              ...t,
              remainingSeconds: 0,
              active: false,
              isRunning: false,
            };
          }

          return {
            ...t,
            remainingSeconds: nextRemaining,
          };
        });

        return changed ? updated : prevTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTimer = useCallback((data: { timerId: string; label: string; durationSeconds: number; endsAt: string }) => {
    setTimers((prev) => [
      ...prev,
      {
        id: data.timerId,
        label: data.label,
        totalSeconds: data.durationSeconds,
        durationSeconds: data.durationSeconds,
        remainingSeconds: data.durationSeconds,
        active: true,
        isRunning: true,
      },
    ]);
  }, []);

  const pauseTimer = useCallback((timerId?: string): string => {
    let resultMessage = '';
    setTimers((prev) => {
      if (prev.length === 0) {
        resultMessage = 'Você não possui nenhum timer para pausar.';
        return prev;
      }

      if (prev.length > 1 && !timerId) {
        resultMessage = 'Você tem mais de um timer ativo. Por favor, especifique qual deseja pausar.';
        return prev;
      }

      const targetId = timerId || prev[0].id;
      resultMessage = `Timer "${prev.find((t) => t.id === targetId)?.label || 'Timer'}" pausado.`;

      return prev.map((t) => (t.id === targetId ? { ...t, active: false, isRunning: false } : t));
    });
    return resultMessage;
  }, []);

  const resumeTimer = useCallback((timerId?: string): string => {
    let resultMessage = '';
    setTimers((prev) => {
      if (prev.length === 0) {
        resultMessage = 'Você não possui nenhum timer pausado.';
        return prev;
      }

      const targetId = timerId || prev[0].id;
      resultMessage = `Timer "${prev.find((t) => t.id === targetId)?.label || 'Timer'}" retomado.`;

      return prev.map((t) => (t.id === targetId ? { ...t, active: true, isRunning: true } : t));
    });
    return resultMessage;
  }, []);

  const cancelTimer = useCallback((timerId?: string): string => {
    let resultMessage = '';
    setTimers((prev) => {
      if (prev.length === 0) {
        resultMessage = 'Nenhum timer ativo para cancelar.';
        return prev;
      }

      if (prev.length > 1 && !timerId) {
        resultMessage = 'Você possui mais de um timer ativo. Qual deles deseja cancelar?';
        return prev;
      }

      const targetId = timerId || prev[0].id;
      const target = prev.find((t) => t.id === targetId);
      resultMessage = `Timer "${target?.label || 'Timer'}" cancelado com sucesso.`;

      return prev.filter((t) => t.id !== targetId);
    });
    return resultMessage;
  }, []);

  const getTimeRemaining = useCallback((timerId?: string): string => {
    if (timers.length === 0) {
      return 'Não há nenhum timer em andamento.';
    }

    const target = timerId ? timers.find((t) => t.id === timerId) : timers[0];
    if (!target) return 'Timer não encontrado.';

    const rem = target.remainingSeconds;
    if (rem <= 0) return `O timer "${target.label}" já foi concluído.`;

    const mins = Math.floor(rem / 60);
    const secs = rem % 60;

    let timeStr = '';
    if (mins > 0 && secs > 0) {
      timeStr = `${mins} minutos e ${secs} segundos`;
    } else if (mins > 0) {
      timeStr = mins === 1 ? '1 minuto' : `${mins} minutos`;
    } else {
      timeStr = `${secs} segundos`;
    }

    return `Faltam ${timeStr} para concluir o ${target.label.toLowerCase()}.`;
  }, [timers]);

  const listTimers = useCallback((): string => {
    if (timers.length === 0) {
      return 'Você não possui nenhum timer configurado no momento.';
    }

    const labels = timers.map((t) => {
      const mins = Math.floor(t.remainingSeconds / 60);
      const isRunning = t.isRunning ?? t.active ?? false;
      const stateStr = isRunning ? `${mins} min restantes` : 'pausado';
      return `${t.label} (${stateStr})`;
    });

    return `Você tem ${timers.length} timer${timers.length > 1 ? 's' : ''}: ${labels.join(', ')}.`;
  }, [timers]);

  const addAlarm = useCallback((data: { alarmId: string; time: string }) => {
    setAlarms((prev) => [
      ...prev,
      {
        id: data.alarmId,
        time: data.time,
        label: `Alarme das ${data.time}`,
        active: true,
        enabled: true,
        days: 'Hoje',
      },
    ]);
  }, []);

  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active, enabled: !a.enabled } : a)));
  }, []);

  const deleteAlarm = useCallback((id: string): string => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    return 'Alarme removido com sucesso.';
  }, []);

  const listAlarms = useCallback((): string => {
    const active = alarms.filter((a) => a.active || a.enabled);
    if (active.length === 0) return 'Você não tem nenhum alarme ativo.';
    const times = active.map((a) => a.time).join(', ');
    return `Você tem alarmes configurados para: ${times}.`;
  }, [alarms]);

  return {
    timers,
    alarms,
    addTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    getTimeRemaining,
    listTimers,
    addAlarm,
    toggleAlarm,
    deleteAlarm,
    listAlarms,
  };
}
