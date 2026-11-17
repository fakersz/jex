import React, { useState, useEffect, useRef } from 'react';
import { AssistantState } from './types';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useAssistantApi } from './hooks/useAssistantApi';
import { useTimersManager } from './hooks/useTimersManager';
import { useMusicPlayer } from './hooks/useMusicPlayer';
import { stateMessages, mockWeatherData, mockCalendarEvents } from './data/mockData';
import { getWeatherTheme } from './utils/weatherThemes';

import { CarPlayTopBar } from './components/carplay/CarPlayTopBar';
import { AppDock } from './components/carplay/AppDock';
import { AppTile } from './components/carplay/AppTile';
import { FullscreenPanel } from './components/carplay/FullscreenPanel';
import { SettingsPanel } from './components/carplay/pages/SettingsPanel';

import { MessageDisplay } from './components/MessageDisplay';
import { NowPlayingCard } from './components/NowPlayingCard';
import { WeatherCard } from './components/WeatherCard';
import { AlarmsCard } from './components/AlarmsCard';
import { TimersCard } from './components/TimersCard';
import { CalendarCard } from './components/CalendarCard';

import './styles/global.css';
import './styles/carplay.css';

export type CarPlayTabType =
  | 'home'
  | 'assistant'
  | 'music'
  | 'weather'
  | 'timers'
  | 'alarms'
  | 'calendar'
  | 'settings';

