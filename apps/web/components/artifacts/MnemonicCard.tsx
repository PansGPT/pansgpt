"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { ArtifactItem } from "@/lib/sse-parser";

interface MnemonicCardProps {
  artifact: ArtifactItem;
}

export const MnemonicCard: React.FC<MnemonicCardProps> = ({ artifact }) => {
  const content = artifact.content || {};
  const drugOrClass =
    (content.drug_or_class as string) || artifact.title || "Clinical Pharmacology";
  const mnemonic = (content.mnemonic as string) || "";
  const breakdown = (content.breakdown as string[]) || [];

  return (
    <div className="my-4 rounded-2xl border border-neutral-200 bg-linear-to-br from-amber-50/50 via-white to-orange-50/40 p-5 shadow-xs dark:border-neutral-800 dark:from-amber-950/20 dark:via-neutral-900 dark:to-orange-950/10">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Pharmacology Mnemonic: {drugOrClass}
        </h4>
      </div>

      {mnemonic && (
        <div className="my-3 rounded-xl border border-amber-200/60 bg-amber-50/80 p-3.5 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          &ldquo;{mnemonic}&rdquo;
        </div>
      )}

      {breakdown.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Clinical Breakdown
          </label>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {breakdown.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-neutral-800 shadow-2xs dark:bg-neutral-800/80 dark:text-neutral-200"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
