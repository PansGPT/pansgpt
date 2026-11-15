"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listAccountSessions,
  revokeAccountSessions,
  sendPasswordConfirmation,
  SettingsError,
  updateAccountPassword,
} from "@/lib/settings";
import type { AccountSession } from "@pansgpt/types";

export function useAccountSecurity(token: string | undefined) {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [currentRequired, setCurrentRequired] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const alive = useRef(true);
  const mutation = useRef(false);
  const passwordMutation = useRef(false);
  const confirmationMutation = useRef(false);
  const reads = useRef<AbortController | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      reads.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    reads.current = controller;
    void listAccountSessions(token, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || !alive.current) return;
        setSessions(result.sessions);
        setSessionError(null);
        setHasMore(result.has_more);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !alive.current) return;
        setSessionError(
          error instanceof SettingsError
            ? error.message
            : "Couldn't load your devices. Please try again."
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [token, revision]);

  const revoke = useCallback(
    async (id?: string): Promise<boolean> => {
      if (mutation.current) return false;
      mutation.current = true;
      reads.current?.abort();
      setRevoking(true);
      setSessionError(null);
      setNotice(null);
      try {
        await revokeAccountSessions(token, id);
        if (!alive.current) return false;
        reads.current?.abort();
        setSessions((rows) => rows.filter((row) => (id ? row.id !== id : row.is_current)));
        if (!id) setHasMore(false);
        setNotice(
          id ? "Device logged out." : "Other devices logged out. This session stays signed in."
        );
        return true;
      } catch (error: unknown) {
        if (alive.current)
          setSessionError(
            error instanceof SettingsError
              ? error.message
              : "Couldn't log out that device. Please try again."
          );
        return false;
      } finally {
        mutation.current = false;
        if (alive.current) {
          setRevoking(false);
          setLoading(false);
        }
      }
    },
    [token]
  );

  function clearPassword(): void {
    setPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setNonce("");
    setConfirmationRequired(false);
    setCurrentRequired(false);
    setPasswordError(null);
    setPasswordNotice(null);
  }
  async function savePassword(): Promise<boolean> {
    if (passwordMutation.current || confirmationMutation.current) return false;
    if (password.length < 8 || password.length > 128) {
      setPasswordError("Use between 8 and 128 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return false;
    }
    if (currentRequired && !currentPassword) {
      setPasswordError("Enter your current password.");
      return false;
    }
    if (confirmationRequired && !/^[0-9]{6,10}$/.test(nonce)) {
      setPasswordError("Enter the confirmation code sent to your account.");
      return false;
    }
    passwordMutation.current = true;
    setSaving(true);
    setPasswordError(null);
    setPasswordNotice(null);
    setNotice(null);
    try {
      await updateAccountPassword(token, {
        password,
        ...(currentPassword ? { current_password: currentPassword } : {}),
        ...(nonce ? { nonce } : {}),
      });
      if (!alive.current) return false;
      clearPassword();
      setNotice("Password updated.");
      // Auth policy may end other sessions when the password changes.
      setLoading(true);
      setRevision((value) => value + 1);
      return true;
    } catch (error: unknown) {
      if (!alive.current) return false;
      if (error instanceof SettingsError) {
        if (error.code === "REAUTHENTICATION_REQUIRED" || error.code === "INVALID_CONFIRMATION")
          setConfirmationRequired(true);
        if (error.code === "CURRENT_PASSWORD_REQUIRED" || error.code === "INVALID_CURRENT_PASSWORD")
          setCurrentRequired(true);
      }
      setPasswordError(
        error instanceof SettingsError
          ? error.message
          : "Couldn't update your password. Please try again."
      );
      return false;
    } finally {
      passwordMutation.current = false;
      if (alive.current) setSaving(false);
    }
  }
  async function sendConfirmation(): Promise<void> {
    if (confirmationMutation.current || passwordMutation.current) return;
    confirmationMutation.current = true;
    setSending(true);
    setPasswordError(null);
    try {
      await sendPasswordConfirmation(token);
      if (alive.current) setPasswordNotice("Confirmation code sent. Check your email or phone.");
    } catch (error: unknown) {
      if (alive.current)
        setPasswordError(
          error instanceof SettingsError ? error.message : "Couldn't send a code. Please try again."
        );
    } finally {
      confirmationMutation.current = false;
      if (alive.current) setSending(false);
    }
  }
  return {
    sessions,
    loading,
    hasMore,
    sessionError,
    notice,
    revoking,
    revoke,
    reload: () => {
      setLoading(true);
      setSessionError(null);
      setRevision((value) => value + 1);
    },
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    currentPassword,
    setCurrentPassword,
    nonce,
    setNonce,
    confirmationRequired,
    currentRequired,
    passwordError,
    passwordNotice,
    saving,
    sending,
    savePassword,
    sendConfirmation,
    clearPassword,
  };
}
