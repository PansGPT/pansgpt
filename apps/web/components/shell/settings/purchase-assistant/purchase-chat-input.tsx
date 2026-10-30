"use client";

import { useState, useRef, useCallback, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Menu, X, Smile, Mic } from "lucide-react";
import type { ChatAttachment } from "./purchase-types";

export function PurchaseChatInput({
  onSendMessage,
  onOpenPackages,
  disabled,
}: {
  onSendMessage: (text: string, attachment?: ChatAttachment) => void;
  onOpenPackages?: () => void;
  disabled?: boolean;
}): React.ReactElement {
  const [text, setText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WebP) of your transfer receipt.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const sizeInKb = Math.round(file.size / 1024);
    const sizeText = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    setSelectedAttachment({
      url: previewUrl,
      fileName: file.name,
      fileSize: sizeText,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !selectedAttachment) return;

    onSendMessage(trimmed, selectedAttachment ?? undefined);
    setText("");
    setSelectedAttachment(null);
  }, [text, selectedAttachment, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = (text.trim().length > 0 || selectedAttachment !== null) && !disabled;

  return (
    <footer className="telegram-bottom-bar">
      {/* Hidden native file input for receipt uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic"
        className="p-sr-only"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label="Upload transfer receipt"
      />

      {/* Telegram Bright Pill "≡ Menu" Button */}
      {onOpenPackages && (
        <button
          type="button"
          className="telegram-menu-pill"
          onClick={onOpenPackages}
          disabled={disabled}
          aria-label="Open packages menu"
          title="Open packages menu"
        >
          <Menu size={15} aria-hidden="true" />
          <span>Menu</span>
        </button>
      )}

      {/* Telegram Rounded Composer Pill Input Box */}
      <div className="telegram-composer-pill">
        <button
          type="button"
          className="telegram-composer-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Add media"
          title="Add media"
        >
          <Smile size={18} aria-hidden="true" />
        </button>

        {selectedAttachment && (
          <div className="telegram-attachment-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedAttachment.url}
              alt={selectedAttachment.fileName}
              className="telegram-attachment-chip-img"
            />
            <button
              type="button"
              className="telegram-composer-icon-btn"
              onClick={() => setSelectedAttachment(null)}
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <input
          type="text"
          className="telegram-composer-text-input"
          placeholder="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Chat message"
        />

        <button
          type="button"
          className="telegram-composer-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach receipt screenshot"
          aria-label="Attach receipt screenshot"
        >
          <Paperclip size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Circular Action Button outside pill on the right (Mic or Send Arrow) */}
      <button
        type="button"
        className={`telegram-circle-action-btn${canSend ? " is-send" : ""}`}
        onClick={canSend ? handleSend : () => fileInputRef.current?.click()}
        disabled={disabled}
        aria-label={canSend ? "Send message" : "Attach or record"}
        title={canSend ? "Send message" : "Attach receipt"}
      >
        {canSend ? <ArrowUp size={18} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
      </button>
    </footer>
  );
}
