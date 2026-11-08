"use client";

import { useEffect, useRef, useState } from "react";

interface AudioWaveformProps {
  stream: MediaStream | null;
  barCount?: number;
}

export function AudioWaveform({ stream, barCount = 32 }: AudioWaveformProps): React.ReactElement {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: barCount }, () => 0.1));
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      }
    } catch {
      // AudioContext unavailable or denied; fallback to gentle synthesized pulse
    }

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let phase = 0;

    const tick = () => {
      phase += 0.08;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        // Calculate average volume energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / (dataArray.length * 255); // 0 to 1

        const nextLevels = Array.from({ length: barCount }, (_, index) => {
          // Center-weighted distribution (bell curve taper)
          const normDist = Math.abs(index - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const bell = Math.cos(normDist * Math.PI * 0.45);

          // Sample corresponding frequency bin if available
          const binIndex = Math.floor((index / barCount) * (dataArray.length * 0.75));
          const binVal = (dataArray[binIndex] ?? 0) / 255;

          // Combine raw audio energy with subtle baseline sine motion
          const idleWave = 0.08 + 0.06 * Math.sin(phase + index * 0.35);
          const activeHeight = (binVal * 0.7 + avg * 0.5) * bell;
          const combined = Math.max(idleWave, activeHeight);

          return Math.min(1, Math.max(0.08, combined));
        });

        setLevels(nextLevels);
      } else {
        // Fallback organic wave motion when analyser is unavailable
        const nextLevels = Array.from({ length: barCount }, (_, index) => {
          const normDist = Math.abs(index - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const bell = Math.cos(normDist * Math.PI * 0.4);
          const val = 0.12 + 0.25 * bell * (0.5 + 0.5 * Math.sin(phase + index * 0.3));
          return Math.min(1, Math.max(0.08, val));
        });
        setLevels(nextLevels);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      try {
        source?.disconnect();
        if (audioCtx && audioCtx.state !== "closed") {
          void audioCtx.close();
        }
      } catch {
        // Safe cleanup ignore
      }
    };
  }, [stream, barCount]);

  const activeLevels = stream ? levels : Array.from({ length: barCount }, () => 0.1);

  return (
    <div className="p-study-voice-waveform" aria-hidden="true">
      {activeLevels.map((level, idx) => {
        // Scale between 3px and 28px
        const heightPx = Math.round(3 + level * 25);
        return <span key={idx} className="p-study-voice-bar" style={{ height: `${heightPx}px` }} />;
      })}
    </div>
  );
}
