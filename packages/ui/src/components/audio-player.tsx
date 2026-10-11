"use client";

import { useRef, useState, type ComponentProps } from "react";
import { cn } from "../utils";
import { MessageAsset } from "./message-assets";
import { clampVideoValue, formatVideoTime } from "./video-controls";

export function AudioPlaybackReference({
  className,
  ...props
}: ComponentProps<"div">): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-message-audio-reference", className)}
      aria-label="Audio message preview"
    >
      <MessageAsset name="variant1_imgPlayButton" />
      <span className="p-message-audio-waveform">
        <MessageAsset name="variant1_imgVector" />
      </span>
      <span>00:28</span>
    </div>
  );
}
export type AudioPlayerProps = Omit<ComponentProps<"audio">, "controls" | "src"> & {
  src: string;
  label: string;
  onPlaybackError?: (error: Error) => void;
};
export function AudioPlayer({
  src,
  label,
  className,
  onPlaybackError,
  onLoadedMetadata,
  onDurationChange,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onLoadStart,
  onError,
  ...props
}: AudioPlayerProps): React.ReactElement {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [error, setError] = useState("");
  const sync = (): void => {
    const media = audio.current;
    if (!media) return;
    setPlaying(!media.paused && !media.ended);
    const length = clampVideoValue(media.duration, Number.MAX_SAFE_INTEGER);
    setDuration(length);
    setTime(clampVideoValue(media.currentTime, length));
  };
  const fail = (failure: unknown): void => {
    const issue = failure instanceof Error ? failure : new Error("Audio could not be played.");
    setError(issue.message);
    onPlaybackError?.(issue);
  };
  return (
    <div className={cn("p-message-audio-player", className)} role="region" aria-label={label}>
      <audio
        {...props}
        ref={audio}
        src={src}
        preload={props.preload ?? "metadata"}
        onLoadStart={(event) => {
          setPlaying(false);
          setDuration(0);
          setTime(0);
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
        onError={(event) => {
          fail(new Error("This audio could not be loaded. Check the source and try again."));
          onError?.(event);
        }}
      />
      <button
        type="button"
        className="p-message-audio-toggle"
        aria-label={playing ? "Pause audio" : "Play audio"}
        onClick={() => {
          const media = audio.current;
          if (!media) return;
          setError("");
          if (media.paused) {
            if (media.ended) media.currentTime = 0;
            void media.play().catch(fail);
          } else media.pause();
        }}
      >
        {playing ? (
          <span aria-hidden="true">Ⅱ</span>
        ) : (
          <MessageAsset name="variant1_imgPlayButton" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.01}
        value={time}
        disabled={!duration}
        aria-label="Seek audio"
        aria-valuetext={`${formatVideoTime(time)} of ${formatVideoTime(duration)}`}
        onChange={(event) => {
          if (audio.current && duration) {
            audio.current.currentTime = clampVideoValue(
              event.currentTarget.valueAsNumber,
              duration
            );
            sync();
          }
        }}
      />
      <time>
        {formatVideoTime(time)} / {formatVideoTime(duration)}
      </time>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
