"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  CheckCheck,
  Coins,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  CREDIT_PACKS,
  type CreditPack,
  type BankTransferDetails,
  type PurchaseChatMessage,
  type ActionPill,
  type ChatAttachment,
} from "./purchase-types";
import { PurchaseChatInput } from "./purchase-chat-input";
import "./purchase-assistant.css";

function generateRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "PG-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DEFAULT_BANK_DETAILS = {
  bankName: "Moniepoint MFB",
  accountNumber: "8142901928",
  accountName: "PansGPT / Clinical Education",
};

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitialWelcomeMessage(): PurchaseChatMessage {
  return {
    id: "msg-welcome",
    sender: "assistant",
    timestamp: formatCurrentTime(),
    text: "By using this bot you agree to top up Study Credits via direct bank settlement (Moniepoint MFB).\n\nPlease select a credit package below to add to your study account:",
    actionPills: CREDIT_PACKS.map((pack) => ({
      id: pack.id,
      label: pack.label,
      action: "select-pack",
      packId: pack.id,
      variant: pack.badge ? "brand" : "secondary",
    })),
  };
}

export function PurchaseAssistantChat({
  currentCredits,
  onCreditSuccess,
  onBack,
  onClose,
}: {
  currentCredits: number | null;
  onCreditSuccess: (addedCredits: number) => void;
  onBack: () => void;
  onClose: () => void;
}): React.ReactElement {
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [activeTransfer, setActiveTransfer] = useState<BankTransferDetails | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [selectedReceiptPreview, setSelectedReceiptPreview] = useState<string | null>(null);
  const [messages, setMessages] = useState<PurchaseChatMessage[]>(() => [
    getInitialWelcomeMessage(),
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const copyToClipboard = useCallback((text: string, type: "account" | "ref") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else if (typeof document !== "undefined") {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    if (type === "account") {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  }, []);

  // Execute verification flow
  const triggerVerification = useCallback(
    (pack: CreditPack, details?: BankTransferDetails | null) => {
      if (isVerifying || isCompleted) return;
      setIsVerifying(true);

      const botTime = formatCurrentTime();
      const verifyingMsgId = `bot-verifying-${Date.now()}`;

      const verifyingMsg: PurchaseChatMessage = {
        id: verifyingMsgId,
        sender: "assistant",
        timestamp: botTime,
        text: `Scanning Moniepoint MFB network for reference **${details?.reference || "PG-TRANSFER"}**…`,
        verificationStatus: "verifying",
      };

      setMessages((prev) => [...prev, verifyingMsg]);

      // Simulated instant bank verification (2.5s)
      setTimeout(() => {
        setIsVerifying(false);
        setIsCompleted(true);
        onCreditSuccess(pack.credits);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === verifyingMsgId
              ? {
                  ...m,
                  verificationStatus: "confirmed",
                  text: `🎉 **Payment Verified!**\n\nYour **${pack.credits.toLocaleString()} Study Credits** have been successfully added to your account.\n\nTransaction Ref: **${details?.reference || "PG-TRANSFER"}**`,
                  actionPills: [
                    {
                      id: "btn-done",
                      label: "Done (Back to Study)",
                      action: "done",
                      variant: "brand",
                    },
                  ],
                }
              : m
          )
        );
      }, 2500);
    },
    [isVerifying, isCompleted, onCreditSuccess]
  );

  // Handle Telegram inline button clicks
  const handlePillClick = useCallback(
    (pill: ActionPill) => {
      const userTime = formatCurrentTime();
      const botTime = formatCurrentTime();

      switch (pill.action) {
        case "copy-account": {
          if (activeTransfer) {
            copyToClipboard(activeTransfer.accountNumber, "account");
          }
          break;
        }

        case "copy-ref": {
          if (activeTransfer) {
            copyToClipboard(activeTransfer.reference, "ref");
          }
          break;
        }

        case "select-pack": {
          const pack = CREDIT_PACKS.find((p) => p.id === pill.packId);
          if (!pack) return;
          setSelectedPack(pack);

          const ref = generateRef();
          const transferDetails: BankTransferDetails = {
            ...DEFAULT_BANK_DETAILS,
            amountNaira: pack.priceNaira,
            reference: ref,
            expiresInMinutes: 30,
          };
          setActiveTransfer(transferDetails);

          // User command bubble
          const userMsg: PurchaseChatMessage = {
            id: `user-pick-${Date.now()}`,
            sender: "user",
            timestamp: userTime,
            text: `/buy ${pack.credits.toLocaleString()} Credits`,
          };

          // Bot reply bubble with bank details
          const botMsg: PurchaseChatMessage = {
            id: `bot-bank-${Date.now()}`,
            sender: "assistant",
            timestamp: botTime,
            text: `Please transfer exactly **₦${pack.priceNaira.toLocaleString("en-NG")}** to the account below:\n\n⚠️ **Important**: Put reference **${ref}** in your transfer narration.`,
            bankDetails: transferDetails,
            actionPills: [
              {
                id: "btn-copy-acc",
                label: `Moniepoint: ${DEFAULT_BANK_DETAILS.accountNumber}`,
                action: "copy-account",
                variant: "secondary",
              },
              {
                id: "btn-copy-ref",
                label: `Reference: ${ref}`,
                action: "copy-ref",
                variant: "secondary",
              },
              {
                id: "btn-paid",
                label: "I Have Paid",
                action: "report-paid",
                variant: "brand",
              },
              {
                id: "btn-change",
                label: "Change Pack",
                action: "reset-pack",
                variant: "secondary",
              },
            ],
          };

          setMessages((prev) => [...prev, userMsg, botMsg]);
          break;
        }

        case "reset-pack": {
          setSelectedPack(null);
          setActiveTransfer(null);

          const userMsg: PurchaseChatMessage = {
            id: `user-reset-${Date.now()}`,
            sender: "user",
            timestamp: userTime,
            text: "/packages",
          };

          const botMsg: PurchaseChatMessage = {
            id: `bot-reset-${Date.now()}`,
            sender: "assistant",
            timestamp: botTime,
            text: "Please select a Study Credits package below to add to your account:",
            actionPills: CREDIT_PACKS.map((p) => ({
              id: `rep-${p.id}-${Date.now()}`,
              label: p.label,
              action: "select-pack",
              packId: p.id,
              variant: p.badge ? "brand" : "secondary",
            })),
          };

          setMessages((prev) => [...prev, userMsg, botMsg]);
          break;
        }

        case "report-paid": {
          const userMsg: PurchaseChatMessage = {
            id: `user-paid-${Date.now()}`,
            sender: "user",
            timestamp: userTime,
            text: "/confirm_payment",
          };

          const botMsg: PurchaseChatMessage = {
            id: `bot-prompt-proof-${Date.now()}`,
            sender: "assistant",
            timestamp: botTime,
            text: `Please attach a screenshot of your transfer receipt below to verify ref **${activeTransfer?.reference || "your payment"}**:\n\nOr click below to scan the settlement network now:`,
            actionPills: [
              {
                id: "btn-check-now",
                label: "Check Settlement Status Now ↗",
                action: "check-status",
                variant: "brand",
              },
              {
                id: "btn-change-pack",
                label: "Change Pack",
                action: "reset-pack",
                variant: "secondary",
              },
            ],
          };

          setMessages((prev) => [...prev, userMsg, botMsg]);
          break;
        }

        case "check-status": {
          const pack = selectedPack || CREDIT_PACKS[1];
          if (pack) {
            triggerVerification(pack, activeTransfer);
          }
          break;
        }

        case "done": {
          onBack();
          break;
        }

        case "close": {
          onClose();
          break;
        }
      }
    },
    [selectedPack, activeTransfer, copyToClipboard, triggerVerification, onBack, onClose]
  );

  // Re-open packages menu from bottom "≡ Menu" button
  const handleOpenPackages = useCallback(() => {
    const userTime = formatCurrentTime();
    const botTime = formatCurrentTime();

    const userMsg: PurchaseChatMessage = {
      id: `user-menu-${Date.now()}`,
      sender: "user",
      timestamp: userTime,
      text: "/menu",
    };

    const botMsg: PurchaseChatMessage = {
      id: `bot-menu-${Date.now()}`,
      sender: "assistant",
      timestamp: botTime,
      text: "Select a Study Credits package below to proceed with direct bank transfer:",
      actionPills: CREDIT_PACKS.map((p) => ({
        id: `menu-${p.id}-${Date.now()}`,
        label: p.label,
        action: "select-pack",
        packId: p.id,
        variant: p.badge ? "brand" : "secondary",
      })),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  }, []);

  // Send message / attach receipt from input bar
  const handleSendMessage = useCallback(
    (text: string, attachment?: ChatAttachment) => {
      const userTime = formatCurrentTime();

      const userMsg: PurchaseChatMessage = {
        id: `user-input-${Date.now()}`,
        sender: "user",
        timestamp: userTime,
        text: text || undefined,
        attachment: attachment || undefined,
      };

      setMessages((prev) => [...prev, userMsg]);

      // If user uploaded an image receipt, trigger auto-verification
      if (attachment) {
        const pack = selectedPack || CREDIT_PACKS[1];
        if (pack) {
          setTimeout(() => {
            triggerVerification(pack, activeTransfer);
          }, 800);
        }
        return;
      }

      // If text mentions packages or buy
      const lower = text.toLowerCase();
      if (lower.includes("package") || lower.includes("price") || lower.includes("menu")) {
        handleOpenPackages();
      } else if (lower.includes("paid") || lower.includes("done") || lower.includes("sent")) {
        const botTime = formatCurrentTime();
        const botMsg: PurchaseChatMessage = {
          id: `bot-reply-${Date.now()}`,
          sender: "assistant",
          timestamp: botTime,
          text: `Checking transfer for ref **${activeTransfer?.reference || "your transaction"}**:\n\nPlease confirm below:`,
          actionPills: [
            {
              id: "btn-check-now",
              label: "Check Settlement Status Now ↗",
              action: "check-status",
              variant: "brand",
            },
          ],
        };
        setTimeout(() => setMessages((prev) => [...prev, botMsg]), 600);
      }
    },
    [selectedPack, activeTransfer, triggerVerification, handleOpenPackages]
  );

  return (
    <div className="purchase-chat">
      {/* Telegram-Style App Bar (Header) */}
      <header className="telegram-bot-header">
        <div className="telegram-header-left">
          <button
            type="button"
            className="telegram-header-back-btn"
            onClick={onBack}
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>

          <div className="telegram-header-avatar" aria-hidden="true">
            <Coins size={18} />
          </div>

          <div className="telegram-header-title-wrap">
            <div className="telegram-header-title-row">
              <span className="telegram-header-title">Study Credits Bot</span>
              <CheckCircle2 size={14} className="telegram-verified-badge" aria-hidden="true" />
            </div>
            <span className="telegram-header-subtitle">bot</span>
          </div>
        </div>

        <div className="telegram-header-right">
          <span className="telegram-header-credits-pill">
            {currentCredits === null ? "Unlimited" : `${currentCredits.toLocaleString()} credits`}
          </span>

          <button
            type="button"
            className="telegram-header-action-btn telegram-header-close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="telegram-header-action-btn"
            aria-label="Options"
            title="Options"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Telegram Chat Canvas */}
      <div className="telegram-chat-canvas" role="log" aria-live="polite">
        <div className="telegram-chat-thread">
          {/* Centered Telegram Date Pill */}
          <div className="telegram-date-pill-wrap">
            <span className="telegram-date-pill">December 2</span>
          </div>

          {messages.map((msg) => {
            const isBot = msg.sender === "assistant";
            const isPackSelection = msg.actionPills?.some((p) => p.action === "select-pack");

            if (!isBot) {
              return (
                <div key={msg.id} className="telegram-msg-row is-user">
                  <div className="telegram-bubble-user">
                    {msg.attachment && (
                      <div className="telegram-receipt-attachment">
                        <button
                          type="button"
                          className="telegram-receipt-thumb"
                          onClick={() => setSelectedReceiptPreview(msg.attachment?.url ?? null)}
                          aria-label={`Preview ${msg.attachment.fileName}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.attachment.url}
                            alt={msg.attachment.fileName}
                            className="telegram-receipt-img"
                          />
                        </button>
                      </div>
                    )}
                    {msg.text && <span>{msg.text}</span>}
                    <span className="telegram-msg-meta">
                      {msg.timestamp}
                      <CheckCheck size={13} className="telegram-ticks" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="telegram-msg-row is-bot">
                {/* Bot Message Bubble */}
                <div className="telegram-bubble-bot">
                  {msg.text && (
                    <div>
                      {msg.text.split("\n\n").map((para, i) => (
                        <p key={i}>
                          {para.startsWith("🎉") ? (
                            <strong>{para}</strong>
                          ) : para.includes("**") ? (
                            para
                              .split("**")
                              .map((chunk, j) =>
                                j % 2 === 1 ? <strong key={j}>{chunk}</strong> : chunk
                              )
                          ) : (
                            para
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  {msg.verificationStatus === "verifying" && (
                    <div className="telegram-callout is-verifying">
                      <Loader2 size={13} className="telegram-spin" aria-hidden="true" />
                      <span>Scanning settlement network for incoming transfer…</span>
                    </div>
                  )}

                  {msg.verificationStatus === "confirmed" && (
                    <div className="telegram-callout is-confirmed">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      <span>Payment verified! Added to your balance.</span>
                    </div>
                  )}

                  <span className="telegram-msg-meta">{msg.timestamp}</span>
                </div>

                {/* Attached Telegram Inline Keyboards: Package Selection (1x3 Stack) */}
                {isPackSelection && msg.actionPills && (
                  <div
                    className="telegram-inline-keyboard"
                    role="group"
                    aria-label="Select package"
                  >
                    {msg.actionPills.map((pill) => {
                      const pack = CREDIT_PACKS.find((p) => p.id === pill.packId);
                      if (!pack) return null;

                      return (
                        <button
                          key={pill.id}
                          type="button"
                          className="telegram-btn is-package"
                          onClick={() => handlePillClick(pill)}
                        >
                          <div className="telegram-pkg-left">
                            <span className="telegram-pkg-name">
                              {pack.credits.toLocaleString()} Credits
                            </span>
                            {pack.badge && (
                              <span className="telegram-pkg-badge">
                                <Sparkles size={9} aria-hidden="true" />
                                {pack.badge}
                              </span>
                            )}
                          </div>
                          <span className="telegram-pkg-price">
                            ₦{pack.priceNaira.toLocaleString("en-NG")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Attached Telegram Inline Keyboards: Bank Transfer / Actions */}
                {!isPackSelection && msg.actionPills && msg.actionPills.length > 0 && (
                  <div className="telegram-inline-keyboard" role="group" aria-label="Actions">
                    {/* If we have copy buttons, display them full width */}
                    {msg.actionPills.find((p) => p.action === "copy-account") && (
                      <button
                        type="button"
                        className={`telegram-btn is-copy${copiedAccount ? " is-copied" : ""}`}
                        onClick={() =>
                          handlePillClick({
                            id: "acc",
                            label: "Account",
                            action: "copy-account",
                          })
                        }
                      >
                        <span className="telegram-copy-label">
                          {copiedAccount
                            ? "✓ Copied Account Number!"
                            : `Moniepoint MFB: ${msg.bankDetails?.accountNumber || DEFAULT_BANK_DETAILS.accountNumber}`}
                        </span>
                        <span className="telegram-copy-action">
                          {copiedAccount ? <Check size={12} /> : <Copy size={12} />}
                          {copiedAccount ? "Copied" : "Copy"}
                        </span>
                      </button>
                    )}

                    {msg.actionPills.find((p) => p.action === "copy-ref") && (
                      <button
                        type="button"
                        className={`telegram-btn is-copy${copiedRef ? " is-copied" : ""}`}
                        onClick={() =>
                          handlePillClick({
                            id: "ref",
                            label: "Ref",
                            action: "copy-ref",
                          })
                        }
                      >
                        <span className="telegram-copy-label">
                          {copiedRef
                            ? "✓ Copied Reference!"
                            : `Narration Ref: ${msg.bankDetails?.reference || activeTransfer?.reference || ""}`}
                        </span>
                        <span className="telegram-copy-action">
                          {copiedRef ? <Check size={12} /> : <Copy size={12} />}
                          {copiedRef ? "Copied" : "Copy"}
                        </span>
                      </button>
                    )}

                    {/* Split 2-column row for I Have Paid + Change Pack (Exact mirror of Subject: and Message: in Telegram inspo) */}
                    {msg.actionPills.some(
                      (p) => p.action === "report-paid" || p.action === "reset-pack"
                    ) && (
                      <div className="telegram-btn-row-2col">
                        {msg.actionPills.find((p) => p.action === "report-paid") && (
                          <button
                            type="button"
                            className="telegram-btn is-brand"
                            onClick={() =>
                              handlePillClick(
                                msg.actionPills!.find((p) => p.action === "report-paid")!
                              )
                            }
                          >
                            <Sparkles size={13} aria-hidden="true" />
                            <span>I Have Paid</span>
                          </button>
                        )}

                        {msg.actionPills.find((p) => p.action === "reset-pack") && (
                          <button
                            type="button"
                            className="telegram-btn"
                            onClick={() =>
                              handlePillClick(
                                msg.actionPills!.find((p) => p.action === "reset-pack")!
                              )
                            }
                          >
                            <RotateCcw size={13} aria-hidden="true" />
                            <span>Change Pack</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Check Status / Other Actions */}
                    {msg.actionPills.find((p) => p.action === "check-status") && (
                      <button
                        type="button"
                        className="telegram-btn is-brand"
                        onClick={() =>
                          handlePillClick(
                            msg.actionPills!.find((p) => p.action === "check-status")!
                          )
                        }
                      >
                        <span>Check Settlement Status Now ↗</span>
                      </button>
                    )}

                    {/* Done Action */}
                    {msg.actionPills.find((p) => p.action === "done") && (
                      <button
                        type="button"
                        className="telegram-btn is-brand"
                        onClick={() =>
                          handlePillClick(msg.actionPills!.find((p) => p.action === "done")!)
                        }
                      >
                        <span>Done (Back to Study)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Telegram-Style Bottom Composer Bar */}
      <PurchaseChatInput
        onSendMessage={handleSendMessage}
        onOpenPackages={handleOpenPackages}
        disabled={isVerifying}
      />

      {/* Fullscreen Receipt Image Lightbox Preview */}
      {selectedReceiptPreview && (
        <div
          className="purchase-lightbox-overlay"
          onClick={() => setSelectedReceiptPreview(null)}
          role="dialog"
          aria-label="Receipt preview"
        >
          <div className="purchase-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedReceiptPreview}
              alt="Transfer receipt full preview"
              className="purchase-lightbox-img"
            />
            <button
              type="button"
              className="purchase-lightbox-close"
              onClick={() => setSelectedReceiptPreview(null)}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
