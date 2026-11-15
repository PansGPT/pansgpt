import type { ReaderRect, ReaderSnipRequest } from "@pansgpt/types";

export interface ReaderSnip {
  page: number;
  rect: ReaderRect;
  file: File;
  preview: string;
}

const origins = new WeakMap<File, ReaderSnipRequest>();

export function registerReaderSnip(file: File, source: ReaderSnipRequest): void {
  origins.set(file, source);
}

export function readerSnipOrigin(file: File): ReaderSnipRequest | undefined {
  return origins.get(file);
}
