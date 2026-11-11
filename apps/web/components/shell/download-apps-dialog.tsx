"use client";

import { useState } from "react";
import { Smartphone, Monitor, Apple, Share, PlusSquare, Download, X } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";

export function DownloadAppsDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus?: () => void;
}): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"android" | "desktop" | "ios">("android");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          style={{ width: "min(520px, 94vw)", maxHeight: "88vh", overflowY: "auto" }}
          aria-describedby="download-apps-desc"
          onCloseAutoFocus={(event) => {
            if (returnFocus) {
              event.preventDefault();
              returnFocus();
            }
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <DialogPrimitive.Title
                className="settings-confirm-title"
                style={{ fontSize: "17px" }}
              >
                Download PansGPT Apps
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                id="download-apps-desc"
                style={{
                  margin: "4px 0 0",
                  fontSize: "12.5px",
                  color: "var(--text-tertiary-600)",
                  lineHeight: "1.4",
                }}
              >
                Access your pharmacy study materials, clinical calculators, and quizzes across all
                devices.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="settings-close-button"
              aria-label="Close download dialog"
              style={{ flex: "none" }}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {/* Device Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "6px",
              padding: "4px",
              background: "var(--bg-secondary)",
              borderRadius: "10px",
              marginBottom: "18px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "8px 10px",
                fontSize: "12.5px",
                fontWeight: 500,
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                background: activeTab === "android" ? "var(--bg-primary)" : "transparent",
                color:
                  activeTab === "android" ? "var(--text-primary-900)" : "var(--text-tertiary-600)",
                boxShadow: activeTab === "android" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Smartphone size={15} />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "8px 10px",
                fontSize: "12.5px",
                fontWeight: 500,
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                background: activeTab === "desktop" ? "var(--bg-primary)" : "transparent",
                color:
                  activeTab === "desktop" ? "var(--text-primary-900)" : "var(--text-tertiary-600)",
                boxShadow: activeTab === "desktop" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Monitor size={15} />
              <span>Windows</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "8px 10px",
                fontSize: "12.5px",
                fontWeight: 500,
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                background: activeTab === "ios" ? "var(--bg-primary)" : "transparent",
                color: activeTab === "ios" ? "var(--text-primary-900)" : "var(--text-tertiary-600)",
                boxShadow: activeTab === "ios" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Apple size={15} />
              <span>iOS (PWA)</span>
            </button>
          </div>

          {/* Tab 1: Android */}
          {activeTab === "android" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "color-mix(in srgb, #10b981 14%, transparent)",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <strong
                      style={{
                        fontSize: "14px",
                        display: "block",
                        color: "var(--text-primary-900)",
                      }}
                    >
                      PansGPT for Android
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary-600)" }}>
                      Direct APK package • Version 2.4.0
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: "12.5px",
                    color: "var(--text-secondary-700)",
                    lineHeight: "1.5",
                  }}
                >
                  Install the native PansGPT Android APK for high-performance offline monographs,
                  push notifications, and quick study sessions.
                </p>
                <a
                  href="/downloads/pansgpt-android.apk"
                  download
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "var(--fg-brand-primary-600)",
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  <Download size={15} />
                  <span>Download APK (Android)</span>
                </a>
              </div>
            </div>
          )}

          {/* Tab 2: Windows Desktop */}
          {activeTab === "desktop" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "color-mix(in srgb, #3b82f6 14%, transparent)",
                      color: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    <Monitor size={20} />
                  </div>
                  <div>
                    <strong
                      style={{
                        fontSize: "14px",
                        display: "block",
                        color: "var(--text-primary-900)",
                      }}
                    >
                      PansGPT Desktop (Windows)
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary-600)" }}>
                      Electron 33 standalone package • 64-bit installer
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: "12.5px",
                    color: "var(--text-secondary-700)",
                    lineHeight: "1.5",
                  }}
                >
                  Full desktop workspace with split-screen multi-PDF reading, local SQLite encrypted
                  monograph caching, and keyboard hotkeys.
                </p>
                <a
                  href="/downloads/pansgpt-desktop.exe"
                  download
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "var(--fg-brand-primary-600)",
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  <Download size={15} />
                  <span>Download Installer (.exe)</span>
                </a>
              </div>
            </div>
          )}

          {/* Tab 3: iOS Instructions */}
          {activeTab === "ios" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "12.5px",
                  color: "var(--text-secondary-700)",
                  lineHeight: "1.4",
                }}
              >
                Apple iOS supports PansGPT as a standalone Progressive Web App (PWA) with full
                screen mode and offline caching.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12.5px",
                  lineHeight: "1.5",
                  padding: "10px",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-secondary)",
                    fontWeight: 600,
                    fontSize: "11px",
                    flex: "none",
                  }}
                >
                  1
                </div>
                <div>
                  Open <strong>Safari</strong> on your iPhone or iPad and navigate to{" "}
                  <code
                    style={{
                      background: "var(--bg-primary)",
                      padding: "2px 5px",
                      borderRadius: "4px",
                      fontSize: "11.5px",
                    }}
                  >
                    pansgpt.com
                  </code>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12.5px",
                  lineHeight: "1.5",
                  padding: "10px",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-secondary)",
                    fontWeight: 600,
                    fontSize: "11px",
                    flex: "none",
                  }}
                >
                  2
                </div>
                <div>
                  Tap the <strong>Share</strong> button{" "}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      verticalAlign: "middle",
                      padding: "2px 4px",
                      background: "var(--bg-primary)",
                      borderRadius: "4px",
                      border: "1px solid var(--border-secondary)",
                    }}
                  >
                    <Share size={12} style={{ color: "#007aff" }} />
                  </span>{" "}
                  in the Safari toolbar at the bottom of the screen.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12.5px",
                  lineHeight: "1.5",
                  padding: "10px",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-secondary)",
                    fontWeight: 600,
                    fontSize: "11px",
                    flex: "none",
                  }}
                >
                  3
                </div>
                <div>
                  Scroll down the share sheet and tap{" "}
                  <strong>
                    <PlusSquare
                      size={12}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: "4px",
                      }}
                    />
                    Add to Home Screen
                  </strong>
                  .
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
