// ==============================================================================
// PansGPT 2.0 Desktop Secure Keychain Storage (Phase 7.7)
// Uses Electron safeStorage API (OS DPAPI / Keychain / Secret Service)
// ==============================================================================

import { app, safeStorage } from "electron";
import * as fs from "fs";
import * as path from "path";

const getStorePath = (): string => {
  return path.join(app.getPath("userData"), "secure_tokens.json");
};

function readStore(): Record<string, string> {
  try {
    const storePath = getStorePath();
    if (!fs.existsSync(storePath)) {
      return {};
    }
    const raw = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read secure token store:", err);
    return {};
  }
}

function writeStore(data: Record<string, string>): void {
  try {
    const storePath = getStorePath();
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write secure token store:", err);
  }
}

export function isKeychainAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function storeToken(key: string, value: string): boolean {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      const store = readStore();
      store[key] = encrypted.toString("base64");
      writeStore(store);
      return true;
    } else {
      console.warn("Electron safeStorage encryption unavailable on this environment.");
      return false;
    }
  } catch (err) {
    console.error(`Failed to store token for ${key}:`, err);
    return false;
  }
}

export function getToken(key: string): string | null {
  try {
    const store = readStore();
    const encoded = store[key];
    if (!encoded) return null;

    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encoded, "base64");
      return safeStorage.decryptString(buffer);
    }
    return null;
  } catch (err) {
    console.error(`Failed to retrieve token for ${key}:`, err);
    return null;
  }
}

export function clearToken(key: string): boolean {
  try {
    const store = readStore();
    if (key in store) {
      delete store[key];
      writeStore(store);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to clear token for ${key}:`, err);
    return false;
  }
}
