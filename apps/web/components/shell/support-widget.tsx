"use client";

import { useState, useRef, useEffect } from "react";
import { BrandMark } from "@/components/auth/brand-art";
import {
  Home,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  Search,
  X,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  MoreHorizontal,
  ArrowUp,
  Maximize2,
  Minimize2,
  Download,
} from "lucide-react";

type SupportTab = "home" | "messages" | "help";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timeAgo: string;
  conversationNumber: string;
  messages: ChatMessage[];
}

// User requested removing all fake conversations
const INITIAL_CONVERSATIONS: Conversation[] = [];

interface HelpArticle {
  id: string;
  title: string;
  updated: string;
  summary: string;
  sections: { heading?: string; body: string }[];
}

interface HelpCollection {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  articles: HelpArticle[];
}

const COLLECTIONS: HelpCollection[] = [
  {
    id: "workspace",
    title: "PansGPT Study Workspace",
    description:
      "Everyday study chats, lecture slides, monograph uploading, and text snip-to-chat.",
    articleCount: 3,
    articles: [
      {
        id: "snip-to-chat",
        title: "How to snip monograph excerpts directly into study chats",
        updated: "3 days ago",
        summary:
          "Easily reference textbooks, drug guidelines, and lecture slides directly in your conversations with automatic page citations.",
        sections: [
          {
            heading: "Selecting Text in the PDF Reader",
            body: "Open any monograph from your faculty Library. Highlight the desired clinical table or paragraph. A floating toolbar will appear with color highlight options and a 'Snip to chat' button.",
          },
          {
            heading: "Automatic Source Attribution",
            body: "Clicking 'Snip to chat' appends the exact quote and page reference into your message draft. When the AI responds, it anchors its clinical reasoning to that specific cited excerpt.",
          },
        ],
      },
      {
        id: "slide-conversion",
        title: "Converting PowerPoint lecture slides into high-yield study notes",
        updated: "1 week ago",
        summary: "Transform dense multi-page slide decks into concise, exam-ready pharmacy notes.",
        sections: [
          {
            heading: "Upload & Parsing",
            body: "Upload your faculty .pptx slide deck in the Library. PansGPT parses drug mechanism diagrams, formulation tables, and lecturer bullet points automatically.",
          },
          {
            heading: "Generating Study Outlines",
            body: "Once converted, use 'Generate Study Guide' to produce key concept lists, active-recall flashcard summaries, and clinical pearls.",
          },
        ],
      },
      {
        id: "offline-cache",
        title: "Using PansGPT offline in low-bandwidth campus areas",
        updated: "2 weeks ago",
        summary: "Keep reviewing monographs and drafting questions even when campus Wi-Fi drops.",
        sections: [
          {
            heading: "ServiceWorker Outbox Sync",
            body: "PansGPT caches active monograph chapters and notes directly in your browser's IndexedDB storage. Any messages or notes created offline are held in the sync queue.",
          },
          {
            heading: "Automatic Background Reconnect",
            body: "As soon as your network connection returns, all queued requests are delivered to the server without losing progress.",
          },
        ],
      },
    ],
  },
  {
    id: "calculators",
    title: "Clinical Calculators & Pharmacy Skills",
    description:
      "Pediatric dosage calculations, Cockcroft-Gault CrCl adjustments, and drug clash alerts.",
    articleCount: 2,
    articles: [
      {
        id: "dosage-calc",
        title: "How to trigger the Pediatric & Weight-Based Dosage Calculator",
        updated: "4 days ago",
        summary:
          "Run verified pharmaceutical calculations with unit conversions and standard dosing safety limits.",
        sections: [
          {
            heading: "Query Format",
            body: "In any chat, provide patient weight or age along with the drug (e.g., 'Calculate pediatric paracetamol syrup for an 11kg toddler with fever, 15 mg/kg/dose Q6H').",
          },
          {
            heading: "Safety Boundary Checks",
            body: "The dosage engine flags maximum single doses, maximum daily limits, and recommends age-appropriate liquid oral formulations.",
          },
        ],
      },
      {
        id: "drug-interactions",
        title: "Checking severe Drug-Drug interactions and CYP450 clashes",
        updated: "1 week ago",
        summary: "Screen polypharmacy regimens for pharmacokinetic and pharmacodynamic clashes.",
        sections: [
          {
            heading: "Interaction Matrix",
            body: "Ask PansGPT to screen two or more medications (e.g., 'Check interaction between clarithromycin and simvastatin').",
          },
          {
            heading: "Mechanistic Breakdown",
            body: "The engine details specific enzyme inhibition (e.g. CYP3A4 blockade), clinical risks (e.g. rhabdomyolysis), and recommended monitoring or alternative agents.",
          },
        ],
      },
    ],
  },
  {
    id: "quizzes",
    title: "Practice Quizzes & Examination Prep",
    description:
      "Generate university-level multiple-choice and short-answer clinical quizzes with step-by-step rationales.",
    articleCount: 1,
    articles: [
      {
        id: "create-quiz",
        title: "How to generate a custom quiz from your course library",
        updated: "5 days ago",
        summary:
          "Practice past exam questions, pharmacokinetics drills, and medicinal chemistry mechanisms.",
        sections: [
          {
            heading: "Starting a Quiz",
            body: "Go to the Quiz section in the navigation menu. Select the relevant lecture slide or textbook chapter, set the question count, and click 'Generate Quiz'.",
          },
          {
            heading: "Authoritative Scoring & Review",
            body: "After submitting your answers, PansGPT grades your response question-by-question, providing complete textbook rationales for why options are correct or contraindicated.",
          },
        ],
      },
    ],
  },
  {
    id: "devices",
    title: "Mobile Apps & Offline PWA",
    description: "Installing the Android APK, Windows installer, and Safari iOS Home Screen app.",
    articleCount: 1,
    articles: [
      {
        id: "install-guide",
        title: "Installing PansGPT on Android, iOS, and Desktop",
        updated: "1 week ago",
        summary: "Enjoy a distraction-free, full-screen study environment on mobile and desktop.",
        sections: [
          {
            heading: "Android & Windows",
            body: "Open the account menu at the bottom-left of the workspace and click 'Download apps'. Download the direct APK for Android or the desktop installer for Windows.",
          },
          {
            heading: "iOS Home Screen Setup",
            body: "On iPhone or iPad, open Safari to pansgpt.com, tap the Share icon, and select 'Add to Home Screen' for the standalone PWA experience.",
          },
        ],
      },
    ],
  },
];

