import { useState, useEffect, useCallback } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  isSupported: boolean;
  toggleFullscreen: () => Promise<void>;
}

export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    // Check if fullscreen API is available in browser
    const supported = Boolean(
      document.fullscreenEnabled ||
        (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
    );
    setIsSupported(supported);

    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(Boolean(fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!isSupported) return;

    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Erro ao alternar modo tela cheia:', err);
    }
  }, [isSupported]);

  return {
    isFullscreen,
    isSupported,
    toggleFullscreen,
  };
}
