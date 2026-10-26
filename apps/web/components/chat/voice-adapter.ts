import type { DictationAdapter } from "@assistant-ui/react";

/** Record locally; all transcription goes through the authenticated FastAPI endpoint. */
export function createVoiceAdapter(
  transcribe: (audio: Blob, signal: AbortSignal) => Promise<string>,
  reportError: (message: string) => void
): DictationAdapter & { dispose: () => void } {
  let cancelCurrent: (() => void) | undefined;
  return {
    disableInputDuringDictation: true,
    dispose: () => cancelCurrent?.(),
    listen() {
      cancelCurrent?.();
      const controller = new AbortController();
      const starts = new Set<() => void>();
      const speeches = new Set<(result: DictationAdapter.Result) => void>();
      const ends = new Set<(result: DictationAdapter.Result) => void>();
      let recorder: MediaRecorder | undefined;
      let stream: MediaStream | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let resolveStopped: () => void = () => undefined;
      const stopped = new Promise<void>((resolve) => {
        resolveStopped = resolve;
      });
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        stream?.getTracks().forEach((track) => track.stop());
      };
      const finish = (reason: "stopped" | "cancelled" | "error", transcript = "") => {
        if (session.status.type === "ended") return;
        session.status = { type: "ended", reason };
        if (reason === "error") controller.abort();
        cleanup();
        if (transcript) speeches.forEach((callback) => callback({ transcript, isFinal: true }));
        ends.forEach((callback) => callback({ transcript, isFinal: true }));
        resolveStopped();
      };
      const session: DictationAdapter.Session = {
        status: { type: "starting" },
        stop: async () => {
          if (recorder?.state === "recording") recorder.stop();
          else if (!recorder) session.cancel();
          await stopped;
        },
        cancel: () => {
          controller.abort();
          if (recorder?.state === "recording") recorder.stop();
          finish("cancelled");
        },
        onSpeechStart: (callback) => {
          starts.add(callback);
          return () => starts.delete(callback);
        },
        onSpeech: (callback) => {
          speeches.add(callback);
          return () => speeches.delete(callback);
        },
        onSpeechEnd: (callback) => {
          ends.add(callback);
          return () => ends.delete(callback);
        },
      };
      cancelCurrent = session.cancel;
      void (async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
            throw new Error(
              "Voice recording is unavailable in this browser. You can type your question."
            );
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (controller.signal.aborted) {
            cleanup();
            return;
          }
          const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
            (mime) => MediaRecorder.isTypeSupported(mime)
          );
          recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          const chunks: Blob[] = [];
          let bytes = 0;
          recorder.addEventListener("dataavailable", (event) => {
            bytes += event.data.size;
            if (bytes > 10 * 1024 * 1024) {
              reportError("The recording is too large. Try a shorter question.");
              session.cancel();
            } else if (event.data.size) chunks.push(event.data);
          });
          recorder.addEventListener("error", () => {
            reportError("Recording failed. Check your microphone and try again.");
            finish("error");
          });
          recorder.addEventListener("stop", () => {
            cleanup();
            if (controller.signal.aborted) return;
            const audio = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
            void transcribe(audio, controller.signal)
              .then((text) => {
                if (!controller.signal.aborted) finish("stopped", text);
              })
              .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                  reportError(
                    error instanceof Error ? error.message : "Transcription failed. Please retry."
                  );
                  finish("error");
                }
              });
          });
          recorder.start(1000);
          session.status = { type: "running" };
          starts.forEach((callback) => callback());
          timer = setTimeout(() => {
            if (recorder?.state === "recording") recorder.stop();
          }, 60000);
        } catch (error: unknown) {
          if (!controller.signal.aborted) {
            reportError(error instanceof Error ? error.message : "Microphone access was denied.");
            finish("error");
          }
        }
      })();
      return session;
    },
  };
}