export function SupportWidget({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<SupportTab>("home");
  const [subView, setSubView] = useState<"status" | null>(null);

  // Expanded Window State
  const [isExpanded, setIsExpanded] = useState(false);

  // Messages State
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [conversationSearchQuery, setConversationSearchQuery] = useState("");
  const [isSearchingConversation, setIsSearchingConversation] = useState(false);

  // Help State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<HelpCollection | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "yes" | "no">>({});

  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreMenu]);

  if (!open) return null;

  const currentConversation = conversations.find((c) => c.id === activeConversationId);

  function handleSendChatMessage(e: React.FormEvent): void {
    e.preventDefault();
    if (!chatInputText.trim() || !activeConversationId) return;

    const userText = chatInputText.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: "Just now",
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            lastMessage: userText,
            timeAgo: "Just now",
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      })
    );

    setChatInputText("");

    // Automated support reply
    setTimeout(() => {
      const botReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: "bot",
        text: "Thank you for the additional information. Our support team has logged this ticket and will investigate immediately.",
        timestamp: "Just now",
      };

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              lastMessage: botReply.text,
              timeAgo: "Just now",
              messages: [...conv.messages, botReply],
            };
          }
          return conv;
        })
      );
    }, 600);
  }

  function startNewConversation(): void {
    const newId = `conv-${Date.now()}`;
    const randomDigits = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const newConv: Conversation = {
      id: newId,
      title: "New Support Inquiry",
      lastMessage: "Thanks for accepting. What can I help you with today?",
      timeAgo: "Just now",
      conversationNumber: randomDigits,
      messages: [],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
  }

  function handleDownloadTranscript(): void {
    if (!currentConversation) return;
    const lines = [
      `PansGPT Support Transcript`,
      `Conversation ID: ${currentConversation.conversationNumber}`,
      `Title: ${currentConversation.title}`,
      `Date: ${new Date().toLocaleString()}`,
      `----------------------------------------`,
      `Bot: Please provide details on how we can assist you. To ensure we can investigate this thoroughly, could you share the following in your response:`,
      `• A description of the current experience and any steps to reproduce it`,
      `• Any error messages (screenshots are helpful too!)`,
      `• Email addresses of the impacted members`,
      `• Organization ID or plan this request is associated with`,
      `• Browser, PansGPT product (Web, Android, Desktop), device, and OS`,
      `• When the issue started and whether it's happening consistently or intermittently`,
      `Bot: Thanks for accepting. What can I help you with today?`,
      ...currentConversation.messages.map(
        (m) => `${m.sender === "user" ? "User" : "PansGPT AI Assistant"}: ${m.text}`
      ),
    ];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pansgpt-transcript-${currentConversation.conversationNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMoreMenu(false);
  }

  // Filter articles across collections when searching
  const searchResults: { collection: HelpCollection; article: HelpArticle }[] = [];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    COLLECTIONS.forEach((col) => {
      col.articles.forEach((art) => {
        if (
          art.title.toLowerCase().includes(q) ||
          art.summary.toLowerCase().includes(q) ||
          art.sections.some((s) => s.body.toLowerCase().includes(q))
        ) {
          searchResults.push({ collection: col, article: art });
        }
      });
    });
  }

  const isLiveChatOpen = activeConversationId !== null && !!currentConversation;

  return (
    <aside
      aria-label="PansGPT Support"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: isExpanded ? "min(680px, calc(100vw - 32px))" : "384px",
        maxWidth: "calc(100vw - 32px)",
        height: isExpanded ? "min(720px, calc(100vh - 48px))" : "min(640px, calc(100vh - 48px))",
        background: "var(--bg-secondary, #18181b)",
        border: "1px solid var(--border-secondary, #27272a)",
        borderRadius: "16px",
        boxShadow: "0 20px 48px -8px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.2)",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        color: "var(--text-primary-900, #f4f4f5)",
        transition: "width 0.2s ease, height 0.2s ease",
      }}
    >
      {/* ============================================================ */}
      {/* SUB-VIEW: WHITE STATUS PAGE WITH STICKY DARK HEADER          */}
      {/* (Matching user's Image 2 & specification)                     */}
      {/* ============================================================ */}
      {subView === "status" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#faf9f6",
          }}
        >
          {/* Sticky Dark Colored Header (Does not scroll with page) */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              height: "48px",
              background: "#18181b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: "1px solid #27272a",
              flex: "none",
            }}
          >
            <button
              type="button"
              onClick={() => setSubView(null)}
              aria-label="Back"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                color: "#f4f4f5",
                borderRadius: "6px",
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSubView(null);
                onOpenChange(false);
              }}
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                color: "#f4f4f5",
                borderRadius: "6px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable White Body for PansGPT Status */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 20px 32px",
              color: "#18181b",
              scrollbarWidth: "thin",
            }}
          >
            {/* Title & Brand Logo */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "26px",
                    color: "var(--fg-brand-primary-600, #10b981)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <BrandMark />
                </div>
                <h3
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    margin: 0,
                    color: "#18181b",
                    letterSpacing: "-0.02em",
                  }}
                >
                  PansGPT Status
                </h3>
              </div>
            </div>

            {/* Big Green Banner */}
            <div
              style={{
                background: "#689f38",
                color: "#ffffff",
                padding: "14px 16px",
                borderRadius: "4px",
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "20px",
              }}
            >
              All Systems Operational
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: "12px",
                color: "#52525b",
                textAlign: "center",
                marginBottom: "14px",
              }}
            >
              Uptime over the past 30 days.{" "}
              <strong style={{ color: "#18181b", cursor: "pointer" }}>
                View historical uptime.
              </strong>
            </div>

            {/* Component Status Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { name: "pansgpt.com (Web App)", uptime: "99.95 %", amberIndex: -1 },
                { name: "Clinical AI Engine (Gemma 4 & Groq)", uptime: "99.90 %", amberIndex: 14 },
                { name: "Monograph Ingestion & PDF Parser", uptime: "99.88 %", amberIndex: 21 },
                { name: "Vector Retrieval & Database", uptime: "100 %", amberIndex: -1 },
              ].map((service, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e4e4e7",
                    borderRadius: "6px",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <strong style={{ fontSize: "13px", color: "#18181b" }}>{service.name}</strong>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>
                      Operational
                    </span>
                  </div>

                  {/* 30 Uptime Bars */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: "26px",
                      gap: "2px",
                    }}
                  >
                    {Array.from({ length: 30 }).map((_, barIdx) => {
                      const isAmber = barIdx === service.amberIndex;
                      return (
                        <div
                          key={barIdx}
                          style={{
                            flex: 1,
                            height: "100%",
                            borderRadius: "2px",
                            background: isAmber ? "#f59e0b" : "#689f38",
                          }}
                        />
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "#71717a",
                      marginTop: "6px",
                    }}
                  >
                    <span>30 days ago</span>
                    <span>{service.uptime} uptime</span>
                    <span>Today</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isLiveChatOpen && currentConversation ? (
        /* ============================================================ */
        /* LIVE CHAT VIEW                                               */
        /* (Matching user's Image 1 & Image 2, no avatar icon)          */
        /* ============================================================ */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--bg-secondary, #18181b)",
            position: "relative",
          }}
        >
          {/* Header (Back Arrow • Bot Name • ... More options • Close) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-secondary, #27272a)",
              background: "var(--bg-secondary, #18181b)",
              flex: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setActiveConversationId(null)}
                aria-label="Back to conversations"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary-600, #a1a1aa)",
                  cursor: "pointer",
                  display: "flex",
                  padding: "4px",
                  borderRadius: "6px",
                }}
              >
                <ArrowLeft size={18} />
              </button>

              <strong
                style={{
                  fontSize: "14.5px",
                  fontWeight: 600,
                  color: "var(--text-primary-900, #f4f4f5)",
                }}
              >
                PansGPT AI Assistant
              </strong>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}
            >
              {/* ... More Options Button */}
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                aria-label="More options"
                style={{
                  background: showMoreMenu ? "var(--bg-primary, #27272a)" : "transparent",
                  border: "none",
                  color: "var(--text-tertiary-600, #a1a1aa)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  borderRadius: "6px",
                }}
              >
                <MoreHorizontal size={18} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary-600, #a1a1aa)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  borderRadius: "6px",
                }}
              >
                <X size={18} />
              </button>

              {/* Dropdown Menu (Exact match to user's Image 1) */}
              {showMoreMenu && (
                <div
                  ref={moreMenuRef}
                  style={{
                    position: "absolute",
                    top: "38px",
                    right: "0px",
                    width: "210px",
                    background: "#232529",
                    border: "1px solid #32353b",
                    borderRadius: "12px",
                    padding: "6px",
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55)",
                    zIndex: 60,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded((prev) => !prev);
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "transparent",
                      border: "none",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#2f3238")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {isExpanded ? (
                      <Minimize2 size={16} style={{ color: "#d4d4d8" }} />
                    ) : (
                      <Maximize2 size={16} style={{ color: "#d4d4d8" }} />
                    )}
                    <span>{isExpanded ? "Collapse window" : "Expand window"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchingConversation((prev) => !prev);
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "transparent",
                      border: "none",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#2f3238")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Search size={16} style={{ color: "#d4d4d8" }} />
                    <span>Search conversation</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTranscript}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "transparent",
                      border: "none",
                      color: "#f4f4f5",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#2f3238")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Download size={16} style={{ color: "#d4d4d8" }} />
                    <span>Download transcript</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* In-conversation Search Bar (if toggled) */}
          {isSearchingConversation && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                background: "#1e1f23",
                borderBottom: "1px solid #33363d",
              }}
            >
              <Search size={14} style={{ color: "#a1a1aa" }} />
              <input
                type="text"
                placeholder="Search in this conversation..."
                value={conversationSearchQuery}
                onChange={(e) => setConversationSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f4f4f5",
                  fontSize: "12.5px",
                  width: "100%",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchingConversation(false);
                  setConversationSearchQuery("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#a1a1aa",
                  cursor: "pointer",
                  display: "flex",
                  padding: "2px",
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Messages Scroll Body (Single Scrollbar) */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "16px 14px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
            }}
          >
            {/* 1. Intake Form Card Message */}
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "96%",
                background: "#26272b",
                borderRadius: "16px 16px 16px 4px",
                padding: "16px 16px 14px",
                color: "#f4f4f5",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "13.5px", marginBottom: "2px" }}>
                Conversation ID for your records:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  color: "#d4d4d8",
                  marginBottom: "14px",
                  letterSpacing: "0.02em",
                }}
              >
                {currentConversation.conversationNumber || "215476783654774"}
              </div>

              <p style={{ margin: "0 0 10px", color: "#e4e4e7" }}>
                Please provide details on how we can assist you. To ensure we can investigate this
                thoroughly, could you share the following in your response:
              </p>

              <ul
                style={{
                  margin: "0 0 12px",
                  paddingLeft: "18px",
                  color: "#d4d4d8",
                  fontSize: "12.5px",
                  lineHeight: "1.55",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <li>A description of the current experience and any steps to reproduce it</li>
                <li>Any error messages (screenshots are helpful too!)</li>
                <li>Email addresses of the impacted members</li>
                <li>Organization ID or plan this request is associated with</li>
                <li>
                  Browser, PansGPT product (Web, Android, Desktop), device, and OS (e.g.{" "}
                  <span style={{ textDecoration: "underline", color: "#fff" }}>pansgpt.com</span> on
                  Chrome on Windows)
                </li>
                <li>
                  When the issue started and whether it&apos;s happening consistently or
                  intermittently
                </li>
              </ul>

              <p style={{ margin: 0, color: "#e4e4e7" }}>
                The more detail you can share, the faster we can make sure you get the help you
                need!
              </p>
            </div>

            {/* 2. Secondary Bot Greeting Bubble */}
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "96%",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  background: "#26272b",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "12px 16px",
                  color: "#f4f4f5",
                  fontSize: "13.5px",
                  lineHeight: "1.45",
                }}
              >
                Thanks for accepting. What can I help you with today?
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  color: "#71717a",
                  paddingLeft: "4px",
                }}
              >
                PansGPT AI Assistant • AI Agent • Just now
              </span>
            </div>

            {/* 3. User & Bot Messages */}
            {currentConversation.messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isUser ? "var(--fg-brand-primary-600, #10b981)" : "#26272b",
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: "13px",
                      lineHeight: "1.45",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#71717a",
                      paddingLeft: isUser ? "0" : "4px",
                      paddingRight: isUser ? "4px" : "0",
                    }}
                  >
                    {isUser ? "You • Just now" : "PansGPT AI Assistant • AI Agent • Just now"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Composer: ONLY Paperclip + Input + Send Button */}
          <div
            style={{
              padding: "10px 14px 14px",
              background: "var(--bg-secondary, #18181b)",
              borderTop: "1px solid var(--border-secondary, #27272a)",
              flex: "none",
            }}
          >
            <form
              onSubmit={handleSendChatMessage}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#1e1f23",
                border: "1px solid #33363d",
                borderRadius: "16px",
                padding: "10px 12px 8px",
                gap: "8px",
              }}
            >
              {/* Message Input Field */}
              <input
                type="text"
                placeholder="Message..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f4f4f5",
                  fontSize: "13.5px",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />

              {/* Actions Row: ONLY Paperclip on Left, Circular Up-Arrow on Right */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <button
                  type="button"
                  aria-label="Attach file"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#a1a1aa",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                  }}
                >
                  <Paperclip size={16} />
                </button>

                <button
                  type="submit"
                  disabled={!chatInputText.trim()}
                  aria-label="Send message"
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: chatInputText.trim()
                      ? "var(--fg-brand-primary-600, #10b981)"
                      : "#34373e",
                    border: "none",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: chatInputText.trim() ? "pointer" : "default",
                    flex: "none",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : activeTab === "help" ? (
        /* ============================================================ */
        /* TAB 3: HELP (STICKY HEADER WITH SEARCH + SCROLLABLE LIST)    */
        /* (Matching user's Image 3: header does not scroll with page)   */
        /* ============================================================ */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--bg-secondary, #18181b)",
          }}
        >
          {/* Sticky Header: "Help", Close Button, and "Search for help" */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "var(--bg-secondary, #18181b)",
              padding: "16px 18px 12px",
              borderBottom: "1px solid var(--border-secondary, #27272a)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flex: "none",
            }}
          >
            {/* Top row: Back button (if inside item) + Title + Close */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedArticle ? (
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(null)}
                    aria-label="Back to collection"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-tertiary-600, #a1a1aa)",
                      cursor: "pointer",
                      display: "flex",
                      padding: "2px",
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : selectedCollection ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCollection(null)}
                    aria-label="Back to collections"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-tertiary-600, #a1a1aa)",
                      cursor: "pointer",
                      display: "flex",
                      padding: "2px",
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : null}
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--text-primary-900, #fff)",
                  }}
                >
                  {selectedArticle
                    ? "Article"
                    : selectedCollection
                      ? selectedCollection.title
                      : "Help"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary-600, #a1a1aa)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input (Matching Image 3: pinned inside the sticky header) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "#26272b",
                border: "1px solid #33363d",
              }}
            >
              <input
                type="text"
                placeholder="Search for help"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary-900, #fff)",
                  fontSize: "13.5px",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
              <Search
                size={16}
                style={{ color: "var(--fg-brand-primary-600, #10b981)", flex: "none" }}
              />
            </div>
          </div>

          {/* Scrollable Content Below Sticky Header (Single Scrollbar) */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
            }}
          >
            {selectedArticle ? (
              /* Single Article View */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      lineHeight: "1.35",
                      margin: "0 0 6px",
                      color: "var(--text-primary-900, #fff)",
                    }}
                  >
                    {selectedArticle.title}
                  </h2>
                  <span style={{ fontSize: "11.5px", color: "var(--text-tertiary-600, #71717a)" }}>
                    Updated {selectedArticle.updated} • PansGPT Faculty Guides
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    lineHeight: "1.6",
                    color: "var(--text-secondary-700, #d4d4d8)",
                  }}
                >
                  {selectedArticle.summary}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedArticle.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: "var(--bg-primary, #121212)",
                        border: "1px solid var(--border-secondary, #27272a)",
                      }}
                    >
                      {sec.heading && (
                        <strong
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--text-primary-900, #fff)",
                            marginBottom: "4px",
                          }}
                        >
                          {sec.heading}
                        </strong>
                      )}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12.5px",
                          lineHeight: "1.55",
                          color: "var(--text-secondary-700, #d4d4d8)",
                        }}
                      >
                        {sec.body}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Feedback Box */}
                <div
                  style={{
                    paddingTop: "14px",
                    borderTop: "1px solid var(--border-secondary, #27272a)",
                    textAlign: "center",
                    marginTop: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: "var(--text-tertiary-600, #a1a1aa)",
                      marginBottom: "8px",
                    }}
                  >
                    Did this answer your question?
                  </span>
                  {feedbackGiven[selectedArticle.id] ? (
                    <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 500 }}>
                      Thank you for your feedback!
                    </span>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() =>
                          setFeedbackGiven((prev) => ({ ...prev, [selectedArticle.id]: "yes" }))
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "16px",
                          background: "var(--bg-primary, #121212)",
                          border: "1px solid var(--border-secondary, #27272a)",
                          color: "var(--text-primary-900, #fff)",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        <ThumbsUp size={12} />
                        <span>Yes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFeedbackGiven((prev) => ({ ...prev, [selectedArticle.id]: "no" }))
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "16px",
                          background: "var(--bg-primary, #121212)",
                          border: "1px solid var(--border-secondary, #27272a)",
                          color: "var(--text-primary-900, #fff)",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        <ThumbsDown size={12} />
                        <span>No</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedCollection ? (
              /* Collection Articles List */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    color: "var(--text-tertiary-600, #a1a1aa)",
                  }}
                >
                  {selectedCollection.description}
                </p>
                {selectedCollection.articles.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => setSelectedArticle(art)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderRadius: "10px",
                      background: "var(--bg-primary, #121212)",
                      border: "1px solid var(--border-secondary, #27272a)",
                      color: "var(--text-primary-900, #fff)",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                      gap: "10px",
                    }}
                  >
                    <span>{art.title}</span>
                    <ChevronRight
                      size={14}
                      style={{ color: "var(--fg-brand-primary-600, #10b981)", flex: "none" }}
                    />
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              /* Search Results */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary-600, #a1a1aa)" }}>
                  {searchResults.length} results found
                </span>
                {searchResults.map(({ collection, article }) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => {
                      setSelectedCollection(collection);
                      setSelectedArticle(article);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "var(--bg-primary, #121212)",
                      border: "1px solid var(--border-secondary, #27272a)",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: "4px",
                    }}
                  >
                    <strong style={{ fontSize: "13px", color: "var(--text-primary-900, #fff)" }}>
                      {article.title}
                    </strong>
                    <span
                      style={{ fontSize: "11.5px", color: "var(--text-tertiary-600, #a1a1aa)" }}
                    >
                      {collection.title}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              /* All Collections List */
              <>
                <span
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--text-tertiary-600, #a1a1aa)",
                    marginBottom: "4px",
                  }}
                >
                  {COLLECTIONS.length} collections
                </span>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {COLLECTIONS.map((col, idx) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedCollection(col)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 0",
                        background: "transparent",
                        border: "none",
                        borderBottom:
                          idx === COLLECTIONS.length - 1
                            ? "none"
                            : "1px solid var(--border-secondary, #27272a)",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--text-primary-900, #fff)",
                            marginBottom: "4px",
                          }}
                        >
                          {col.title}
                        </strong>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: "12.5px",
                            lineHeight: "1.45",
                            color: "var(--text-secondary-700, #a1a1aa)",
                          }}
                        >
                          {col.description}
                        </p>
                        <span
                          style={{
                            fontSize: "11.5px",
                            color: "var(--text-tertiary-600, #71717a)",
                          }}
                        >
                          {col.articleCount} articles
                        </span>
                      </div>
                      <ChevronRight
                        size={15}
                        style={{ color: "var(--text-tertiary-600, #71717a)", flex: "none" }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* MAIN BODY CONTENT (HOME & MESSAGES TABS)                     */
        /* ============================================================ */
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            padding: "20px 20px 16px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
          }}
        >
          {/* ============================================================ */}
          {/* TAB 1: HOME                                                  */}
          {/* ============================================================ */}
          {activeTab === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Top Close Button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close support"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary-600, #a1a1aa)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px",
                    display: "flex",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Hero Heading */}
              <div style={{ marginTop: "-4px", marginBottom: "4px" }}>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: "1.25",
                    margin: 0,
                    color: "var(--text-primary-900, #fff)",
                  }}
                >
                  Need support?
                  <br />
                  How can we help?
                </h2>
              </div>

              {/* Status Card (Clickable -> Leads to Status Sub-view) */}
              <button
                type="button"
                onClick={() => setSubView("status")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-primary, #121212)",
                  border: "1px solid var(--border-secondary, #27272a)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(16, 185, 129, 0.16)",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text-primary-900, #fff)",
                      }}
                    >
                      Status: All Systems Operational
                    </strong>
                    <span
                      style={{ fontSize: "11.5px", color: "var(--text-tertiary-600, #a1a1aa)" }}
                    >
                      Updated today • Tap to inspect services
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  style={{ color: "var(--text-tertiary-600, #a1a1aa)", flex: "none" }}
                />
              </button>

              {/* Send Us A Message Button Card */}
              <button
                type="button"
                onClick={() => {
                  startNewConversation();
                  setActiveTab("messages");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-primary, #121212)",
                  border: "1px solid var(--border-secondary, #27272a)",
                  color: "var(--text-primary-900, #fff)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  width: "100%",
                }}
              >
                <span>Send us a message</span>
                <span
                  style={{
                    color: "var(--fg-brand-primary-600, #10b981)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ▶
                </span>
              </button>

              {/* Search For Help Card with Suggested Topics */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "12px",
                  background: "var(--bg-primary, #121212)",
                  border: "1px solid var(--border-secondary, #27272a)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border-secondary, #27272a)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search for help"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setActiveTab("help");
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary-900, #fff)",
                      fontSize: "13px",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  />
                  <Search
                    size={16}
                    style={{
                      color: "var(--fg-brand-primary-600, #10b981)",
                      cursor: "pointer",
                      flex: "none",
                    }}
                    onClick={() => setActiveTab("help")}
                  />
                </div>

                {/* Quick Topic Links */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("help");
                      setSelectedCollection(COLLECTIONS[0] ?? null);
                      setSelectedArticle(COLLECTIONS[0]?.articles[0] ?? null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--border-secondary, #27272a)",
                      color: "var(--text-secondary-700, #d4d4d8)",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>How to highlight monographs & snip to chat</span>
                    <ChevronRight
                      size={14}
                      style={{ color: "var(--fg-brand-primary-600, #10b981)", flex: "none" }}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("help");
                      setSelectedCollection(COLLECTIONS[1] ?? null);
                      setSelectedArticle(COLLECTIONS[1]?.articles[0] ?? null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--border-secondary, #27272a)",
                      color: "var(--text-secondary-700, #d4d4d8)",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>Use Clinical Dosage & Drug Interaction tools</span>
                    <ChevronRight
                      size={14}
                      style={{ color: "var(--fg-brand-primary-600, #10b981)", flex: "none" }}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("help");
                      setSelectedCollection(COLLECTIONS[3] ?? null);
                      setSelectedArticle(COLLECTIONS[3]?.articles[0] ?? null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-secondary-700, #d4d4d8)",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>Install PansGPT on Android, iOS, or Desktop</span>
                    <ChevronRight
                      size={14}
                      style={{ color: "var(--fg-brand-primary-600, #10b981)", flex: "none" }}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: MESSAGES (Empty State when no fake messages)          */}
          {/* ============================================================ */}
          {activeTab === "messages" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "14px" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border-secondary, #27272a)",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Messages</h3>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary-600, #a1a1aa)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Conversations List or Empty State */}
              {conversations.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "var(--text-tertiary-600, #71717a)",
                  }}
                >
                  <MessageSquare size={36} style={{ marginBottom: "12px", opacity: 0.4 }} />
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-secondary-700, #d4d4d8)",
                      margin: "0 0 4px",
                    }}
                  >
                    No conversations yet
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-tertiary-600, #71717a)",
                      margin: 0,
                    }}
                  >
                    Messages from support will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversationId(conv.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "14px",
                        borderRadius: "12px",
                        background: "var(--bg-primary, #121212)",
                        border: "1px solid var(--border-secondary, #27272a)",
                        color: "inherit",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "3px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "13.5px",
                              color: "var(--text-primary-900, #fff)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {conv.title}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-tertiary-600, #71717a)",
                              flex: "none",
                              marginLeft: "6px",
                            }}
                          >
                            {conv.timeAgo}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "var(--text-secondary-700, #a1a1aa)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "1.4",
                          }}
                        >
                          {conv.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Send us a message CTA pill */}
              <div style={{ paddingTop: "8px", marginTop: "auto" }}>
                <button
                  type="button"
                  onClick={startNewConversation}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "11px 16px",
                    borderRadius: "24px",
                    background: "var(--fg-brand-primary-600, #10b981)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <span>Send us a message</span>
                  <span>▶</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* BOTTOM NAVIGATION (Home • Messages • Help)                   */}
      {/* Hidden when in subView === 'status' OR in live chat thread   */}
      {/* ============================================================ */}
      {subView !== "status" && !isLiveChatOpen && (
        <nav
          aria-label="Support Navigation"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            height: "58px",
            borderTop: "1px solid var(--border-secondary, #27272a)",
            background: "var(--bg-secondary, #18181b)",
            flex: "none",
          }}
        >
          {/* 1. Home Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("home");
              setActiveConversationId(null);
              setSelectedArticle(null);
              setSelectedCollection(null);
              setSearchQuery("");
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color:
                activeTab === "home"
                  ? "var(--fg-brand-primary-600, #10b981)"
                  : "var(--text-tertiary-600, #a1a1aa)",
              transition: "color 0.15s ease",
            }}
          >
            <Home size={19} />
            <span style={{ fontSize: "11px", fontWeight: activeTab === "home" ? 600 : 500 }}>
              Home
            </span>
          </button>

          {/* 2. Messages Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("messages");
              setActiveConversationId(null);
              setSelectedArticle(null);
              setSelectedCollection(null);
              setSearchQuery("");
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color:
                activeTab === "messages"
                  ? "var(--fg-brand-primary-600, #10b981)"
                  : "var(--text-tertiary-600, #a1a1aa)",
              transition: "color 0.15s ease",
            }}
          >
            <MessageSquare size={19} />
            <span style={{ fontSize: "11px", fontWeight: activeTab === "messages" ? 600 : 500 }}>
              Messages
            </span>
          </button>

          {/* 3. Help Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("help");
              setActiveConversationId(null);
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color:
                activeTab === "help"
                  ? "var(--fg-brand-primary-600, #10b981)"
                  : "var(--text-tertiary-600, #a1a1aa)",
              transition: "color 0.15s ease",
            }}
          >
            <HelpCircle size={19} />
            <span style={{ fontSize: "11px", fontWeight: activeTab === "help" ? 600 : 500 }}>
              Help
            </span>
          </button>
        </nav>
      )}
    </aside>
  );
}
