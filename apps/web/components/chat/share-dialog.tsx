"use client";

import { useId, useMemo, useState, useSyncExternalStore, type ReactElement } from "react";
import { Check, ChevronRight, Globe, Link2, Lock, MessageSquare, Share2, X } from "lucide-react";
import { Button, DialogPrimitive, UserInitialsAvatar } from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import { chatSessionUrl } from "@/lib/chat-navigation";
import type { ChatSessionSummary } from "@/lib/chat-sessions";
import "./share-dialog.css";

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: ChatSessionSummary;
  transcript?: string;
}

function subscribeViewport(notify: () => void): () => void {
  const query = window.matchMedia("(max-width: 860px)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

const mobileViewport = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;

export function ShareDialog({ open, onOpenChange, chat }: ShareDialogProps): ReactElement {
  const isMobile = useSyncExternalStore(subscribeViewport, mobileViewport, () => false);
  const { profile, session } = useAuth();
  const emailInputId = useId();

  const [copiedLink, setCopiedLink] = useState(false);

  const ownerName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Your account";
  const ownerEmail = profile?.email || session?.user?.email || "student@pansgpt.edu";

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const path = chatSessionUrl(chat.id, isMobile);
    return `${window.location.origin}${path}`;
  }, [chat.id, isMobile]);

  async function handleCopyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  }

  async function handleMobileShare(): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: chat.title || "PansGPT Study Chat",
          text: `PansGPT study session: ${chat.title}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed or share was aborted; fall back to clipboard
      }
    }
    await handleCopyLink();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="share-dialog-overlay" data-chat-overlay />
        <DialogPrimitive.Content
          className={isMobile ? "share-dialog-mobile" : "share-dialog-desktop"}
          data-chat-overlay
          aria-labelledby={undefined}
          aria-label="Share conversation"
        >
          {isMobile ? (
            /* ================= MOBILE BOTTOM SHEET ================= */
            <>
              <div className="share-dialog-mobile-handle" aria-hidden="true" />

              <div className="share-dialog-mobile-header">
                <DialogPrimitive.Close
                  className="share-dialog-mobile-close"
                  aria-label="Close dialog"
                >
                  <X size={18} aria-hidden="true" />
                </DialogPrimitive.Close>
                <DialogPrimitive.Title className="share-dialog-mobile-title">
                  Share
                </DialogPrimitive.Title>
                <div className="share-dialog-mobile-header-spacer" aria-hidden="true" />
              </div>

              <DialogPrimitive.Description className="p-sr-only">
                Copy a link to open this conversation in your own account
              </DialogPrimitive.Description>

              <div
                className="share-dialog-mobile-session-title"
                aria-label={`Conversation: ${chat.title || "New chat"}`}
              >
                <MessageSquare
                  size={18}
                  className="share-dialog-mobile-session-icon"
                  aria-hidden="true"
                />
                <span className="share-dialog-mobile-session-name">{chat.title || "New chat"}</span>
              </div>

              <div className="share-dialog-section-label">Who has access</div>

              <div className="share-dialog-mobile-card">
                <button type="button" className="share-dialog-mobile-card-row" disabled>
                  <div className="share-dialog-mobile-card-row-left">
                    <Lock size={18} aria-hidden="true" />
                    <span>Only you have access</span>
                  </div>
                  <Check size={18} className="share-dialog-mobile-check" aria-hidden="true" />
                </button>

                <div className="share-dialog-mobile-card-divider" aria-hidden="true" />

                <button type="button" className="share-dialog-mobile-card-row" disabled>
                  <div className="share-dialog-mobile-card-row-left">
                    <Globe size={18} aria-hidden="true" />
                    <span>Anyone with the link</span>
                  </div>
                </button>
              </div>

              <p className="share-dialog-mobile-note">
                This link opens your conversation after you sign in. Sharing with other accounts is
                not available yet.
              </p>

              <Button
                className="share-dialog-mobile-primary-btn"
                variant="secondary"
                size="lg"
                leadingIcon={copiedLink ? <Check size={18} /> : <Share2 size={18} />}
                trailingIcon={null}
                onClick={() => void handleMobileShare()}
              >
                {copiedLink ? "Link copied!" : "Share link"}
              </Button>
            </>
          ) : (
            /* ================= DESKTOP CENTERED MODAL (480x360 px) ================= */
            <>
              <div className="share-dialog-header">
                <DialogPrimitive.Title className="share-dialog-title">
                  Share session
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="share-dialog-subtitle">
                  This link opens your conversation in your own account.
                </DialogPrimitive.Description>
                <DialogPrimitive.Close className="share-dialog-close" aria-label="Close dialog">
                  <X size={18} aria-hidden="true" />
                </DialogPrimitive.Close>
              </div>

              <div className="share-dialog-invite">
                <input
                  id={emailInputId}
                  type="email"
                  className="share-dialog-invite-input"
                  placeholder="Add people by email"
                  disabled
                  aria-label="Add people by email"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  leadingIcon={null}
                  trailingIcon={null}
                >
                  Invite
                </Button>
              </div>

              <div className="share-dialog-section-label">Who has access</div>

              <div className="share-dialog-access-group">
                <button type="button" className="share-dialog-access-row" disabled>
                  <div className="share-dialog-access-left">
                    <div className="share-dialog-icon-badge" aria-hidden="true">
                      <Lock size={16} />
                    </div>
                    <span className="share-dialog-access-label">Only you have access</span>
                  </div>
                  <ChevronRight size={16} color="var(--text-tertiary-600)" aria-hidden="true" />
                </button>

                <div className="share-dialog-owner-row">
                  <div className="share-dialog-owner-left">
                    <UserInitialsAvatar name={ownerName} email={ownerEmail} size="sm" />
                    <div className="share-dialog-owner-meta">
                      <span className="share-dialog-owner-name">
                        {ownerName} <span>(you)</span>
                      </span>
                      <span className="share-dialog-owner-email">{ownerEmail}</span>
                    </div>
                  </div>
                  <span className="share-dialog-owner-badge">Owner</span>
                </div>
              </div>

              <p className="share-dialog-disclaimer">
                Sharing with other accounts is not available yet. See our{" "}
                <a href="/legal/usage-policy" target="_blank" rel="noreferrer">
                  Usage Policy
                </a>
                .
              </p>

              <div className="share-dialog-footer">
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={copiedLink ? <Check size={14} /> : <Link2 size={14} />}
                  trailingIcon={null}
                  onClick={() => void handleCopyLink()}
                >
                  {copiedLink ? "Copied!" : "Copy link"}
                </Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
