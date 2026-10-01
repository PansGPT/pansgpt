"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Layers } from "lucide-react";
import { ArtifactItem } from "@/lib/sse-parser";

interface Flashcard {
  front: string;
  back: string;
  difficulty?: string;
}

interface FlashcardDeckViewerProps {
  artifact: ArtifactItem;
}

export const FlashcardDeckViewer: React.FC<FlashcardDeckViewerProps> = ({ artifact }) => {
  const cards: Flashcard[] = (artifact.content?.cards as Flashcard[]) || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards.length) {
    return null;
  }

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="my-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Study Flashcard Deck
          </h4>
        </div>
        <span className="text-xs font-medium text-neutral-400">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Interactive Flip Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50/70 p-6 text-center transition-all hover:bg-neutral-100/70 dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:bg-neutral-800/40"
      >
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
          <RotateCw className="h-3 w-3" />
          <span>Click to flip</span>
        </span>

        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {isFlipped ? currentCard.back : currentCard.front}
        </p>

        <span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          {isFlipped ? "Answer" : "Question"}
        </span>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={cards.length <= 1}
          className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Prev</span>
        </button>

        <button
          onClick={handleNext}
          disabled={cards.length <= 1}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
