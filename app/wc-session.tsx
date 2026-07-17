import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useKokio } from "@/hooks/useKokio";
import { Config } from "@/appKeys";
import {
  getWcSignClient,
  pendingProposal,
  setPendingProposal,
} from "@/utils/walletconnect/signClient";
import { logger } from "@/utils/logger";

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: Theme.colors.modalBackground,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  dappIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  dappName: {
    fontSize: 20,
    color: Theme.colors.foreground,
    marginBottom: 4,
  },
  dappUrl: {
    fontSize: 13,
    color: Theme.colors.muted,
    marginBottom: 16,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Theme.colors.muted,
    opacity: 0.2,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: Theme.colors.foreground,
    marginBottom: 2,
  },
  addressPreview: {
    fontSize: 13,
    color: Theme.colors.muted,
    fontFamily: "Lexend",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    borderRadius: 32,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: Theme.colors.inputBackground,
  },
  approveButton: {
    backgroundColor: Theme.colors.secondary,
  },
  rejectText: {
    color: Theme.colors.foreground,
  },
  approveText: {
    color: Theme.colors.cardForeground,
  },
});

export default function WcSessionScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const router = useRouter();
  const { kokio } = useKokio();
  const [loading, setLoading] = useState(false);

  const proposal = pendingProposal;

  if (!proposal) {
    router.replace("/");
    return null;
  }

  const { name, url, icons } = proposal.params.proposer.metadata;
  const chainId = Config.CHAIN_ID ?? 84532;
  const walletAddress = (kokio.userWallet as any)?.address ?? "";

  const handleApprove = async () => {
    setLoading(true);
    try {
      const client = await getWcSignClient();
      const { acknowledged } = await client.approve({
        id: proposal.id,
        namespaces: {
          eip155: {
            chains: [`eip155:${chainId}`],
            accounts: [`eip155:${chainId}:${walletAddress}`],
            methods: [
              "eth_sendTransaction",
              "eth_signTypedData_v4",
              "personal_sign",
            ],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });
      await acknowledged();
      setPendingProposal(null);
      router.replace("/");
    } catch (err) {
      logger.error('WC_APPROVE_FAILED', { err });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const client = await getWcSignClient();
      await client.reject({
        id: proposal.id,
        reason: { code: 4001, message: "User rejected" },
      });
    } catch (err) {
      logger.error('WC_REJECT_FAILED', { err });
    } finally {
      setPendingProposal(null);
      setLoading(false);
      router.replace("/");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {icons[0] ? (
          <Image source={{ uri: icons[0] }} style={styles.dappIcon} />
        ) : null}
        <ThemedText bold style={styles.dappName}>
          {name}
        </ThemedText>
        <ThemedText style={styles.dappUrl}>{url}</ThemedText>

        <View style={styles.divider} />

        <ThemedText style={styles.label}>Requesting access to</ThemedText>
        <ThemedText style={styles.value}>
          {`eip155:${chainId}`}
        </ThemedText>
        <ThemedText style={styles.addressPreview}>
          {walletAddress
            ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
            : "—"}
        </ThemedText>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={handleReject}
            disabled={loading}
          >
            <ThemedText style={styles.rejectText}>Reject</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={handleApprove}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Theme.colors.cardForeground} />
            ) : (
              <ThemedText style={styles.approveText}>Approve</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

