import type { ComponentProps } from "react";
import action_button_imgAirplay from "../../assets/video-action_button_imgAirplay.svg";
import action_button_imgFastBackward from "../../assets/video-action_button_imgFastBackward.svg";
import action_button_imgFastForward from "../../assets/video-action_button_imgFastForward.svg";
import action_button_imgMaximize01 from "../../assets/video-action_button_imgMaximize01.svg";
import action_button_imgMaximize02 from "../../assets/video-action_button_imgMaximize02.svg";
import action_button_imgMinimize01 from "../../assets/video-action_button_imgMinimize01.svg";
import action_button_imgMinimize02 from "../../assets/video-action_button_imgMinimize02.svg";
import action_button_imgPause from "../../assets/video-action_button_imgPause.svg";
import action_button_imgPlay from "../../assets/video-action_button_imgPlay.svg";
import action_button_imgPlaybackX from "../../assets/video-action_button_imgPlaybackX.svg";
import action_button_imgSkipBack from "../../assets/video-action_button_imgSkipBack.svg";
import action_button_imgSkipForward from "../../assets/video-action_button_imgSkipForward.svg";
import action_button_imgVolumeMax from "../../assets/video-action_button_imgVolumeMax.svg";
import action_button_imgVolumeMin from "../../assets/video-action_button_imgVolumeMin.svg";
import action_button_imgVolumeMinus from "../../assets/video-action_button_imgVolumeMinus.svg";
import action_button_imgVolumePlus from "../../assets/video-action_button_imgVolumePlus.svg";
import action_button_imgVolumeX from "../../assets/video-action_button_imgVolumeX.svg";
import overlay_imgCursor from "../../assets/video-overlay_imgCursor.svg";
import overlay_imgPause from "../../assets/video-overlay_imgPause.svg";
import overlay_imgPlay from "../../assets/video-overlay_imgPlay.svg";
import playerPoster from "../../assets/video-playerPoster.png";
import timestamp_imgCursor from "../../assets/video-timestamp_imgCursor.svg";
import timestamp_imgDivider from "../../assets/video-timestamp_imgDivider.svg";
import timestamp_imgIndicatorLine from "../../assets/video-timestamp_imgIndicatorLine.svg";
import timestamp_imgVideoPreview169 from "../../assets/video-timestamp_imgVideoPreview169.png";
const assets = {
  action_button_imgAirplay,
  action_button_imgFastBackward,
  action_button_imgFastForward,
  action_button_imgMaximize01,
  action_button_imgMaximize02,
  action_button_imgMinimize01,
  action_button_imgMinimize02,
  action_button_imgPause,
  action_button_imgPlay,
  action_button_imgPlaybackX,
  action_button_imgSkipBack,
  action_button_imgSkipForward,
  action_button_imgVolumeMax,
  action_button_imgVolumeMin,
  action_button_imgVolumeMinus,
  action_button_imgVolumePlus,
  action_button_imgVolumeX,
  overlay_imgCursor,
  overlay_imgPause,
  overlay_imgPlay,
  playerPoster,
  timestamp_imgCursor,
  timestamp_imgDivider,
  timestamp_imgIndicatorLine,
  timestamp_imgVideoPreview169,
};
export type VideoAssetName = keyof typeof assets;
export function videoAssetUrl(name: VideoAssetName): string {
  const asset = assets[name];
  return typeof asset === "string" ? asset : asset.src;
}
const dimensions: Partial<Record<VideoAssetName, { width: number; height: number }>> = {
  action_button_imgAirplay: { width: 16, height: 16 },
  action_button_imgFastBackward: { width: 16, height: 16 },
  action_button_imgFastForward: { width: 16, height: 16 },
  action_button_imgMaximize01: { width: 16, height: 16 },
  action_button_imgMaximize02: { width: 16, height: 16 },
  action_button_imgMinimize01: { width: 16, height: 16 },
  action_button_imgMinimize02: { width: 16, height: 16 },
  action_button_imgPause: { width: 16, height: 16 },
  action_button_imgPlay: { width: 16, height: 16 },
  action_button_imgPlaybackX: { width: 8, height: 8 },
  action_button_imgSkipBack: { width: 16, height: 16 },
  action_button_imgSkipForward: { width: 16, height: 16 },
  action_button_imgVolumeMax: { width: 16, height: 16 },
  action_button_imgVolumeMin: { width: 16, height: 16 },
  action_button_imgVolumeMinus: { width: 16, height: 16 },
  action_button_imgVolumePlus: { width: 16, height: 16 },
  action_button_imgVolumeX: { width: 16, height: 16 },
  overlay_imgCursor: { width: 20.1217, height: 21.1205 },
  overlay_imgPause: { width: 20, height: 20 },
  overlay_imgPlay: { width: 20, height: 20 },
  timestamp_imgCursor: { width: 20, height: 20 },
  timestamp_imgDivider: { width: 1, height: 13 },
  timestamp_imgIndicatorLine: { width: 1, height: 33 },
};
export function VideoAsset({
  name,
  ...props
}: Omit<ComponentProps<"img">, "src" | "alt"> & { name: VideoAssetName }): React.ReactElement {
  return (
    <img
      width={dimensions[name]?.width}
      height={dimensions[name]?.height}
      {...props}
      src={videoAssetUrl(name)}
      alt=""
    />
  );
}
