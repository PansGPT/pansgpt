"use client";
import { Brain } from "lucide-react";
import type { ArtifactItem } from "@pansgpt/types";
import { mnemonicContentSchema } from "@/lib/study-artifacts";
import { RichCard, RichDisclosure, UnavailableArtifact } from "./RichCard";
export function MnemonicCard({ artifact }: { artifact: ArtifactItem }) {
  const result = mnemonicContentSchema.safeParse(artifact.content);
  if (!result.success) return <UnavailableArtifact title={artifact.title} />;
  const content = result.data;
  return (
    <RichCard title={content.concept} label="Memory aid" icon={<Brain size={20} />}>
      <blockquote className="chat-mnemonic-phrase">{content.mnemonic}</blockquote>
      <ol className="chat-mnemonic-list">
        {content.breakdown.map((item, index) => (
          <li key={index}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
      {content.clinical_notes && (
        <RichDisclosure label="Study notes">
          <p>{content.clinical_notes}</p>
        </RichDisclosure>
      )}
    </RichCard>
  );
}
