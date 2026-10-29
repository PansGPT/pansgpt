"use client";

import { useState } from "react";
import { Coins, Plus } from "lucide-react";
import type { UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

export function AccountSection({
  preferences,
}: {
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
  onClose?: () => void;
}): React.ReactElement {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState("5000");

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Billing & Study Credits"
        description="Your institutional credit allocation and subsidy from the Faculty of Pharmaceutical Sciences."
      >
        <SettingsRow
          title="Study Credits balance"
          description="Used for clinical AI answers, deep monograph RAG, and chemical formula drawing."
        >
          <div className="settings-inline-action-group">
            <div className="settings-inline-stat">
              <Coins size={16} className="settings-credits-coin" aria-hidden="true" />
              <strong>
                {preferences.credits === null
                  ? "Unlimited (Pilot)"
                  : `${preferences.credits.toLocaleString()} credits`}
              </strong>
            </div>
            <button
              type="button"
              className="settings-button-manage"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                borderColor: "var(--border-brand)",
                color: "var(--fg-brand-primary-600)",
                fontWeight: 600,
              }}
              onClick={() => setTopUpOpen((open) => !open)}
            >
              <Plus size={14} /> Add credits
            </button>
          </div>
        </SettingsRow>

        {topUpOpen && (
          <SettingsRow
            title="Select credit pack"
            description="Secure local payment via Paystack or institutional coupon code."
          >
            <div className="settings-inline-action-group">
              <select
                className="settings-select"
                value={selectedPack}
                onChange={(e) => setSelectedPack(e.target.value)}
                aria-label="Credit pack"
              >
                <option value="1000">1,000 Credits · ₦1,500</option>
                <option value="5000">5,000 Credits · ₦5,000 (Popular)</option>
                <option value="15000">15,000 Credits · ₦12,000</option>
              </select>
              <button
                type="button"
                className="settings-button-manage"
                style={{
                  background: "var(--fg-brand-primary-600)",
                  color: "#ffffff",
                  border: "none",
                }}
                onClick={() => {
                  alert("Paystack checkout modal initialized for " + selectedPack + " credits.");
                }}
              >
                Top up
              </button>
            </div>
          </SettingsRow>
        )}

        <SettingsRow title="Plan tier" description="Subsidized undergraduate pharmacy license.">
          <span className="settings-value-pill">Institutional Pilot Access</span>
        </SettingsRow>

        <SettingsRow
          title="Billing cycle"
          description="Institutional semester license active through Academic Session 2026/2027."
        >
          <button type="button" className="settings-button-manage" disabled>
            Managed by Faculty
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
