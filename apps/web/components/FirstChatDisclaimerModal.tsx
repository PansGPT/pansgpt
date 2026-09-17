"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface FirstChatDisclaimerModalProps {
  isOpen: boolean;
  userId: string;
  onAccept: () => void;
}

export function FirstChatDisclaimerModal({
  isOpen,
  userId,
  onAccept,
}: FirstChatDisclaimerModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!agreed) return;
    try {
      localStorage.setItem(`pansgpt_disclaimer_accepted_${userId}`, "true");
    } catch {
      // Ignore localStorage errors (e.g. private browsing mode)
    }
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 mb-4">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Mandatory Academic & Clinical Disclaimer
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Please review and acknowledge before your first AI study session.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
          <p>
            <strong>PansGPT 2.0</strong> is an AI-powered educational study companion designed to
            support pharmacy curriculum mastery, pharmacological concept exploration, and
            examination revision.
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            It does <strong>not</strong> constitute medical diagnosis, prescribing advice, or
            clinical patient management. Never rely solely on AI outputs for patient care decisions.
            Always verify drug dosages, contraindications, and clinical interactions against
            official pharmaceutical monographs, your lecturers&apos; materials, and accredited
            formularies.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="academic-disclaimer-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <span className="text-xs text-neutral-700 dark:text-neutral-300 leading-normal">
              I understand that PansGPT is an educational tool for pharmacy studies, not a clinical
              prescription or medical diagnosis system. I agree to exercise professional
              pharmaceutical judgment and verify all facts.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={!agreed}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />I Understand & Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
