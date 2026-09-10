import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PansGPT Mobile 2.0</Text>
      <Text style={styles.subtitle}>Expo SDK 52+ (New Architecture)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0284c7",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
  },
});
