"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Layers, Check } from "lucide-react";
import type { ArtifactItem, FlashcardContent } from "@pansgpt/types";
import { flashcardContentSchema } from "@/lib/study-artifacts";
import { RichCard, RichDisclosure, UnavailableArtifact } from "./RichCard";
export function FlashcardDeckViewer({ artifact }: { artifact: ArtifactItem }) {
  const result = flashcardContentSchema.safeParse(artifact.content);
  return result.success ? (
    <Deck key={JSON.stringify(result.data)} deck={result.data} />
  ) : (
    <UnavailableArtifact title={artifact.title} />
  );
}
function Deck({ deck }: { deck: FlashcardContent }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(() => new Set());
  const card = deck.cards[index];
  const move = (amount: number) => {
    setIndex((index + amount + deck.cards.length) % deck.cards.length);
    setFlipped(false);
  };
  return (
    <RichCard title={deck.topic} label="Flashcards" icon={<Layers size={20} />}>
      <div className="chat-rich-meta">
        <span>
          Card {index + 1} of {deck.cards.length}
        </span>
        <span>{card.difficulty || "Practice"}</span>
      </div>
      <button
        type="button"
        className="chat-flashcard"
        aria-label={flipped ? "Show question" : "Show answer"}
        aria-pressed={flipped}
        onClick={() => setFlipped(!flipped)}
      >
        <span className="chat-rich-eyebrow">{flipped ? "Answer" : "Question"}</span>
        <span className="chat-flashcard-text">{flipped ? card.back : card.front}</span>
        <span className="chat-rich-muted">
          {flipped ? "Tap to see question" : "Think it through, then tap to reveal"}
        </span>
      </button>
      {card.hint && !flipped && (
        <RichDisclosure key={index} label="Show hint">
          <p>{card.hint}</p>
        </RichDisclosure>
      )}
      <div className="chat-rich-controls">
        <button
          type="button"
          aria-label="Previous card"
          onClick={() => move(-1)}
          disabled={deck.cards.length === 1}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          disabled={!flipped}
          aria-pressed={known.has(index)}
          onClick={() =>
            setKnown((old) => {
              const next = new Set(old);
              if (next.has(index)) next.delete(index);
              else next.add(index);
              return next;
            })
          }
        >
          <Check size={15} />
          {known.has(index) ? "Reviewed" : "Got it"}
        </button>
        <button
          type="button"
          aria-label="Next card"
          onClick={() => move(1)}
          disabled={deck.cards.length === 1}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <footer className="chat-rich-footer">
        <span role="status">
          {known.size} of {deck.cards.length} reviewed
        </span>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setFlipped(false);
            setKnown(new Set());
          }}
        >
          <RotateCcw size={13} />
          Restart
        </button>
      </footer>
    </RichCard>
  );
}
