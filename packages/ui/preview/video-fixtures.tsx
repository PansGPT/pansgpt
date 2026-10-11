import { useEffect, useState } from "react";
import {
  VideoActionButton,
  VideoActionsBar,
  VideoActionTooltip,
  VideoOverlayAction,
  VideoPlayer,
  VideoPlayerSurface,
  VideoTimestampIndicator,
  VideoVolumeHandleReference,
  VideoVolumeSlider,
  videoActionTypes,
  type VideoActionType,
  type VideoSize,
} from "../src";
import { VideoAsset, videoAssetUrl } from "../src/components/video-assets";
import { videoSources, videoSourceTooltipWidths } from "./video-source-data";

const sourceToAction: Record<string, VideoActionType> = {
  Play: "play",
  Pause: "pause",
  "Fast backward": "fast-backward",
  "Fast forward": "fast-forward",
  "Skip backward": "skip-backward",
  "Skip forward": "skip-forward",
  "Volume none": "volume-none",
  "Volume min": "volume-min",
  "Volume max": "volume-max",
  "Video minus": "video-minus",
  "Video plus": "video-plus",
  AirPlay: "airplay",
  "Minimize 01": "minimize01",
  "Maximize 01": "maximize01",
  "Maximize 02": "maximize02",
  "Minimize 02": "minimize02",
  "Playback speed": "playback-speed",
  "Subtitles/CC": "captions",
};
const captionSource =
  "data:text/vtt;charset=utf-8,WEBVTT%0A%0A00%3A00.000%20--%3E%2000%3A30.000%0ALocal%20media%20caption%0A";
