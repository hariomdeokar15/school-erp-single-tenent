import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { HealthStatusResponse } from "@schoolerp/contracts";
import { fetchMobileApi } from "../lib/api-client";
import { SupportedLanguage } from "@schoolerp/i18n";
import { OfflineNotice } from "../components/OfflineNotice";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const [healthData, setHealthData] = useState<HealthStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadHealth = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchMobileApi<HealthStatusResponse>("/api/v1/health");
      setHealthData(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const changeLang = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <OfflineNotice isOffline={error} />

      <View style={styles.content}>
        <Text style={styles.title}>{t("appName")}</Text>
        <Text style={styles.subtitle}>
          Mobile App Foundation (Android & iOS)
        </Text>

        {/* Language Switcher */}
        <View style={styles.langContainer}>
          <Text style={styles.label}>{t("languageSwitcher")}:</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.langBtn,
                i18n.language === "en" && styles.langBtnActive,
              ]}
              onPress={() => changeLang("en")}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === "en" && styles.langTextActive,
                ]}
              >
                EN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langBtn,
                i18n.language === "hi" && styles.langBtnActive,
              ]}
              onPress={() => changeLang("hi")}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === "hi" && styles.langTextActive,
                ]}
              >
                हिंदी
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langBtn,
                i18n.language === "mr" && styles.langBtnActive,
              ]}
              onPress={() => changeLang("mr")}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === "mr" && styles.langTextActive,
                ]}
              >
                मराठी
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Widget */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t("healthStatus")}</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#4f46e5"
              style={{ marginVertical: 12 }}
            />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{t("apiUnavailable")}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadHealth}>
                <Text style={styles.retryText}>{t("retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            healthData && (
              <View style={styles.infoGroup}>
                <View style={styles.row}>
                  <Text style={styles.key}>Status:</Text>
                  <Text style={styles.valueHealthy}>{t("statusHealthy")}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.key}>Service:</Text>
                  <Text style={styles.val}>{healthData.service}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.key}>Version:</Text>
                  <Text style={styles.val}>{healthData.version}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.key}>Uptime:</Text>
                  <Text style={styles.val}>{healthData.uptimeSeconds}s</Text>
                </View>
              </View>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },
  langContainer: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  langBtn: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  langBtnActive: {
    backgroundColor: "#4f46e5",
  },
  langText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  langTextActive: {
    color: "#ffffff",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  infoGroup: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  key: {
    fontSize: 14,
    color: "#64748b",
  },
  val: {
    fontSize: 14,
    fontFamily: "monospace",
    color: "#0f172a",
  },
  valueHealthy: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#16a34a",
  },
  errorBox: {
    padding: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    borderColor: "#fde68a",
    borderWidth: 1,
    alignItems: "center",
  },
  errorText: {
    color: "#b45309",
    fontSize: 13,
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: "#d97706",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
