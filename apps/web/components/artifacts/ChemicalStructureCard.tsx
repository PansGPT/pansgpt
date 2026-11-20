"use client";
import { FlaskConical, ExternalLink } from "lucide-react";
import type { ArtifactItem } from "@pansgpt/types";
import { chemicalContentSchema } from "@/lib/study-artifacts";
import { RichCard, RichDisclosure, UnavailableArtifact } from "./RichCard";
export function ChemicalStructureCard({ artifact }: { artifact: ArtifactItem }) {
  const result = chemicalContentSchema.safeParse(artifact.content);
  if (!result.success) return <UnavailableArtifact title={artifact.title} />;
  const content = result.data;
  return (
    <RichCard
      title={content.compound_name}
      label="Chemical structure"
      icon={<FlaskConical size={20} />}
    >
      {content.formula && <p className="chat-chemical-formula">{content.formula}</p>}
      <p className="chat-rich-eyebrow">SMILES notation</p>
      <pre className="chat-chemical-smiles">{content.smiles}</pre>
      {content.notes && (
        <RichDisclosure label="Structure notes">
          <p>{content.notes}</p>
        </RichDisclosure>
      )}
      <a
        className="chat-rich-external"
        href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(content.smiles)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        View structure on PubChem
        <ExternalLink size={14} />
      </a>
    </RichCard>
  );
}
