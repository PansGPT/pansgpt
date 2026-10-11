"use client";

import { Slider as Range, Tooltip as Tip } from "radix-ui";
import { type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "../utils";
import { VideoAsset, type VideoAssetName } from "./video-assets";

export const videoActionTypes = [
  "play",
  "pause",
  "fast-backward",
  "fast-forward",
  "skip-backward",
  "skip-forward",
  "volume-none",
  "volume-min",
  "volume-max",
  "video-minus",
  "video-plus",
  "airplay",
  "minimize01",
  "maximize01",
  "maximize02",
  "minimize02",
  "playback-speed",
  "captions",
] as const;
export type VideoActionType = (typeof videoActionTypes)[number];
const actionInfo: Record<
  VideoActionType,
  { label: string; shortcut: string; asset?: VideoAssetName }
> = {
  play: { label: "Play", shortcut: "Space", asset: "action_button_imgPlay" },
  pause: { label: "Pause", shortcut: "Space", asset: "action_button_imgPause" },
  "fast-backward": { label: "Rewind", shortcut: "Shift+R", asset: "action_button_imgFastBackward" },
  "fast-forward": { label: "Forward", shortcut: "Shift+F", asset: "action_button_imgFastForward" },
  "skip-backward": { label: "Previous", shortcut: "Shift+P", asset: "action_button_imgSkipBack" },
  "skip-forward": { label: "Next", shortcut: "Shift+N", asset: "action_button_imgSkipForward" },
  "volume-none": { label: "Unmute", shortcut: "M", asset: "action_button_imgVolumeX" },
  "volume-min": { label: "Mute", shortcut: "M", asset: "action_button_imgVolumeMin" },
  "volume-max": { label: "Mute", shortcut: "M", asset: "action_button_imgVolumeMax" },
  "video-minus": { label: "Volume down", shortcut: "↓", asset: "action_button_imgVolumeMinus" },
  "video-plus": { label: "Volume up", shortcut: "↑", asset: "action_button_imgVolumePlus" },
  airplay: { label: "AirPlay", shortcut: "A", asset: "action_button_imgAirplay" },
  minimize01: { label: "Minimize", shortcut: "esc", asset: "action_button_imgMinimize01" },
  maximize01: { label: "Fullscreen", shortcut: "F", asset: "action_button_imgMaximize01" },
  maximize02: { label: "Fullscreen", shortcut: "F", asset: "action_button_imgMaximize02" },
  minimize02: { label: "Minimize", shortcut: "esc", asset: "action_button_imgMinimize02" },
  "playback-speed": { label: "Playback speed", shortcut: "← →" },
  captions: { label: "Subtitles/CC", shortcut: "C" },
};
export function VideoActionTooltip({
  children,
  shortcut,
  className,
  ...props
}: ComponentProps<"span"> & { shortcut?: ReactNode }): React.ReactElement {
  return (
    <span {...props} className={cn("p-video-tooltip", className)} data-badge={Boolean(shortcut)}>
      <span>{children}</span>
      {shortcut && <span className="p-video-tooltip-key">{shortcut}</span>}
    </span>
  );
}
export type VideoActionButtonProps = ComponentProps<"button"> & {
  action: VideoActionType;
  speed?: number;
  tooltip?: boolean;
  referenceState?: "default" | "hover";
  referenceTooltipOffset?: number;
  referenceTooltipWidth?: number;
};
export function VideoActionButton({
  action,
  speed = 1,
  tooltip = true,
  referenceState,
  referenceTooltipOffset,
  referenceTooltipWidth,
  className,
  "aria-label": label,
  ...props
}: VideoActionButtonProps): React.ReactElement {
  const info = actionInfo[action];
  const button = (
    <button
      {...props}
      type="button"
      className={cn("p-video-action", className)}
      data-video-action={action}
      data-reference-state={referenceState}
      aria-label={label ?? info.label}
    >
      {info.asset ? (
        <VideoAsset name={info.asset} />
      ) : action === "captions" ? (
        <span>CC</span>
      ) : (
        <>
          <span>{speed}</span>
          <VideoAsset name="action_button_imgPlaybackX" />
        </>
      )}
    </button>
  );
  if (referenceState)
    return (
      <span className="p-video-action-reference">
        {button}
        {referenceState === "hover" && (
          <VideoActionTooltip
            className="p-video-reference-tooltip"
            style={{
              width: referenceTooltipWidth,
              ...(referenceTooltipOffset === undefined
                ? {}
                : { left: referenceTooltipOffset, transform: "none" }),
            }}
            shortcut={info.shortcut}
          >
            {info.label}
          </VideoActionTooltip>
        )}
      </span>
    );
  if (!tooltip) return button;
  return (
    <Tip.Provider delayDuration={300}>
      <Tip.Root>
        <Tip.Trigger asChild>{button}</Tip.Trigger>
        <Tip.Portal>
          <Tip.Content
            side="top"
            sideOffset={8}
            collisionPadding={8}
            className="p-video-tooltip-positioner"
          >
            <VideoActionTooltip shortcut={info.shortcut}>{label ?? info.label}</VideoActionTooltip>
          </Tip.Content>
        </Tip.Portal>
      </Tip.Root>
    </Tip.Provider>
  );
}
export function clampVideoValue(value: number, max = 1): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
}
export function formatVideoTime(seconds: number): string {
  const time = Math.floor(clampVideoValue(seconds, Number.MAX_SAFE_INTEGER));
  const hours = Math.floor(time / 3600);
  return `${hours ? `${hours}:` : ""}${String(Math.floor(time / 60) % 60).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
}
export function VideoVolumeHandleReference({
  value = 0.75,
  className,
  style,
  ...props
}: ComponentProps<"span"> & { value?: number }): React.ReactElement {
  return (
    <span
      {...props}
      className={cn("p-video-volume-reference", className)}
      aria-hidden="true"
      style={
        {
          ...style,
          "--video-volume-fill": `${12 + 32 * clampVideoValue(value)}px`,
        } as CSSProperties
      }
    >
      <span>
        <span />
      </span>
    </span>
  );
}
export type VideoVolumeSliderProps = ComponentProps<"div"> & {
  value: number;
  muted?: boolean;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  onMuteChange?: (muted: boolean) => void;
  referenceState?: "default" | "hover";
  reference?: boolean;
};
export function VideoVolumeSlider({
  value,
  muted = false,
  disabled = false,
  onValueChange,
  onMuteChange,
  referenceState,
  reference = false,
  className,
  ...props
}: VideoVolumeSliderProps): React.ReactElement {
  const volume = muted ? 0 : clampVideoValue(value);
  return (
    <div
      {...props}
      className={cn("p-video-volume", className)}
      data-reference-state={referenceState}
    >
      <VideoActionButton
        action={volume === 0 ? "volume-none" : volume < 0.5 ? "volume-min" : "volume-max"}
        disabled={disabled || !onMuteChange}
        onClick={() => onMuteChange?.(!(muted || volume === 0))}
      />
      {reference ? (
        <VideoVolumeHandleReference value={value} />
      ) : (
        <Range.Root
          className="p-video-volume-range"
          value={[volume]}
          max={1}
          step={0.01}
          disabled={disabled || !onValueChange}
          onValueChange={(values) => onValueChange?.(values[0] ?? 0)}
        >
          <Range.Track className="p-video-volume-track">
            <span className="p-video-volume-fill" style={{ width: `${12 + 32 * volume}px` }} />
          </Range.Track>
          <Range.Thumb
            className="p-video-volume-thumb"
            aria-label="Volume"
            aria-valuetext={`${Math.round(volume * 100)}%`}
          />
        </Range.Root>
      )}
    </div>
  );
}
export function VideoOverlayAction({
  playing = false,
  small = false,
  referenceState,
  className,
  ...props
}: ComponentProps<"button"> & {
  playing?: boolean;
  small?: boolean;
  referenceState?: "default" | "hover";
}): React.ReactElement {
  return (
    <button
      {...props}
      type="button"
      className={cn("p-video-overlay-action", className)}
      data-small={small}
      data-reference-state={referenceState}
      aria-label={props["aria-label"] ?? (playing ? "Pause" : "Play")}
    >
      <span className="p-video-overlay-circle">
        <VideoAsset name={playing ? "overlay_imgPause" : "overlay_imgPlay"} />
        {referenceState === "hover" && (
          <VideoAsset className="p-video-overlay-cursor" name="overlay_imgCursor" />
        )}
      </span>
    </button>
  );
}
export function VideoTimestampIndicator({
  currentTime,
  duration,
  preview,
  width = 128,
  cursor = false,
  className,
  style,
  ...props
}: ComponentProps<"div"> & {
  currentTime: number;
  duration: number;
  preview?: string;
  width?: 128 | 160;
  cursor?: boolean;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-video-timestamp", className)} style={{ ...style, width }}>
      {preview && (
        <div className="p-video-preview-wrapper">
          <img src={preview} alt="" />
        </div>
      )}
      <div className="p-video-timestamp-times">
        <span>{formatVideoTime(currentTime)}</span>
        <VideoAsset name="timestamp_imgDivider" />
        <span>{formatVideoTime(duration)}</span>
      </div>
      <div className="p-video-timestamp-line">
        <VideoAsset name="timestamp_imgIndicatorLine" />
        {cursor && <VideoAsset className="p-video-timestamp-cursor" name="timestamp_imgCursor" />}
      </div>
    </div>
  );
}

export type VideoSize = "sm" | "md" | "lg";
export type VideoActionsBarProps = Omit<ComponentProps<"div">, "onVolumeChange"> & {
  size?: VideoSize;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume?: number;
  muted?: boolean;
  buffered?: number;
  speed?: number;
  fullscreen?: boolean;
  captions?: boolean;
  canFullscreen?: boolean;
  canCaptions?: boolean;
  canAirPlay?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMuteChange?: (muted: boolean) => void;
  onSpeedChange?: () => void;
  onFullscreen?: () => void;
  onCaptions?: () => void;
  onAirPlay?: () => void;
  referenceTimestamp?: ReactNode;
  reference?: boolean;
  renderPreview?: (time: number) => ReactNode;
};
export function VideoActionsBar({
  size = "sm",
  playing,
  currentTime,
  duration,
  volume = 0.75,
  muted = false,
  buffered = 0,
  speed = 1,
  fullscreen = false,
  captions = false,
  canFullscreen = true,
  canCaptions = false,
  canAirPlay = false,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onMuteChange,
  onSpeedChange,
  onFullscreen,
  onCaptions,
  onAirPlay,
  referenceTimestamp,
  reference = false,
  renderPreview,
  className,
  ...props
}: VideoActionsBarProps): React.ReactElement {
  const safeDuration = clampVideoValue(duration, Number.MAX_SAFE_INTEGER);
  const time = clampVideoValue(currentTime, safeDuration);
  const ratio = safeDuration ? time / safeDuration : 0;
  const previewTime = time;
  return (
    <div
      {...props}
      className={cn("p-video-actions-bar", className)}
      data-size={size}
      data-reference={reference}
    >
      <div className="p-video-actions-content">
        <VideoActionButton
          action={playing ? "pause" : "play"}
          onClick={onTogglePlay}
          disabled={!onTogglePlay}
        />
        <div className="p-video-volume-lg">
          <VideoVolumeSlider
            value={volume}
            muted={muted}
            onValueChange={onVolumeChange}
            onMuteChange={onMuteChange}
            reference={reference}
          />
        </div>
        <div className="p-video-volume-compact">
          <VideoActionButton
            action={
              muted || volume === 0 ? "volume-none" : volume < 0.5 ? "volume-min" : "volume-max"
            }
            onClick={() => onMuteChange?.(!(muted || volume === 0))}
            disabled={!onMuteChange}
          />
        </div>
        <div className="p-video-progress">
          <span className="p-video-elapsed">{formatVideoTime(time)}</span>
          <div className="p-video-seek-wrapper">
            {reference ? (
              <span className="p-video-seek-track" data-reference="true">
                <span
                  className="p-video-buffer"
                  style={{ width: `${clampVideoValue(buffered) * 100}%` }}
                />
                <span
                  className="p-video-seek-fill"
                  style={{ width: time === 0 ? 8 : `${ratio * 100}%` }}
                />
              </span>
            ) : (
              <Range.Root
                className="p-video-seek"
                value={[time]}
                max={safeDuration || 1}
                step={0.1}
                disabled={!onSeek || safeDuration === 0}
                onValueChange={(values) => onSeek?.(values[0] ?? 0)}
              >
                <Range.Track className="p-video-seek-track">
                  <span
                    className="p-video-buffer"
                    style={{ width: `${clampVideoValue(buffered) * 100}%` }}
                  />
                  <Range.Range className="p-video-seek-fill" />
                </Range.Track>
                <Range.Thumb
                  className="p-video-seek-thumb"
                  aria-label="Playback position"
                  aria-valuetext={`${formatVideoTime(time)} of ${formatVideoTime(safeDuration)}`}
                />
              </Range.Root>
            )}
            {renderPreview && (
              <div className="p-video-live-preview">{renderPreview(previewTime)}</div>
            )}
          </div>
          <span className="p-video-remaining">-{formatVideoTime(safeDuration - time)}</span>
          {referenceTimestamp}
        </div>
        <div className="p-video-advanced">
          <VideoActionButton
            action="playback-speed"
            speed={speed}
            onClick={onSpeedChange}
            disabled={!onSpeedChange}
          />
          {canCaptions && (
            <VideoActionButton
              action="captions"
              aria-pressed={captions}
              onClick={onCaptions}
              disabled={!onCaptions}
            />
          )}
          {canAirPlay && (
            <VideoActionButton action="airplay" onClick={onAirPlay} disabled={!onAirPlay} />
          )}
        </div>
        <VideoActionButton
          action={fullscreen ? "minimize01" : "maximize01"}
          onClick={onFullscreen}
          disabled={!canFullscreen || !onFullscreen}
        />
      </div>
    </div>
  );
}