export const App: React.FC = () => {
  const [assistantState, setAssistantState] = useState<AssistantState>('available');
  const [activeTab, setActiveTab] = useState<CarPlayTabType>('home');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Relógio em Tempo Real para o CarPlay TopBar
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Backend Assistant API Hook
  const {
    isLoading: isApiLoading,
    lastResponse: apiResponse,
    counters: apiCounters,
    sendAssistantMessage,
    cancelOngoingRequest,
  } = useAssistantApi();

  // Speech Synthesis (TTS) Hook
  const {
    synthesisState,
    voices,
    preferences: voicePreferences,
    selectedVoice,
    selectedVoiceName,
    voiceDiagnostics,
    speak: speakText,
    testVoice,
    stop: stopSpeech,
    updatePreferences: updateVoicePreferences,
    resetPreferences: resetVoicePreferences,
  } = useSpeechSynthesis({
    onStartSpeaking: () => setAssistantState('responding'),
    onEndSpeaking: () => setAssistantState('available'),
  });

  const speakTextRef = useRef(speakText);
  useEffect(() => {
    speakTextRef.current = speakText;
  }, [speakText]);

  // Player de Música Ambiente com Audio Ducking
  const isJexSpeaking = synthesisState === 'speaking' || assistantState === 'responding';
  const musicPlayer = useMusicPlayer(isJexSpeaking);

  // Timers & Alarms Local State Manager
  const {
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
  } = useTimersManager((textToAnnounce) => {
    speakTextRef.current(textToAnnounce);
  });

  const sendApiRef = useRef(sendAssistantMessage);
  useEffect(() => {
    sendApiRef.current = sendAssistantMessage;
  }, [sendAssistantMessage]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Speech Recognition (STT) Hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    lastTranscript,
    errorMessage: speechErrorMessage,
    technicalError,
    diagnostics,
    toggleListening,
    clearTranscript,
  } = useSpeechRecognition((newState) => {
    setAssistantState(newState);

    if (newState === 'processing') {
      const activeUserText = transcript || lastTranscript;

      if (activeUserText && activeUserText.trim()) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          sendApiRef.current(activeUserText.trim()).then((apiRes) => {
            if (apiRes) {
              let textToSpeak = apiRes.text;

              if (apiRes.source === 'local') {
                if (apiRes.action && apiRes.action.type) {
                  const musicMsg = musicPlayer.executeVoiceAction(apiRes.action);
                  if (musicMsg) textToSpeak = musicMsg;
                }

                switch (apiRes.intent) {
                  case 'criar_timer':
                    if (apiRes.data) addTimer(apiRes.data);
                    break;
                  case 'pausar_timer':
                    textToSpeak = pauseTimer();
                    break;
                  case 'continuar_timer':
                    textToSpeak = resumeTimer();
                    break;
                  case 'cancelar_timer':
                    textToSpeak = cancelTimer();
                    break;
                  case 'tempo_restante_timer':
                    textToSpeak = getTimeRemaining();
                    break;
                  case 'listar_timers':
                    textToSpeak = listTimers();
                    break;
                  case 'criar_alarme':
                    if (apiRes.data) addAlarm(apiRes.data);
                    break;
                  case 'listar_alarmes':
                    textToSpeak = listAlarms();
                    break;
                  case 'cancelar_alarme':
                    textToSpeak = deleteAlarm('1');
                    break;
                }
              }

              if (textToSpeak) {
                speakTextRef.current(textToSpeak);
              } else {
                setAssistantState('available');
              }
            } else {
              setAssistantState('available');
            }
          });
        }, 800);
      } else {
        setTimeout(() => {
          speakTextRef.current(stateMessages.available.detail);
        }, 400);
      }
    }
  }, assistantState);

  const handleToggleMic = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    stopSpeech();
    cancelOngoingRequest();

    if (isSpeechSupported) {
      toggleListening();
    } else {
      const states: AssistantState[] = ['available', 'listening', 'processing', 'responding'];
      const currentIndex = states.indexOf(assistantState);
      const nextState = states[(currentIndex + 1) % states.length];
      setAssistantState(nextState);
    }
  };

  const handleRepeatSpeech = () => {
    const textToSpeak =
      apiResponse?.success && apiResponse?.text
        ? apiResponse.text
        : transcript || lastTranscript
        ? `Entendi o seu comando: ${transcript || lastTranscript}. Como posso ajudar?`
        : stateMessages.available.detail;

    speakText(textToSpeak);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatHours = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatMs = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Status resumido e tempo real da música para o Card da Home
  let musicStatusText = 'Spotify • Desconectado';
  let musicCoverUrl: string | undefined = undefined;

  if (musicPlayer.spotifyCurrentTrack) {
    const title = musicPlayer.spotifyCurrentTrack.title;
    const artist = musicPlayer.spotifyCurrentTrack.artist;
    const timeProgress = musicPlayer.spotifyDurationMs > 0
      ? ` (${formatMs(musicPlayer.spotifyProgressMs)} / ${formatMs(musicPlayer.spotifyDurationMs)})`
      : '';
    musicStatusText = `${title} • ${artist}${timeProgress}`;
    musicCoverUrl = musicPlayer.spotifyCurrentTrack.coverUrl;
  } else if (musicPlayer.spotifyStatus?.authenticated) {
    musicStatusText = 'Spotify • Conectado';
  }

  const runningTimersCount = timers.filter((t) => t.isRunning ?? t.active).length;
  const activeAlarmsCount = alarms.filter((a) => a.active ?? a.enabled).length;
  const weatherTheme = getWeatherTheme(mockWeatherData.condition);

  return (
    <div className="carplay-app-root">
      {/* 1. Barra Superior Ultra-Compacta */}
      <CarPlayTopBar
        timeString={formatHours}
        assistantLabel={stateMessages[assistantState].label}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* 2. Grade Central de Apps (3x2 Desktop / 2x3 Mobile) */}
      <main className="carplay-grid-home" role="main">
        {/* LINHA 1 - CARD 1: ASSISTENTE */}
        <AppTile
          title="Assistente"
          status={stateMessages[assistantState].detail}
          isMediaTile={true}
          mediaBgGradient="linear-gradient(135deg, #0a84ff 0%, #1e1b4b 100%)"
          accentColor="#0a84ff"
          badge={
            <span className="source-pill" style={{ background: 'rgba(10, 132, 255, 0.4)', color: '#ffffff' }}>
              🎙️ Voz
            </span>
          }
          onClick={() => setActiveTab('assistant')}
        />

        {/* LINHA 1 - CARD 2: MÚSICA SPOTIFY */}
        <AppTile
          title="Música"
          status={musicStatusText}
          isMediaTile={true}
          mediaBgUrl={musicCoverUrl}
          mediaVideoUrl={musicPlayer.spotifyCurrentTrack?.videoUrl}
          accentColor="#ff2d55"
          badge={
            <span className="source-pill" style={{ background: '#1db954', color: '#ffffff' }}>
              🟢 Spotify
            </span>
          }
          customControls={
            <div className="carplay-tile-direct-controls">
              <button
                type="button"
                className="tile-ctrl-btn"
                onClick={musicPlayer.playPrevious}
                title="Anterior"
              >
                ⏮️
              </button>
              <button
                type="button"
                className="tile-ctrl-btn"
                onClick={musicPlayer.togglePlayPause}
                title={musicPlayer.isPlaying ? 'Pausar' : 'Tocar'}
              >
                {musicPlayer.isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                type="button"
                className="tile-ctrl-btn"
                onClick={musicPlayer.playNext}
                title="Próxima"
              >
                ⏭️
              </button>
            </div>
          }
          onClick={() => setActiveTab('music')}
        />

        {/* LINHA 1 - CARD 3: CLIMA */}
        <AppTile
          title={mockWeatherData.city}
          icon={weatherTheme.icon}
          status={`${mockWeatherData.condition} • 💧 ${mockWeatherData.humidity}%`}
          temperatureHero={mockWeatherData.temperature}
          isMediaTile={true}
          mediaBgGradient={weatherTheme.gradient}
          accentColor={weatherTheme.accentColor}
          badge={
            <span className="source-pill" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
              🌤️ Clima
            </span>
          }
          onClick={() => setActiveTab('weather')}
        />

        {/* LINHA 2 - CARD 4: ALARMES */}
        <AppTile
          title="Alarmes"
          icon="⏰"
          status={activeAlarmsCount > 0 ? `${activeAlarmsCount} ativo(s) • Próximo 07:30` : 'Nenhum ativo'}
          temperatureHero={activeAlarmsCount}
          isMediaTile={true}
          mediaBgGradient="linear-gradient(135deg, #a16207 0%, #1c1917 100%)"
          accentColor="#ffd60a"
          badge={
            <span className="source-pill" style={{ background: 'rgba(250, 204, 21, 0.3)', color: '#faee9e' }}>
              ⏰ Alertas
            </span>
          }
          onClick={() => setActiveTab('alarms')}
        />

        {/* LINHA 2 - CARD 5: TIMERS */}
        <AppTile
          title="Timers"
          icon="⏱️"
          status={runningTimersCount > 0 ? `${runningTimersCount} em execução` : 'Nenhum rodando'}
          temperatureHero={runningTimersCount}
          isMediaTile={true}
          mediaBgGradient="linear-gradient(135deg, #7e22ce 0%, #0f172a 100%)"
          accentColor="#bf5af2"
          badge={
            <span className="source-pill" style={{ background: 'rgba(191, 90, 242, 0.3)', color: '#e9d5ff' }}>
              ⏱️ Timer
            </span>
          }
          onClick={() => setActiveTab('timers')}
        />

        {/* LINHA 2 - CARD 6: AGENDA */}
        <AppTile
          title="Agenda"
          icon="📅"
          status={`${mockCalendarEvents.length} compromissos hoje`}
          temperatureHero={mockCalendarEvents.length}
          isMediaTile={true}
          mediaBgGradient="linear-gradient(135deg, #c2410c 0%, #18181b 100%)"
          accentColor="#ff9500"
          badge={
            <span className="source-pill" style={{ background: 'rgba(249, 115, 22, 0.3)', color: '#ffedd5' }}>
              📅 Hoje
            </span>
          }
          onClick={() => setActiveTab('calendar')}
        />
      </main>

      {/* 3. Dock Inferior Fixo de Navegação Automotiva */}
      <AppDock
        activeTab={activeTab}
        isListening={isListening}
        onNavigate={(tab) => setActiveTab(tab as CarPlayTabType)}
        onToggleMic={handleToggleMic}
      />

      {/* =========================================================================
          PAINÉIS DE TELA CHEIA (FULLSCREEN OVERLAYS)
          ========================================================================= */}

      {/* PAINEL 1: ASSISTENTE DE VOZ */}
      <FullscreenPanel
        isOpen={activeTab === 'assistant'}
        onClose={() => setActiveTab('home')}
        title="Assistente JEX"
        icon="🎙️"
      >
        <MessageDisplay
          currentState={isApiLoading ? 'processing' : assistantState}
          transcript={transcript}
          interimTranscript={interimTranscript}
          lastTranscript={lastTranscript}
          speechErrorMessage={speechErrorMessage}
          technicalError={technicalError}
          isSpeechSupported={isSpeechSupported}
          diagnostics={diagnostics}
          onClearTranscript={clearTranscript}
          synthesisState={synthesisState}
          voices={voices}
          voicePreferences={voicePreferences}
          selectedVoice={selectedVoice}
          selectedVoiceName={selectedVoiceName}
          voiceDiagnostics={voiceDiagnostics}
          onRepeatSpeech={handleRepeatSpeech}
          onStopSpeech={stopSpeech}
          onTestVoice={testVoice}
          onUpdateVoicePreferences={updateVoicePreferences}
          onResetVoicePreferences={resetVoicePreferences}
          apiResponse={apiResponse}
          counters={apiCounters}
        />
      </FullscreenPanel>

      {/* PAINEL 2: PLAYER DE MÚSICA */}
      <FullscreenPanel
        isOpen={activeTab === 'music'}
        onClose={() => setActiveTab('home')}
        title="Player de Música"
        icon="🎵"
      >
        <NowPlayingCard player={musicPlayer} />
      </FullscreenPanel>

      {/* PAINEL 3: CLIMA */}
      <FullscreenPanel
        isOpen={activeTab === 'weather'}
        onClose={() => setActiveTab('home')}
        title="Previsão do Tempo"
        icon="🌤️"
      >
        <WeatherCard simulatedMetrics={mockWeatherData} />
      </FullscreenPanel>

      {/* PAINEL 4: TIMERS */}
      <FullscreenPanel
        isOpen={activeTab === 'timers'}
        onClose={() => setActiveTab('home')}
        title="Timers & Temporizadores"
        icon="⏱️"
      >
        <TimersCard initialTimers={timers} />
      </FullscreenPanel>

      {/* PAINEL 5: ALARMES */}
      <FullscreenPanel
        isOpen={activeTab === 'alarms'}
        onClose={() => setActiveTab('home')}
        title="Alarmes Agendados"
        icon="⏰"
      >
        <AlarmsCard initialAlarms={alarms} onToggleAlarm={toggleAlarm} onDeleteAlarm={deleteAlarm} />
      </FullscreenPanel>

      {/* PAINEL 6: AGENDA */}
      <FullscreenPanel
        isOpen={activeTab === 'calendar'}
        onClose={() => setActiveTab('home')}
        title="Agenda & Eventos"
        icon="📅"
      >
        <CalendarCard events={mockCalendarEvents} />
      </FullscreenPanel>

      {/* PAINEL 7: AJUSTES E DIAGNÓSTICOS DO SISTEMA */}
      <FullscreenPanel
        isOpen={activeTab === 'settings'}
        onClose={() => setActiveTab('home')}
        title="Ajustes & Sistema"
        icon="⚙️"
      >
        <SettingsPanel
          spotifyStatus={musicPlayer.spotifyStatus}
          onLoginSpotify={musicPlayer.loginSpotify}
          onLogoutSpotify={musicPlayer.logoutSpotifySession}
          voices={voices}
          voicePreferences={voicePreferences}
          selectedVoiceName={selectedVoiceName}
          voiceDiagnostics={voiceDiagnostics}
          onTestVoice={testVoice}
          onUpdateVoicePreferences={updateVoicePreferences}
          onResetVoicePreferences={resetVoicePreferences}
          apiCounters={apiCounters}
        />
      </FullscreenPanel>
    </div>
  );
};

export default App;
