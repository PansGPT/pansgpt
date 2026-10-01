"use client";

import React from "react";
import { ArtifactItem } from "@/lib/sse-parser";
import { DocumentCard } from "./DocumentCard";
import { FlashcardDeckViewer } from "./FlashcardDeckViewer";
import { ChemicalStructureCard } from "./ChemicalStructureCard";
import { MnemonicCard } from "./MnemonicCard";

interface ArtifactRendererProps {
  artifact: ArtifactItem;
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ artifact }) => {
  switch (artifact.skill_name) {
    case "generate_flashcards":
      return <FlashcardDeckViewer artifact={artifact} />;
    case "draw_chemical_structure":
      return <ChemicalStructureCard artifact={artifact} />;
    case "generate_mnemonics":
      return <MnemonicCard artifact={artifact} />;
    case "create_doc":
    case "create_pdf":
    case "create_pptx":
    default:
      return <DocumentCard artifact={artifact} />;
  }
};
