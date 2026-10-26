import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
export default function HomeScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email || null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email || null));
    return () => subscription.unsubscribe();
  }, []);
  async function signIn(provider: "google" | "apple"): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: Linking.createURL("auth/callback"), skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data.url) await Linking.openURL(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in could not be started.");
    }
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PansGPT</Text>
      {email ? (
        <>
          <Text>{email}</Text>
          <Button
            title="Sign out"
            onPress={() => {
              void supabase.auth.signOut();
            }}
          />
        </>
      ) : (
        <>
          <Button
            title="Continue with Google"
            onPress={() => {
              void signIn("google");
            }}
          />
          <Button
            title="Continue with Apple"
            onPress={() => {
              void signIn("apple");
            }}
          />
        </>
      )}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: "bold" },
});
