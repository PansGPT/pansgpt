"use client";

import React from "react";
import { FlaskConical, ExternalLink } from "lucide-react";
import { ArtifactItem } from "@/lib/sse-parser";

interface ChemicalStructureCardProps {
  artifact: ArtifactItem;
}

export const ChemicalStructureCard: React.FC<ChemicalStructureCardProps> = ({ artifact }) => {
  const content = artifact.content || {};
  const compoundName = (content.compound_name as string) || artifact.title || "Chemical Compound";
  const smiles = (content.smiles as string) || "";
  const formula = (content.formula as string) || "";
  const depictionUrl = (content.depiction_url as string) || "";

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {compoundName}
          </h4>
        </div>
        {formula && (
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {formula}
          </span>
        )}
      </div>

      {depictionUrl && (
        <div className="flex items-center justify-center rounded-xl bg-white p-4 dark:bg-white/95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={depictionUrl}
            alt={`2D Chemical structure for ${compoundName}`}
            className="max-h-48 max-w-full object-contain"
          />
        </div>
      )}

      {smiles && (
        <div className="mt-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            SMILES Notation
          </label>
          <div className="mt-1 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            <span className="truncate">{smiles}</span>
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-neutral-400 hover:text-emerald-600"
              title="View on PubChem"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
