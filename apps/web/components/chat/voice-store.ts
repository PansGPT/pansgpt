"use client";

import { useSyncExternalStore } from "react";

export type VoicePhase = "idle" | "listening" | "transcribing";

export interface VoiceState {
  phase: VoicePhase;
  stream: MediaStream | null;
  elapsedSeconds: number;
  stop: () => void;
  cancel: () => void;
}

type Listener = () => void;

class VoiceStore {
  private phase: VoicePhase = "idle";
  private stream: MediaStream | null = null;
  private elapsedSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private stopCallback: (() => void) | null = null;
  private cancelCallback: (() => void) | null = null;
  private listeners = new Set<Listener>();

  // Cached snapshot to satisfy React useSyncExternalStore reference stability requirement
  private snapshot: VoiceState;

  constructor() {
    this.snapshot = this.createSnapshot();
  }

  private createSnapshot(): VoiceState {
    return {
      phase: this.phase,
      stream: this.stream,
      elapsedSeconds: this.elapsedSeconds,
      stop: this.handleStop,
      cancel: this.handleCancel,
    };
  }

  public getState = (): VoiceState => {
    return this.snapshot;
  };

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.snapshot = this.createSnapshot();
    this.listeners.forEach((l) => l());
  }

  public setHandlers(stop: () => void, cancel: () => void) {
    this.stopCallback = stop;
    this.cancelCallback = cancel;
  }

  public startListening(stream: MediaStream) {
    this.clearTimer();
    this.phase = "listening";
    this.stream = stream;
    this.elapsedSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
      this.notify();
    }, 1000);
    this.notify();
  }

  public startTranscribing() {
    this.clearTimer();
    this.phase = "transcribing";
    this.stream = null;
    this.notify();
  }

  public reset() {
    this.clearTimer();
    this.phase = "idle";
    this.stream = null;
    this.elapsedSeconds = 0;
    this.stopCallback = null;
    this.cancelCallback = null;
    this.notify();
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private handleStop = () => {
    if (this.stopCallback) {
      this.stopCallback();
    }
  };

  private handleCancel = () => {
    if (this.cancelCallback) {
      this.cancelCallback();
    } else {
      this.reset();
    }
  };
}

export const voiceStore = new VoiceStore();

export function useVoiceState(): VoiceState {
  return useSyncExternalStore(voiceStore.subscribe, voiceStore.getState, voiceStore.getState);
}
