import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  checkHealth,
  fetchAgents,
  runDailyClose,
  type DailyCloseResult,
} from "./lib/api";
import { loadApiUrl, saveApiUrl } from "./lib/config";

const AGENT_ICONS: Record<string, string> = {
  administrativo: "📁",
  financiero: "💰",
  contable: "📊",
  operativo: "⚙️",
  marketing: "📣",
  comercial: "🤝",
  juridico: "⚖️",
  gerencial: "🎯",
};

export default function App() {
  const [apiUrl, setApiUrlState] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DailyCloseResult | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [showSettings, setShowSettings] = useState(false);

  const refreshConnection = useCallback(async (url?: string) => {
    if (url) await saveApiUrl(url);
    const ok = await checkHealth();
    setConnected(ok);
    if (ok) {
      try {
        const list = await fetchAgents();
        setAgents(list);
      } catch {
        setAgents([]);
      }
    }
  }, []);

  useEffect(() => {
    loadApiUrl().then((url) => {
      setApiUrlState(url);
      refreshConnection(url);
    });
  }, [refreshConnection]);

  async function handleDailyClose() {
    setLoading(true);
    setResult(null);
    try {
      const data = await runDailyClose(false);
      setResult(data);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo ejecutar el cierre diario",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    await refreshConnection(apiUrl);
    setShowSettings(false);
    Alert.alert("Guardado", connected ? "Conectado al servidor" : "No se pudo conectar — revisa la URL");
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Empresario Virtual</Text>
        <Text style={styles.subtitle}>Tu equipo administrativo con IA</Text>
        <Pressable style={styles.settingsBtn} onPress={() => setShowSettings((s) => !s)}>
          <Text style={styles.settingsBtnText}>{showSettings ? "Cerrar" : "⚙️ API"}</Text>
        </Pressable>
      </View>

      {showSettings && (
        <View style={styles.settingsPanel}>
          <Text style={styles.label}>URL del servidor</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrlState}
            placeholder="https://empresario-virtual.vercel.app"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Emulador Android: http://10.0.2.2:3000{"\n"}
            Dispositivo físico: IP de tu PC en la red local
          </Text>
          <Pressable style={styles.primaryBtn} onPress={handleSaveSettings}>
            <Text style={styles.primaryBtnText}>Guardar y conectar</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.statusRow}>
        <View style={[styles.dot, connected ? styles.dotOk : styles.dotErr]} />
        <Text style={styles.statusText}>
          {connected === null ? "Conectando..." : connected ? "Servidor conectado" : "Sin conexión"}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleDailyClose}
          disabled={loading || !connected}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Ejecutar cierre diario</Text>
          )}
        </Pressable>

        <View style={styles.agentGrid}>
          {agents.map((a) => (
            <View key={a.id} style={styles.agentCard}>
              <Text style={styles.agentIcon}>{AGENT_ICONS[a.id] ?? "🤖"}</Text>
              <Text style={styles.agentName}>{a.name}</Text>
            </View>
          ))}
        </View>

        {result && (
          <>
            <View style={styles.kpiRow}>
              <Kpi label="Ventas" value={result.kpis.sales} />
              <Kpi label="Gastos" value={result.kpis.expenses} />
              <Kpi label="Utilidad" value={result.kpis.profit} highlight />
            </View>

            {result.topAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alertas</Text>
                {result.topAlerts.map((a, i) => (
                  <View key={i} style={styles.alertCard}>
                    <Text style={[styles.alertBadge, severityStyle(a.severity)]}>
                      {a.severity}
                    </Text>
                    <Text style={styles.alertText}>{a.message}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reporte gerencial</Text>
              <Text style={styles.reportText}>{result.executiveSummary}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Agentes</Text>
              {result.agentResults.map((r) => (
                <View key={r.agentId} style={styles.resultRow}>
                  <Text style={styles.resultAgent}>{r.agentId}</Text>
                  <Text style={styles.resultSummary}>{r.summary}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable
          onPress={() => Linking.openURL(`${apiUrl}/dashboard`)}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Abrir dashboard web →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, highlight && styles.kpiHighlight]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>${value.toLocaleString("es-CO")}</Text>
    </View>
  );
}

function severityStyle(severity: string) {
  if (severity === "critical") return { color: "#fca5a5" };
  if (severity === "warning") return { color: "#fcd34d" };
  return { color: "#94a3b8" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#f8fafc" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  settingsBtn: { position: "absolute", right: 20, top: 56 },
  settingsBtnText: { color: "#818cf8", fontSize: 14 },
  settingsPanel: {
    margin: 16,
    padding: 16,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  label: { color: "#94a3b8", fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#1e293b",
    color: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  hint: { color: "#64748b", fontSize: 11, marginTop: 8, lineHeight: 16 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOk: { backgroundColor: "#22c55e" },
  dotErr: { backgroundColor: "#ef4444" },
  statusText: { color: "#94a3b8", fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  agentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  agentCard: {
    width: "23%",
    minWidth: 72,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  agentIcon: { fontSize: 20 },
  agentName: { color: "#64748b", fontSize: 9, marginTop: 4, textAlign: "center" },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  kpiHighlight: { borderColor: "#059669", backgroundColor: "#022c22" },
  kpiLabel: { color: "#64748b", fontSize: 11 },
  kpiValue: { color: "#f8fafc", fontSize: 16, fontWeight: "700", marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { color: "#e2e8f0", fontWeight: "600", marginBottom: 8 },
  alertCard: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  alertBadge: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  alertText: { color: "#cbd5e1", fontSize: 13, marginTop: 4 },
  reportText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "monospace",
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 8,
  },
  resultRow: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  resultAgent: { color: "#818cf8", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  resultSummary: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  linkBtn: { alignItems: "center", padding: 16 },
  linkText: { color: "#6366f1", fontSize: 14 },
});
