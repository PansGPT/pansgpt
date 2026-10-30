"use client";

import { useId, useRef, useState } from "react";
import {
  User,
  LockKeyhole,
  Coins,
  Palette,
  Bell,
  Shield,
  Moon,
  HardDrive,
  Info,
  Search,
} from "lucide-react";
import type { SettingsNavGroup, SettingsSectionId } from "./settings-types";
import { SETTINGS_SEARCH_FIELDS, type SettingsSearchField } from "./settings-search";

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      {
        id: "account",
        label: "Account",
        icon: <User size={18} />,
        keywords: "profile name email university academic level",
      },
      {
        id: "security",
        label: "Security",
        icon: <LockKeyhole size={18} />,
        keywords: "password sign in login security devices sessions",
      },
      {
        id: "billing",
        label: "Credits",
        icon: <Coins size={18} />,
        keywords: "balance usage payments purchases",
      },
    ],
  },
  {
    label: "Preferences",
    items: [
      {
        id: "appearance",
        label: "Appearance",
        icon: <Palette size={18} />,
        keywords: "theme light dark sepia font text motion animation",
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: <Bell size={18} />,
        keywords: "replies generated files reminders course updates",
      },
      {
        id: "privacy",
        label: "Privacy & Data",
        icon: <Shield size={18} />,
        keywords: "export archive deleted conversations files policy",
      },
      {
        id: "wellbeing",
        label: "Study & Wellbeing",
        icon: <Moon size={18} />,
        keywords: "chat response detail concise balanced detailed focus breaks late night",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        id: "data-storage",
        label: "Data & Storage",
        icon: <HardDrive size={18} />,
        keywords: "cache offline clear delete history",
      },
      {
        id: "about",
        label: "About PansGPT",
        icon: <Info size={18} />,
        keywords: "help support feedback bug shortcuts guide terms version",
      },
    ],
  },
];

export function SettingsNav({
  activeSection,
  onSelectSection,
  searchQuery,
  onSearchChange,
  onSelectField,
}: {
  activeSection: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectField: (field: SettingsSearchField) => void;
}): React.ReactElement {
  const searchId = useId();
  const resultsId = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = searchQuery.trim().toLowerCase();
  const sections = SETTINGS_GROUPS.flatMap((group) => group.items);
  const words = query.split(/\s+/);
  const results = query
    ? SETTINGS_SEARCH_FIELDS.filter((field) => {
        const section = sections.find((item) => item.id === field.section);
        const text = `${section?.label ?? ""} ${field.label} ${field.keywords}`.toLowerCase();
        return words.every((word) => text.includes(word));
      })
    : [];
  const expanded = searchOpen && Boolean(query);
  const selectedIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
  function choose(field: SettingsSearchField): void {
    setSearchOpen(false);
    onSearchChange("");
    onSelectField(field);
  }

  return (
    <nav className="settings-nav" aria-label="Settings navigation">
      <div
        className="settings-nav-search-wrap"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
        }}
      >
        <label htmlFor={searchId} className="settings-nav-search-label">
          <Search size={15} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? resultsId : undefined}
            aria-activedescendant={
              expanded && results.length ? `${resultsId}-${selectedIndex}` : undefined
            }
            value={searchQuery}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setActiveIndex(0);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Escape" && expanded) {
                event.preventDefault();
                event.stopPropagation();
                setSearchOpen(false);
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setSearchOpen(true);
                if (!results.length) return;
                const next = expanded
                  ? (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) %
                    results.length
                  : event.key === "ArrowDown"
                    ? 0
                    : results.length - 1;
                setActiveIndex(next);
                resultsRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
              } else if (event.key === "Enter" && expanded) {
                event.preventDefault();
                const field = results[selectedIndex];
                if (field) choose(field);
              }
            }}
            placeholder="Search settings"
            aria-label="Search settings"
            className="settings-nav-search"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {expanded && (
          <div className="settings-search-popup">
            <div
              ref={resultsRef}
              id={resultsId}
              role="listbox"
              aria-label="Matching settings"
              className="settings-search-results"
            >
              {results.map((field, index) => {
                const section = sections.find((item) => item.id === field.section);
                return (
                  <div
                    key={`${field.section}-${field.target}`}
                    id={`${resultsId}-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className="settings-search-result"
                    onMouseDown={(event) => event.preventDefault()}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => choose(field)}
                  >
                    <span className="settings-search-result-icon" aria-hidden="true">
                      {section?.icon}
                    </span>
                    <span>
                      <strong>{section?.label}</strong>
                      <small>{field.label}</small>
                    </span>
                  </div>
                );
              })}
            </div>
            {!results.length && (
              <p className="settings-nav-empty" role="status">
                No matching settings.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="settings-nav-scroll">
        {SETTINGS_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="settings-nav-group">
            {group.label && <span className="settings-nav-group-title">{group.label}</span>}
            <ul className="settings-nav-list" role="list">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`settings-nav-item${isActive ? " is-active" : ""}`}
                      onClick={() => {
                        setSearchOpen(false);
                        onSearchChange("");
                        onSelectSection(item.id);
                      }}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="settings-nav-item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="settings-nav-item-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {groupIndex < SETTINGS_GROUPS.length - 1 && (
              <div className="settings-nav-divider" role="separator" />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
