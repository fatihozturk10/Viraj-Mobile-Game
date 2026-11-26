import React, { useCallback, useEffect, useRef, useState } from 'react';

interface IntroSplashVideoProps {
  engineReady: boolean;
  onPlaybackStarted?: () => void;
  onFadeStart?: () => void;
  onComplete: () => void;
}

// 1x1 pure-black PNG prevents Android WebView from showing its built-in grey play-icon default video poster
const BLACK_POSTER_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const IntroSplashVideo: React.FC<IntroSplashVideoProps> = ({
  engineReady,
  onPlaybackStarted,
  onFadeStart,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const playbackStartedRef = useRef(false);
  const waitingForEngineRef = useRef(false);
  const engineReadyRef = useRef(engineReady);
  engineReadyRef.current = engineReady;

  const [videoReady, setVideoReady] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [skipFallbackReady, setSkipFallbackReady] = useState(false);

  const notifyPlaybackStarted = useCallback(() => {
    if (playbackStartedRef.current) return;
    playbackStartedRef.current = true;
    onPlaybackStarted?.();
  }, [onPlaybackStarted]);

  const finishIntro = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    waitingForEngineRef.current = false;
    // Wake the pre-loaded 3D engine right as the curtain starts fading out
    onFadeStart?.();
    setFadingOut(true);
    const v = videoRef.current;
    if (v) {
      v.pause();
    }
    window.setTimeout(() => {
      onComplete();
    }, 360);
  }, [onComplete, onFadeStart]);

  const handleVideoEnded = useCallback(() => {
    if (engineReadyRef.current) {
      finishIntro();
    } else {
      waitingForEngineRef.current = true;
    }
  }, [finishIntro]);

  useEffect(() => {
    if (engineReady && waitingForEngineRef.current) {
      finishIntro();
    }
  }, [engineReady, finishIntro]);

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setShowSkip(true), 800);
    const skipFallbackTimer = window.setTimeout(
      () => setSkipFallbackReady(true),
      2600,
    );
    // Fallback trigger to begin background engine loading even if media playback event is delayed
    const bgInitFallbackTimer = window.setTimeout(
      () => notifyPlaybackStarted(),
      240,
    );
    // Safety guard so a stalled codec or slow WebView can never trap the user
    const safetyTimer = window.setTimeout(() => finishIntro(), 9500);

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (!videoRef.current || finishedRef.current) return;
          // Desktop browser autoplay policy fallback: play muted seamlessly
          videoRef.current.muted = true;
          void videoRef.current.play().catch(() => {
            notifyPlaybackStarted();
            handleVideoEnded();
          });
        });
      }
    }

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(skipFallbackTimer);
      window.clearTimeout(bgInitFallbackTimer);
      window.clearTimeout(safetyTimer);
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
    };
  }, [finishIntro, handleVideoEnded, notifyPlaybackStarted]);

  const canSkip = showSkip && !fadingOut && (engineReady || skipFallbackReady);

  return (
    <div
      role="presentation"
      onPointerDown={(e) => e.stopPropagation()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-350 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        poster={BLACK_POSTER_DATA_URI}
        playsInline
        preload="auto"
        onLoadedData={() => setVideoReady(true)}
        onPlaying={() => {
          setVideoReady(true);
          notifyPlaybackStarted();
        }}
        onEnded={handleVideoEnded}
        onError={() => {
          notifyPlaybackStarted();
          handleVideoEnded();
        }}
        className={`pointer-events-none h-full w-full select-none object-contain transition-opacity duration-150 ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {!engineReady && !fadingOut && (
        <div
          style={{
            bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            right: 'max(1.25rem, env(safe-area-inset-right))',
          }}
          className="pointer-events-none fixed flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 px-3.5 py-1.5 font-display text-[11px] font-semibold tracking-wider text-white/60"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          YÜKLENİYOR...
        </div>
      )}

      {canSkip && (
        <button
          type="button"
          onClick={finishIntro}
          style={{
            bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            right: 'max(1.25rem, env(safe-area-inset-right))',
          }}
          className="fixed rounded-full border border-white/15 bg-zinc-950/65 px-4 py-1.5 font-display text-xs font-semibold tracking-wider text-white/75 backdrop-blur-sm transition active:scale-95 hover:border-white/30 hover:text-white"
        >
          ATLA
        </button>
      )}
    </div>
  );
};
