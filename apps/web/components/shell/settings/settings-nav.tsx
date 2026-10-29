"use client";

import { useId } from "react";
import {
  User,
  CreditCard,
  Palette,
  Bell,
  Shield,
  Moon,
  HardDrive,
  Info,
  Search,
} from "lucide-react";
import type { SettingsNavGroup, SettingsSectionId } from "./settings-types";

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      { id: "account", label: "Account", icon: <User size={18} /> },
      { id: "billing", label: "Billing & Credits", icon: <CreditCard size={18} /> },
    ],
  },
  {
    label: "Preferences",
    items: [
      { id: "appearance", label: "Appearance", icon: <Palette size={18} /> },
      { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
      { id: "privacy", label: "Privacy & Data", icon: <Shield size={18} /> },
      { id: "wellbeing", label: "Study & Wellbeing", icon: <Moon size={18} /> },
    ],
  },
  {
    label: "System",
    items: [
      { id: "data-storage", label: "Data & Storage", icon: <HardDrive size={18} /> },
      { id: "about", label: "About PansGPT", icon: <Info size={18} /> },
    ],
  },
];

export function SettingsNav({
  activeSection,
  onSelectSection,
  searchQuery,
  onSearchChange,
}: {
  activeSection: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}): React.ReactElement {
  const searchId = useId();

  const query = searchQuery.trim().toLowerCase();

  const filteredGroups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (query ? item.label.toLowerCase().includes(query) : true)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="settings-nav" aria-label="Settings navigation">
      <div className="settings-nav-search-wrap">
        <label htmlFor={searchId} className="settings-nav-search-label">
          <Search size={15} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="settings-nav-search"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="settings-nav-scroll">
        {filteredGroups.map((group, groupIndex) => (
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
                      onClick={() => onSelectSection(item.id)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="settings-nav-item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="settings-nav-item-label">{item.label}</span>
                      {item.badge && <span className="settings-nav-item-badge">{item.badge}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {groupIndex < filteredGroups.length - 1 && (
              <div className="settings-nav-divider" role="separator" />
            )}
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <div className="settings-nav-empty">No settings found.</div>
        )}
      </div>
    </nav>
  );
}
