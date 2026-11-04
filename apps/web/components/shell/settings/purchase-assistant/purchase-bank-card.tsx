"use client";

import { useState, useCallback } from "react";
import { Building2, Copy, Check, ShieldCheck } from "lucide-react";
import type { BankTransferDetails } from "./purchase-types";

export function PurchaseBankCard({
  details,
  onCopyAccount,
}: {
  details: BankTransferDetails;
  onCopyAccount?: () => void;
}): React.ReactElement {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string, type: "account" | "ref") => {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
        } else {
          const el = document.createElement("textarea");
          el.value = text;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        }

        if (type === "account") {
          setCopiedAccount(true);
          onCopyAccount?.();
          setTimeout(() => setCopiedAccount(false), 2000);
        } else {
          setCopiedRef(true);
          setTimeout(() => setCopiedRef(false), 2000);
        }
      } catch {
        // Fallback or ignore
      }
    },
    [onCopyAccount]
  );

  return (
    <div className="purchase-bank-card">
      <div className="purchase-bank-card-header">
        <div className="purchase-bank-brand">
          <Building2 size={15} className="purchase-bank-icon" aria-hidden="true" />
          <span className="purchase-bank-name">{details.bankName}</span>
        </div>
        <span className="purchase-bank-badge">
          <ShieldCheck size={11} aria-hidden="true" /> Direct Bank Transfer
        </span>
      </div>

      <div className="purchase-bank-details-grid">
        {/* Account Number */}
        <div className="purchase-bank-field">
          <span className="purchase-bank-label">Account Number</span>
          <div className="purchase-bank-value-row">
            <span className="purchase-bank-number">{details.accountNumber}</span>
            <button
              type="button"
              className={`purchase-copy-btn${copiedAccount ? " is-copied" : ""}`}
              onClick={() => copyToClipboard(details.accountNumber, "account")}
              aria-label={copiedAccount ? "Account number copied" : "Copy account number"}
            >
              {copiedAccount ? (
                <>
                  <Check size={12} aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Account Name */}
        <div className="purchase-bank-field">
          <span className="purchase-bank-label">Account Name</span>
          <span className="purchase-bank-text">{details.accountName}</span>
        </div>

        {/* Amount */}
        <div className="purchase-bank-field">
          <span className="purchase-bank-label">Amount to Pay</span>
          <span className="purchase-bank-amount">
            ₦{details.amountNaira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Reference */}
        <div className="purchase-bank-field">
          <span className="purchase-bank-label">Payment Reference</span>
          <div className="purchase-bank-value-row">
            <span className="purchase-bank-ref">{details.reference}</span>
            <button
              type="button"
              className={`purchase-copy-btn-sm${copiedRef ? " is-copied" : ""}`}
              onClick={() => copyToClipboard(details.reference, "ref")}
              aria-label={copiedRef ? "Reference copied" : "Copy reference"}
            >
              {copiedRef ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>

      <div className="purchase-bank-footer-tip">
        <span>
          💡 Use your mobile banking app (OPay, Kuda, GTB, Zenith, PalmPay, etc.) to complete this
          transfer.
        </span>
      </div>
    </div>
  );
}
