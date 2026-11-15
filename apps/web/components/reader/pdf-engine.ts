import type { PDFDocumentProxy } from "pdfjs-dist";
import { env } from "@/env";

async function openPdf(input: string | Uint8Array, httpHeaders?: Record<string, string>) {
  const pdfjs = await import("pdfjs-dist");
  const assets = `/pdfjs/${pdfjs.version}/`;
  pdfjs.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
  return pdfjs.getDocument({
    ...(typeof input === "string" ? { url: input, httpHeaders } : { data: input }),
    cMapUrl: `${assets}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
    enableXfa: false,
    // Keep background downloads bounded; PDF.js requests necessary byte ranges on demand.
    disableAutoFetch: true,
    disableStream: true,
  });
}

export function loadPdf(url: string) {
  // Signed storage requests never receive the account's bearer token.
  return openPdf(url);
}

export function loadPdfBytes(bytes: Uint8Array) {
  return openPdf(bytes);
}

export function loadAuthorizedPdf(documentId: string, token: string) {
  return openPdf(`${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${documentId}/pdf`, {
    Authorization: `Bearer ${token}`,
  });
}

export function canRetryPdfThroughApi(error: unknown): boolean {
  return (
    error instanceof Error &&
    [
      "UnknownErrorException",
      "ResponseException",
      "UnexpectedResponseException",
      "TypeError",
    ].includes(error.name)
  );
}

export interface PdfSource {
  pdf: PDFDocumentProxy;
  ratios: Map<number, number>;
  firstWidth: number;
}
