"use client";
import { useState, useRef, useEffect, useId, useSyncExternalStore, type ReactNode } from "react";
import { X, ChevronLeft, Info } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import type { SettingsModalProps, SettingsSectionId, SettingsDraft } from "./settings-types";
import { SettingsNav } from "./settings-nav";
import type { SettingsSearchField } from "./settings-search";
import { SettingsMenu } from "./settings-menu";
import { SecuritySection } from "./sections/security-section";
import { ProfileSection } from "./sections/profile-section";
import { AppearanceSection } from "./sections/appearance-section";
import { AiChatSection } from "./sections/ai-chat-section";
import { NotificationsSection } from "./sections/notifications-section";
import { WellbeingSection } from "./sections/wellbeing-section";
import { PrivacySection } from "./sections/privacy-section";
import { CreditsSection } from "./sections/account-section";
import { DataStorageSection } from "./sections/data-storage-section";
import { AboutSection } from "./sections/about-section";
import "./settings-modal.css";

const TITLES: Record<SettingsSectionId, string> = {
  account: "Account",
  security: "Security",
  billing: "Credits",
  appearance: "Appearance",
  notifications: "Notifications",
  privacy: "Privacy & Data",
  wellbeing: "Study & Wellbeing",
  "data-storage": "Data & Storage",
  about: "About PansGPT",
};
function subscribeViewport(notify: () => void): () => void {
  const query = window.matchMedia("(max-width: 860px)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
const mobileViewport = (): boolean => window.matchMedia("(max-width: 860px)").matches;
function initialDraft(profile: SettingsModalProps["profile"]): SettingsDraft {
  return {
    fullName: [profile.first_name, profile.last_name].filter(Boolean).join(" "),
    academicLevel: profile.current_level ?? "",
    interfaceFont: "default",
    responseFont: "sans",
    motion: "system",
    responseStyle: "balanced",
    replies: true,
    generatedFiles: true,
    courseUpdates: true,
    studyReminders: false,
    studyBreaks: false,
    nightStudy: false,
  };
}

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
  const [searchSelection, setSearchSelection] = useState<SettingsSearchField | null>(null);
  const [inMobileSection, setInMobileSection] = useState(initialSection !== "account");
  const [prevOpen, setPrevOpen] = useState(open);
  const [draft, setDraft] = useState(() => initialDraft(profile));
  const mobile = useSyncExternalStore(subscribeViewport, mobileViewport, () => false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const menuOpener = useRef<HTMLElement | null>(null);
  const descriptionId = useId();
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setActiveSection(initialSection);
      setSearchQuery("");
      setSearchSelection(null);
      setInMobileSection(initialSection !== "account");
      setDraft(initialDraft(profile));
    }
  }
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const update = () => {
      dialogRef.current?.style.setProperty(
        "--settings-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`
      );
      dialogRef.current?.style.setProperty(
        "--settings-viewport-top",
        `${viewport?.offsetTop ?? 0}px`
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [open]);
  useEffect(() => {
    if (!open || searchSelection?.section !== activeSection) return;
    const pane = contentRef.current;
    const target = Array.from(
      pane?.querySelectorAll<HTMLElement>("[data-settings-label]") ?? []
    ).find((element) => element.dataset.settingsLabel === searchSelection.target);
    if (!target) return;
    target.dataset.settingsMatch = "";
    target.scrollIntoView({ block: "nearest" });
    const control = target.querySelector<HTMLElement>(
      "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]"
    );
    (control ?? (target.matches(":disabled") ? pane : target))?.focus({ preventScroll: true });
    return () => {
      delete target.dataset.settingsMatch;
    };
  }, [open, activeSection, searchSelection]);
  function selectSection(id: SettingsSectionId): void {
    setSearchSelection(null);
    menuOpener.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveSection(id);
    setInMobileSection(true);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }
  function backToMenu(): void {
    setInMobileSection(false);
    requestAnimationFrame(() => menuOpener.current?.focus({ preventScroll: true }));
  }
  function resetSwipe(): void {
    touchOrigin.current = null;
    dialogRef.current?.style.removeProperty("--settings-swipe-y");
  }
  const draftProps = {
    draft,
    onDraftChange: (patch: Partial<SettingsDraft>) =>
      setDraft((current) => ({ ...current, ...patch })),
  };
  let content: ReactNode;
  switch (activeSection) {
    case "account":
      content = <ProfileSection profile={profile} preferences={preferences} {...draftProps} />;
      break;
    case "security":
      content = <SecuritySection />;
      break;
    case "appearance":
      content = <AppearanceSection preferences={preferences} {...draftProps} />;
      break;
    case "wellbeing":
      content = (
        <div className="settings-section-container">
          <AiChatSection {...draftProps} />
          <WellbeingSection {...draftProps} />
        </div>
      );
      break;
    case "billing":
      content = <CreditsSection preferences={preferences} />;
      break;
    case "notifications":
      content = (
        <div className="settings-section-container">
          <NotificationsSection {...draftProps} />
        </div>
      );
      break;
    case "data-storage":
      content = <DataStorageSection />;
      break;
    case "privacy":
      content = <PrivacySection />;
      break;
    case "about":
      content = <AboutSection />;
      break;
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-overlay" />
        <DialogPrimitive.Content
          ref={dialogRef}
          className="settings-modal-dialog"
          aria-describedby={descriptionId}
          onCloseAutoFocus={(event) => {
            if (returnFocus) {
              event.preventDefault();
              returnFocus();
            }
          }}
          onEscapeKeyDown={(event) => {
            // Radix observes Escape before the input's React key handler.
            if (
              event.target instanceof Element &&
              event.target.matches('.settings-nav-search[aria-expanded="true"]')
            ) {
              event.preventDefault();
              return;
            }
            if (mobile && inMobileSection) {
              event.preventDefault();
              backToMenu();
            }
          }}
          onTouchStart={(event) => {
            if (!mobile || event.touches.length !== 1 || !(event.target instanceof Element)) return;
            if (event.target.closest("button")) {
              if (!event.target.closest(".settings-modal-handle")) return;
            }
            if (!event.target.closest(".settings-modal-handle, .settings-mobile-header")) return;
            const point = event.touches[0];
            if (point) touchOrigin.current = { x: point.clientX, y: point.clientY };
          }}
          onTouchMove={(event) => {
            const origin = touchOrigin.current,
              point = event.touches[0];
            if (!origin || !point) return;
            const dy = point.clientY - origin.y;
            if (event.touches.length !== 1 || dy < 0 || Math.abs(point.clientX - origin.x) > dy) {
              resetSwipe();
              return;
            }
            dialogRef.current?.style.setProperty("--settings-swipe-y", `${Math.min(220, dy)}px`);
          }}
          onTouchEnd={(event) => {
            const origin = touchOrigin.current,
              point = event.changedTouches[0];
            const dismiss = origin && point && point.clientY - origin.y > 80;
            resetSwipe();
            if (dismiss) onOpenChange(false);
          }}
          onTouchCancel={resetSwipe}
        >
          <DialogPrimitive.Title className="p-sr-only">Settings</DialogPrimitive.Title>
          <DialogPrimitive.Description id={descriptionId} className="p-sr-only">
            Your account, appearance and study preferences.
          </DialogPrimitive.Description>
          <button
            type="button"
            className="settings-modal-handle"
            aria-label="Dismiss settings"
            onClick={() => onOpenChange(false)}
          >
            <span />
          </button>
          <header className="settings-modal-header">
            <h2>Settings</h2>
            <button
              type="button"
              className="settings-close-button"
              aria-label="Close settings"
              onClick={() => onOpenChange(false)}
            >
              <X size={18} />
            </button>
          </header>
          <header className="settings-mobile-header">
            <button
              type="button"
              className="settings-mobile-header-btn"
              aria-label={inMobileSection ? "Back to settings menu" : "Close settings"}
              onClick={() => (inMobileSection ? backToMenu() : onOpenChange(false))}
            >
              {inMobileSection ? <ChevronLeft size={21} /> : <X size={18} />}
            </button>
            <h2 ref={titleRef} tabIndex={-1} hidden={!inMobileSection}>
              {TITLES[activeSection]}
            </h2>
            {inMobileSection ? (
              <span className="settings-mobile-header-spacer" />
            ) : (
              <button
                type="button"
                className="settings-mobile-header-btn"
                aria-label="About PansGPT"
                onClick={() => selectSection("about")}
              >
                <Info size={18} />
              </button>
            )}
          </header>
          <div className="settings-modal-body">
            <SettingsNav
              activeSection={activeSection}
              onSelectSection={(id) => {
                setSearchSelection(null);
                setActiveSection(id);
                if (contentRef.current) contentRef.current.scrollTop = 0;
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectField={(field) => {
                setActiveSection(field.section);
                setInMobileSection(true);
                setSearchSelection({ ...field });
              }}
            />
            <div className="settings-mobile-views" data-in-section={inMobileSection}>
              <div
                className="settings-mobile-menu-pane"
                inert={mobile && inMobileSection}
                aria-hidden={mobile && inMobileSection ? true : undefined}
              >
                <SettingsMenu
                  profile={profile}
                  preferences={preferences}
                  onSelectSection={selectSection}
                  onClose={() => onOpenChange(false)}
                />
              </div>
              <div
                ref={contentRef}
                className="settings-content-pane"
                tabIndex={-1}
                inert={mobile && !inMobileSection}
                aria-hidden={mobile && !inMobileSection ? true : undefined}
              >
                <div className="settings-content-heading">
                  <h2>{TITLES[activeSection]}</h2>
                </div>
                {content}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