export function VideoFixtures(): React.ReactElement {
  const [selection, setSelection] = useState("");
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [src, setSrc] = useState("");
  const [time, setTime] = useState(0);
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src]
  );
  const action =
    (name: string): (() => void) =>
    () =>
      setSelection(name);
  const barProps = {
    volume: 0.75,
    reference: true,
    canAirPlay: true,
    onTogglePlay: action("Toggle playback"),
    onVolumeChange: setVolume,
    onMuteChange: setMuted,
    onSpeedChange: action("Change speed"),
    onFullscreen: action("Fullscreen"),
    onAirPlay: action("AirPlay"),
  };
  return (
    <section className="preview-section">
      <h2>Six native video-player layouts</h2>
      <div className="video-source-scroll">
        <div className="video-player-source-grid">
          {videoSources[4].variants.map((source) => {
            const size = source.name.match(/Size=(\w+)/)?.[1] as VideoSize;
            const playing = source.name.includes("Playing=True");
            const timestamp =
              playing && size !== "sm" ? (
                <VideoTimestampIndicator
                  className="p-video-reference-timestamp"
                  currentTime={408}
                  duration={504}
                  preview={videoAssetUrl("timestamp_imgVideoPreview169")}
                  width={size === "lg" ? 160 : 128}
                  cursor
                />
              ) : undefined;
            return (
              <VideoPlayerSurface
                key={source.id}
                data-video-source-id={source.id}
                size={size}
                label={`${size} ${playing ? "playing" : "paused"} source layout`}
              >
                <VideoAsset className="p-video-poster" name="playerPoster" />
                {!playing && (
                  <VideoOverlayAction small={size === "sm"} onClick={action("Overlay play")} />
                )}
                <VideoActionsBar
                  {...barProps}
                  size={size}
                  playing={playing}
                  currentTime={playing ? 128 : 0}
                  duration={504}
                  buffered={
                    playing ? (size === "lg" ? 0.6752 : 0.5949) : size === "lg" ? 0.1783 : 0.1519
                  }
                  referenceTimestamp={timestamp}
                />
              </VideoPlayerSurface>
            );
          })}
        </div>
      </div>
      <h2>Six standalone action bars</h2>
      <div className="video-source-scroll">
        <div className="video-bars-source-grid">
          {videoSources[3].variants.map((source) => {
            const size = source.name.match(/Size=(\w+)/)?.[1] as VideoSize;
            const playing = source.name.includes("Playing=True");
            return (
              <VideoActionsBar
                {...barProps}
                key={source.id}
                data-video-source-id={source.id}
                size={size}
                playing={playing}
                currentTime={playing ? 128 : 0}
                duration={504}
                buffered={
                  playing ? (size === "lg" ? 0.6752 : 0.5949) : size === "lg" ? 0.1783 : 0.1519
                }
                referenceTimestamp={
                  size !== "sm" && playing ? (
                    <VideoTimestampIndicator
                      className="p-video-reference-timestamp"
                      currentTime={408}
                      duration={504}
                      preview={videoAssetUrl("timestamp_imgVideoPreview169")}
                      width={size === "lg" ? 160 : 128}
                      cursor
                    />
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>
      <h2>All thirty-six action states</h2>
      <div className="video-source-scroll">
        <div className="video-action-source-grid">
          {videoSources[2].variants.map((source) => (
            <VideoActionButton
              key={source.id}
              data-video-source-id={source.id}
              action={sourceToAction[source.name.match(/Type=([^,]+)/)?.[1] ?? "Play"] ?? "play"}
              referenceState={source.name.endsWith("Hover") ? "hover" : "default"}
              referenceTooltipOffset={"tooltipX" in source ? source.tooltipX : undefined}
              referenceTooltipWidth={videoSourceTooltipWidths[source.id]}
              onClick={action(source.name)}
            />
          ))}
        </div>
      </div>
      <h2>Volume handles, slider states, overlays and tooltips</h2>
      <div className="video-primitive-source-grid">
        {videoSources[0].variants.map((source) => (
          <VideoVolumeHandleReference
            key={source.id}
            data-video-source-id={source.id}
            value={Number(source.name.match(/\d+/)?.[0]) / 100}
          />
        ))}
        {videoSources[1].variants.map((source) => (
          <VideoVolumeSlider
            key={source.id}
            data-video-source-id={source.id}
            reference
            value={0.75}
            referenceState={source.name.endsWith("Hover") ? "hover" : "default"}
            onMuteChange={setMuted}
          />
        ))}
        {videoSources[6].variants.map((source) => (
          <VideoOverlayAction
            key={source.id}
            data-video-source-id={source.id}
            playing={source.name.startsWith("Paused=True")}
            referenceState={source.name.endsWith("Hover") ? "hover" : "default"}
            onClick={action(source.name)}
          />
        ))}
        {videoSources[7].variants.map((source) => (
          <VideoActionTooltip
            key={source.id}
            data-video-source-id={source.id}
            style={{ width: source.width }}
            shortcut={source.name.endsWith("True") ? "Space" : undefined}
          >
            Play
          </VideoActionTooltip>
        ))}
        <VideoTimestampIndicator
          data-video-source-id="9264:578567"
          currentTime={408}
          duration={504}
          preview={videoAssetUrl("timestamp_imgVideoPreview169")}
          cursor
        />
      </div>
      <h2>Live native media</h2>
      <p>
        Select a local video to exercise playback, seeking, volume, captions, speed and fullscreen.
      </p>
      <input
        aria-label="Choose local video"
        type="file"
        accept="video/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setSrc(URL.createObjectURL(file));
        }}
      />
      {src && (
        <VideoPlayer
          src={src}
          label="Local video player"
          size="lg"
          poster={videoAssetUrl("playerPoster")}
          tracks={[{ src: captionSource, label: "English", srcLang: "en", kind: "captions" }]}
          onPlaybackStateChange={(state) => setTime(state.currentTime)}
          renderPreview={(previewTime) => (
            <VideoTimestampIndicator currentTime={previewTime} duration={time} />
          )}
        />
      )}
      <output data-testid="video-current-time">{time.toFixed(1)}</output>
      <h2>Live controls</h2>
      <div className="video-live-controls">
        <VideoVolumeSlider
          value={volume}
          muted={muted}
          onValueChange={setVolume}
          onMuteChange={setMuted}
        />
        {videoActionTypes.map((type) => (
          <VideoActionButton key={type} action={type} onClick={action(type)} />
        ))}
      </div>
      <output data-testid="video-selection">{selection}</output>
    </section>
  );
}
