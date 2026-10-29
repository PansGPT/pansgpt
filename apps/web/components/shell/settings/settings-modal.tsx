"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { X, ChevronLeft, Info } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import type { SettingsModalProps, SettingsSectionId } from "./settings-types";
import { SettingsNav } from "./settings-nav";
import { SettingsMenu } from "./settings-menu";
import { DeleteHistoryDialog } from "./delete-history-dialog";

import { ProfileSection } from "./sections/profile-section";
import { AppearanceSection } from "./sections/appearance-section";
import { NotificationsSection } from "./sections/notifications-section";
import { PrivacySection } from "./sections/privacy-section";
import { WellbeingSection } from "./sections/wellbeing-section";
import { DataStorageSection } from "./sections/data-storage-section";
import { AccountSection } from "./sections/account-section";
import { AboutSection } from "./sections/about-section";

import "./settings-modal.css";

const SECTION_TITLES: Record<SettingsSectionId, string> = {
  account: "Account",
  billing: "Billing & Credits",
  appearance: "Appearance",
  notifications: "Notifications",
  privacy: "Privacy & Data",
  wellbeing: "Study & Wellbeing",
  "data-storage": "Data & Storage",
  about: "About PansGPT",
};

export function SettingsModal({
  open,
  onOpenChange,
  profile,
  preferences,
  initialSection = "account",
  returnFocus,
}: SettingsModalProps): React.ReactElement {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState("");
  const [inMobileSection, setInMobileSection] = useState(false);
  const [deleteHistoryOpen, setDeleteHistoryOpen] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync initial section when opening
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setActiveSection(initialSection);
      setSearchQuery("");
      setInMobileSection(false);
    }
  }

  // Adjust viewport height for mobile keyboards
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const update = () => {
      dialogRef.current?.style.setProperty(
        "--chat-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`
      );
      dialogRef.current?.style.setProperty("--chat-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [open]);

  // Handle mobile swipe down on the drag handle / top bar
  const handleTouchStart = useRef<{ y: number; time: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const target = e.target as HTMLElement;
    if (target.closest(".settings-mobile-header-btn")) return;
    if (target.closest(".settings-modal-handle, .settings-mobile-header")) {
      handleTouchStart.current = { y: touch.clientY, time: performance.now() };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!handleTouchStart.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dy = touch.clientY - handleTouchStart.current.y;
    if (dy > 0 && dialogRef.current) {
      dialogRef.current.style.setProperty("--sheet-swipe-y", `${dy}px`);
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!handleTouchStart.current) return;
      const touch = e.changedTouches[0];
      const dy = touch ? touch.clientY - handleTouchStart.current.y : 0;
      handleTouchStart.current = null;
      if (dialogRef.current) {
        dialogRef.current.style.removeProperty("--sheet-swipe-y");
      }
      if (dy > 80) {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  const selectSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    setInMobileSection(true);
  };

  const renderActiveSection = (): ReactNode => {
    switch (activeSection) {
      case "account":
        return (
          <ProfileSection
            profile={profile}
            preferences={preferences}
            onClose={() => onOpenChange(false)}
          />
        );
      case "billing":
        return (
          <AccountSection
            profile={profile}
            preferences={preferences}
            onClose={() => onOpenChange(false)}
          />
        );
      case "appearance":
        return <AppearanceSection preferences={preferences} />;
      case "notifications":
        return <NotificationsSection />;
      case "privacy":
        return <PrivacySection />;
      case "wellbeing":
        return <WellbeingSection />;
      case "data-storage":
        return <DataStorageSection onRequestDeleteHistory={() => setDeleteHistoryOpen(true)} />;
      case "about":
        return <AboutSection />;
      default:
        return (
          <ProfileSection
            profile={profile}
            preferences={preferences}
            onClose={() => onOpenChange(false)}
          />
        );
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="settings-overlay" />
          <DialogPrimitive.Content
            ref={dialogRef}
            className="settings-modal-dialog"
            aria-describedby="settings-desc"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onCloseAutoFocus={(event) => {
              if (returnFocus) {
                event.preventDefault();
                returnFocus();
              }
            }}
            onEscapeKeyDown={(e) => {
              if (inMobileSection) {
                e.preventDefault();
                setInMobileSection(false);
              }
            }}
          >
            <DialogPrimitive.Title className="p-sr-only">Settings</DialogPrimitive.Title>
            <DialogPrimitive.Description id="settings-desc" className="p-sr-only">
              Configure your study workspace, appearance, clinical AI, and account preferences.
            </DialogPrimitive.Description>

            {/* Mobile drag handle matching mobile-home-chat */}
            <button
              type="button"
              className="mobile-home-chat-handle settings-modal-handle"
              aria-label="Drag to dismiss settings"
              onClick={() => onOpenChange(false)}
            >
              <span />
            </button>

            {/* Desktop Header */}
            <header className="settings-modal-header">
              <h2 className="settings-modal-title">Settings</h2>
              <button
                type="button"
                className="settings-close-button"
                aria-label="Close settings"
                onClick={() => onOpenChange(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {/* Mobile Header (exact Claude iOS pattern from Images 1, 2, 3) */}
            <header className="settings-mobile-header">
              {inMobileSection ? (
                <button
                  type="button"
                  className="settings-mobile-header-btn"
                  aria-label="Back to settings menu"
                  onClick={() => setInMobileSection(false)}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="settings-mobile-header-btn"
                  aria-label="Close settings"
                  onClick={() => onOpenChange(false)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}

              <h2 className="settings-mobile-title">
                {inMobileSection ? SECTION_TITLES[activeSection] : "Settings"}
              </h2>

              {inMobileSection ? (
                <div className="settings-mobile-header-spacer" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="settings-mobile-header-btn"
                  aria-label="About PansGPT"
                  onClick={() => {
                    setActiveSection("about");
                    setInMobileSection(true);
                  }}
                >
                  <Info size={18} aria-hidden="true" />
                </button>
              )}
            </header>

            {/* Body */}
            <div className="settings-modal-body">
              {/* Desktop Left Rail Navigation */}
              <SettingsNav
                activeSection={activeSection}
                onSelectSection={setActiveSection}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {/* Mobile Sliding Views (Menu vs Active Section) / Desktop Content Pane */}
              <div className="settings-mobile-views" data-in-section={inMobileSection}>
                {/* Mobile Menu List (left pane of the track) */}
                <div className="settings-mobile-menu-pane">
                  <SettingsMenu
                    profile={profile}
                    preferences={preferences}
                    onSelectSection={selectSection}
                    onClose={() => onOpenChange(false)}
                  />
                </div>

                {/* Right content pane: active section */}
                <div className="settings-content-pane">{renderActiveSection()}</div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Delete conversation history confirmation dialog on top */}
      <DeleteHistoryDialog
        open={deleteHistoryOpen}
        onOpenChange={setDeleteHistoryOpen}
        onConfirm={() => {
          // Trigger custom event so any active chat sessions can clear
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("pansgpt-chats-cleared"));
          }
        }}
      />
    </>
  );
}
