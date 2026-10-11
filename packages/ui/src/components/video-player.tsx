"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "../utils";
import {
  clampVideoValue,
  VideoActionsBar,
  VideoOverlayAction,
  type VideoSize,
} from "./video-controls";

export function VideoPlayerSurface({
  size = "sm",
  responsive = false,
  label,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  size?: VideoSize;
  responsive?: boolean;
  label: string;
}): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-video-surface", className)}
      data-size={size}
      data-responsive={responsive}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  );
}
export type VideoTrack = Omit<ComponentProps<"track">, "children"> & {
  src: string;
  label: string;
  srcLang: string;
};
export type VideoPlayerProps = Omit<
  ComponentProps<"video">,
  "children" | "controls" | "src" | "onError"
> & {
  src: string;
  label: string;
  size?: VideoSize;
  tracks?: readonly VideoTrack[];
  actionsBar?: boolean;
  overlayAction?: boolean;
  surfaceClassName?: string;
  renderPreview?: (time: number) => ReactNode;
  onPlaybackError?: (error: Error) => void;
  onPlaybackStateChange?: (state: {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    playbackRate: number;
  }) => void;
};
const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
interface AirPlayVideo extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker?: () => void;
}
export function VideoPlayer({
  src,
  label,
  size = "lg",
  tracks = [],
  actionsBar = true,
  overlayAction = true,
  surfaceClassName,
  renderPreview,
  onPlaybackError,
  onPlaybackStateChange,
  onLoadStart,
  onLoadedMetadata,
  onDurationChange,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onVolumeChange,
  onProgress,
  onRateChange,
  poster,
  className,
  ...props
}: VideoPlayerProps): React.ReactElement {
  const video = useRef<HTMLVideoElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(Boolean(props.muted));
  const [speed, setSpeed] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [canAirPlay, setCanAirPlay] = useState(false);
  const [error, setError] = useState("");
  const reportError = useCallback(
    (failure: unknown) => {
      const issue = failure instanceof Error ? failure : new Error("Unable to play this video.");
      setError(issue.message);
      onPlaybackError?.(issue);
    },
    [onPlaybackError]
  );
  const sync = useCallback(() => {
    const media = video.current;
    if (!media) return;
    const mediaDuration = clampVideoValue(media.duration, Number.MAX_SAFE_INTEGER);
    setPlaying(!media.paused && !media.ended);
    setCurrentTime(clampVideoValue(media.currentTime, mediaDuration));
    setDuration(mediaDuration);
    setVolume(media.volume);
    setMuted(media.muted);
    setSpeed(media.playbackRate);
    setCaptions(Array.from(media.textTracks).some((track) => track.mode === "showing"));
    onPlaybackStateChange?.({
      playing: !media.paused && !media.ended,
      currentTime: media.currentTime,
      duration: mediaDuration,
      volume: media.volume,
      muted: media.muted,
      playbackRate: media.playbackRate,
    });
  }, [onPlaybackStateChange]);
  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled && surface.current?.requestFullscreen));
    setCanAirPlay(
      typeof (video.current as AirPlayVideo | null)?.webkitShowPlaybackTargetPicker === "function"
    );
    const changed = (): void => setFullscreen(document.fullscreenElement === surface.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  const togglePlay = useCallback(() => {
    const media = video.current;
    if (!media) return;
    setError("");
    if (media.paused) {
      if (media.ended) media.currentTime = 0;
      void media.play().catch(reportError);
    } else media.pause();
  }, [reportError]);
  const seek = useCallback(
    (time: number) => {
      const media = video.current;
      if (!media || !Number.isFinite(media.duration)) return;
      media.currentTime = clampVideoValue(time, media.duration);
      sync();
    },
    [sync]
  );
  const changeVolume = useCallback(
    (value: number) => {
      const media = video.current;
      if (!media) return;
      media.volume = clampVideoValue(value);
      if (media.volume > 0) media.muted = false;
      sync();
    },
    [sync]
  );
  const changeMute = useCallback(
    (value: boolean) => {
      const media = video.current;
      if (!media) return;
      media.muted = value;
      if (!value && media.volume === 0) media.volume = 1;
      sync();
    },
    [sync]
  );
  const changeSpeed = useCallback(() => {
    const media = video.current;
    if (!media) return;
    const index = playbackRates.findIndex((rate) => rate >= media.playbackRate);
    media.playbackRate = playbackRates[(index + 1) % playbackRates.length] ?? 1;
    sync();
  }, [sync]);
  const toggleFullscreen = useCallback(() => {
    const wrapper = surface.current;
    if (!wrapper) return;
    if (document.fullscreenElement === wrapper) void document.exitFullscreen().catch(reportError);
    else if (document.fullscreenEnabled) void wrapper.requestFullscreen().catch(reportError);
  }, [reportError]);
  const toggleCaptions = useCallback(() => {
    const media = video.current;
    if (!media) return;
    const available = Array.from(media.textTracks).filter(
      (track) => track.kind === "captions" || track.kind === "subtitles"
    );
    const active = available.some((track) => track.mode === "showing");
    for (const [index, track] of available.entries())
      track.mode = !active && index === 0 ? "showing" : "disabled";
    sync();
  }, [sync]);
  return (
    <VideoPlayerSurface
      ref={surface}
      label={label}
      size={size}
      responsive
      tabIndex={0}
      className={surfaceClassName}
      onKeyDown={(event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          !(event.target instanceof Element) ||
          event.target.closest("button,input,select,textarea,[role=slider]")
        )
          return;
        if (event.key === " " || event.key.toLowerCase() === "k") {
          event.preventDefault();
          togglePlay();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          seek((video.current?.currentTime ?? 0) + (event.key === "ArrowRight" ? 10 : -10));
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          changeVolume((video.current?.volume ?? 1) + (event.key === "ArrowUp" ? 0.05 : -0.05));
        } else if (event.key.toLowerCase() === "m") {
          event.preventDefault();
          changeMute(!(video.current?.muted || video.current?.volume === 0));
        } else if (event.key.toLowerCase() === "f" && canFullscreen) {
          event.preventDefault();
          toggleFullscreen();
        } else if (
          event.key.toLowerCase() === "c" &&
          tracks.some((track) => track.kind === "captions" || track.kind === "subtitles")
        ) {
          event.preventDefault();
          toggleCaptions();
        }
      }}
    >
      <video
        {...props}
        src={src}
        poster={poster}
        ref={video}
        className={className}
        playsInline={props.playsInline ?? true}
        preload={props.preload ?? "metadata"}
        onLoadStart={(event) => {
          setPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          setBuffered(0);
          setError("");
          onLoadStart?.(event);
        }}
        onLoadedMetadata={(event) => {
          sync();
          onLoadedMetadata?.(event);
        }}
        onDurationChange={(event) => {
          sync();
          onDurationChange?.(event);
        }}
        onTimeUpdate={(event) => {
          sync();
          onTimeUpdate?.(event);
        }}
        onPlay={(event) => {
          sync();
          onPlay?.(event);
        }}
        onPause={(event) => {
          sync();
          onPause?.(event);
        }}
        onEnded={(event) => {
          sync();
          onEnded?.(event);
        }}
        onVolumeChange={(event) => {
          sync();
          onVolumeChange?.(event);
        }}
        onRateChange={(event) => {
          sync();
          onRateChange?.(event);
        }}
        onProgress={(event) => {
          const media = event.currentTarget;
          const end = media.buffered.length ? media.buffered.end(media.buffered.length - 1) : 0;
          setBuffered(media.duration > 0 ? clampVideoValue(end / media.duration) : 0);
          onProgress?.(event);
        }}
        onError={() =>
          reportError(new Error("This video could not be loaded. Check the source and try again."))
        }
      >
        {tracks.map((track) => (
          <track {...track} key={`${track.src}-${track.srcLang}-${track.kind}`} />
        ))}
      </video>
      {!playing && overlayAction && !error && (
        <VideoOverlayAction small={size === "sm"} onClick={togglePlay} />
      )}
      {actionsBar && (
        <VideoActionsBar
          size={size}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          buffered={buffered}
          speed={speed}
          fullscreen={fullscreen}
          captions={captions}
          canFullscreen={canFullscreen}
          canCaptions={tracks.some(
            (track) => track.kind === "captions" || track.kind === "subtitles"
          )}
          canAirPlay={canAirPlay}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onVolumeChange={changeVolume}
          onMuteChange={changeMute}
          onSpeedChange={changeSpeed}
          onFullscreen={toggleFullscreen}
          onCaptions={toggleCaptions}
          onAirPlay={() => {
            try {
              (video.current as AirPlayVideo | null)?.webkitShowPlaybackTargetPicker?.();
            } catch (failure) {
              reportError(failure);
            }
          }}
          renderPreview={renderPreview}
        />
      )}
      {error && (
        <div className="p-video-error" role="alert">
          {error}
        </div>
      )}
    </VideoPlayerSurface>
  );
}
