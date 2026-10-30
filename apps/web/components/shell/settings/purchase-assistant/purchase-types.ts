export interface CreditPack {
  id: string;
  credits: number;
  priceNaira: number;
  label: string;
  badge?: string;
  description: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack-1000",
    credits: 1000,
    priceNaira: 1500,
    label: "1,000 Credits · ₦1,500",
    description: "Good for occasional drug interaction checks and monograph revision.",
  },
  {
    id: "pack-5000",
    credits: 5000,
    priceNaira: 5000,
    label: "5,000 Credits · ₦5,000",
    badge: "Most Popular",
    description: "Standard semester package for full-time pharmacy coursework and AI RAG.",
  },
  {
    id: "pack-15000",
    credits: 15000,
    priceNaira: 12000,
    label: "15,000 Credits · ₦12,000",
    badge: "Best Value",
    description: "Intensive exam prep, unlimited clinical scenario generation, and deep reading.",
  },
];

export interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountNaira: number;
  reference: string;
  expiresInMinutes: number;
}

export type ActionPillType =
  | "select-pack"
  | "report-paid"
  | "reset-pack"
  | "check-status"
  | "copy-account"
  | "copy-ref"
  | "done"
  | "close";

export interface ActionPill {
  id: string;
  label: string;
  action: ActionPillType;
  packId?: string;
  variant?: "primary" | "secondary" | "brand";
}

export interface ChatAttachment {
  url: string;
  fileName: string;
  fileSize?: string;
}

export type MessageSender = "assistant" | "user";

export interface PurchaseChatMessage {
  id: string;
  sender: MessageSender;
  timestamp: string;
  text?: string;
  bankDetails?: BankTransferDetails;
  attachment?: ChatAttachment;
  actionPills?: ActionPill[];
  verificationStatus?: "verifying" | "confirmed" | "error";
}
