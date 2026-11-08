"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  stream: MediaStream | null;
}

const BAR_WIDTH = 2.5;
const BAR_GAP = 3.5;
const STRIDE = BAR_WIDTH + BAR_GAP; // 6px between bar centers
const SAMPLE_INTERVAL_MS = 48; // New bar sample every 48ms (~21 samples/sec)
const MIN_BAR_HEIGHT = 2.5; // Circular dot when silent
const MAX_BAR_HEIGHT = 24; // Full voice peak height
const NOISE_FLOOR = 0.04; // Noise gate: ambient room noise is under ~0.04

function drawCapsule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (height <= width) {
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }
}

export function AudioWaveform({ stream }: AudioWaveformProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    if (stream) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioCtx = new AudioCtx();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.25;
          source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
        }
      } catch {
        // AudioContext denied or unavailable
      }
    }

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    // Timeline history buffer: each entry is a normalized amplitude [0, 1]
    // Index 0 is the newest sample (drawn on the right), higher indices are older (drawn towards left)
    const history: number[] = [];
    let canvasWidth = 300;
    let canvasHeight = 36;
    let maxBars = 100;
    let smoothedLevel = 0;
    let lastSampleTime = performance.now();
    let animFrameId: number | null = null;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasWidth = Math.max(80, Math.floor(rect.width));
      canvasHeight = Math.max(24, Math.floor(rect.height));
      canvas.width = Math.floor(canvasWidth * dpr);
      canvas.height = Math.floor(canvasHeight * dpr);

      maxBars = Math.ceil(canvasWidth / STRIDE) + 15;
      // Pre-fill history buffer with silence dots across the entire width
      while (history.length < maxBars) {
        history.push(0);
      }
      if (history.length > maxBars) {
        history.length = maxBars;
      }
    };

    updateSize();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateSize();
          })
        : null;
    resizeObserver?.observe(canvas);

    // Cache theme fill color
    let barColor = "#a1a1aa";
    try {
      const computed = getComputedStyle(canvas).color;
      if (computed) barColor = computed;
    } catch {
      // fallback
    }

    const render = (now: number) => {
      // 1. Measure microphone voice energy
      let targetLevel = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        // Average voice band energy (~90Hz to 3400Hz)
        let sum = 0;
        const lowBin = 1;
        const highBin = Math.min(dataArray.length - 1, 36);
        for (let i = lowBin; i <= highBin; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / ((highBin - lowBin + 1) * 255);

        // Apply noise gate
        if (avg > NOISE_FLOOR) {
          const raw = (avg - NOISE_FLOOR) / (0.38 - NOISE_FLOOR);
          const clamped = Math.min(1, Math.max(0, raw));
          targetLevel = Math.pow(clamped, 0.72);
        } else {
          targetLevel = 0;
        }
      }

      // 2. Smooth speech level: immediate attack, natural speech decay
      if (targetLevel > smoothedLevel) {
        smoothedLevel += (targetLevel - smoothedLevel) * 0.55;
      } else {
        smoothedLevel += (targetLevel - smoothedLevel) * 0.22;
      }
      if (smoothedLevel < 0.02) {
        smoothedLevel = 0;
      }

      // 3. Sample new bar on interval and push into timeline
      const elapsed = now - lastSampleTime;
      if (elapsed >= SAMPLE_INTERVAL_MS) {
        const samplesToAdd = Math.min(4, Math.floor(elapsed / SAMPLE_INTERVAL_MS));
        for (let s = 0; s < samplesToAdd; s++) {
          history.unshift(smoothedLevel);
        }
        if (history.length > maxBars) {
          history.length = maxBars;
        }
        lastSampleTime = now - (elapsed % SAMPLE_INTERVAL_MS);
      }

      // 4. Smooth sub-pixel offset for continuous scrolling tape movement
      const scrollProgress = Math.min(1, Math.max(0, (now - lastSampleTime) / SAMPLE_INTERVAL_MS));
      const subPixelOffset = scrollProgress * STRIDE;

      // 5. Draw to canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const centerY = canvasHeight / 2;
        const rightEdge = canvasWidth - 4; // Padding before the right action controls
        const fadeLeft = 45; // Fade to 0 opacity over first 45px on left

        ctx.fillStyle = barColor;

        for (let i = 0; i < history.length; i++) {
          const x = rightEdge - subPixelOffset - i * STRIDE;
          if (x + BAR_WIDTH < 0) break;
          if (x > canvasWidth) continue;

          const level = history[i] ?? 0;
          const barHeight =
            level > 0 ? MIN_BAR_HEIGHT + level * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) : MIN_BAR_HEIGHT;
          const y = centerY - barHeight / 2;

          // Alpha fade near left edge
          let alpha = 1;
          if (x < fadeLeft) {
            alpha = Math.max(0, x / fadeLeft);
          } else if (x > rightEdge - 8) {
            alpha = Math.max(0, (rightEdge - x) / 8);
          }

          ctx.globalAlpha = alpha;
          drawCapsule(ctx, x, y, BAR_WIDTH, barHeight, BAR_WIDTH / 2);
        }

        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
      resizeObserver?.disconnect();
      try {
        source?.disconnect();
        if (audioCtx && audioCtx.state !== "closed") {
          void audioCtx.close();
        }
      } catch {
        // Safe cleanup
      }
    };
  }, [stream]);

  return <canvas ref={canvasRef} className="p-study-voice-canvas" aria-hidden="true" />;
}
