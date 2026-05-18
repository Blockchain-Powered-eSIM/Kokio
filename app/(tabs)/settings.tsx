import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  // Switch,
  Text,
  Switch,
} from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useKokio } from "@/hooks/useKokio";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { StoredPurchasedESIM } from "@/providers/kokioProvider";
import { getAllEsims, getEsim } from "@/utils/bff/esim";
import type { EsimDetails } from "@/utils/bff/esim";
import { getOrderStatus } from "@/utils/bff/order";
import ESIMItem from "@/components/ESIMItem";

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 20,
    paddingBottom: 0,
  },
  list: {
    borderRadius: 25,
    maxHeight: "auto",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  menuItem: {
    padding: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  iconLeft: {
    marginRight: 16,
  },
  iconRight: {
    marginLeft: 16,
  },
  orderCardWrapper: {
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  orderStatusBadge: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderMetaText: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
  aboutContainer: {
    borderRadius: 25,
    flex: 1,
    padding: 20,
    paddingBottom: 8,
  },
  aboutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.muted,
  },
  aboutTitle: {
    color: Theme.colors.text,
    fontSize: 24,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  aboutContent: {
    flex: 1,
  },
  aboutText: {
    color: Theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    opacity: 0.9,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  linkText: {
    color: Theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  aboutLink: {
    color: Theme.colors.link,
    textDecorationLine: "underline",
    fontSize: 15,
    lineHeight: 24,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  themeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Theme.colors.text,
  },
});

// Feature flags for menu item availability
// Set to true to enable the menu item, false to disable (but keep visible)
const MENU_ITEM_ENABLED = {
  PROFILE: true, // Orders list
  NOTIFICATIONS: false, // Change to true to enable Notifications
  PRIVACY: false, // Change to true to enable Privacy
  GENERAL: false, // Change to true to enable General
};

// Disabled menu item styling
const DISABLED_OPACITY = 0.3;

const MenuItem = ({
  title,
  iconLeft,
  iconRight,
  action,
  disabled = false,
}: {
  title: string;
  iconLeft: string;
  iconRight: string;
  action: (() => void) | undefined;
  disabled?: boolean;
}) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  return (
  <TouchableOpacity
    style={[styles.menuItem, disabled && { opacity: DISABLED_OPACITY }]}
    onPress={() => !disabled && action && action()}
    disabled={disabled}
  >
    <View style={styles.menuItemContent}>
      <Ionicons
        /* @ts-ignore */
        name={iconLeft}
        size={24}
        color={disabled ? Theme.colors.inactive : "white"}
        style={styles.iconLeft}
      />
      <ThemedText
        style={{
          ...styles.menuItemText,
          ...(disabled && { color: Theme.colors.inactive }),
        }}
      >
        {title}
      </ThemedText>
      <Ionicons
        /* @ts-ignore */
        name={iconRight}
        size={24}
        color={disabled ? Theme.colors.inactive : "white"}
        style={styles.iconRight}
      />
    </View>
  </TouchableOpacity>
  );
};

const orderStatusColor = (status?: string) => {
  if (!status) return Theme.colors.muted;
  if (status === 'COMPLETED' || status.startsWith('ESIM_PROVISIONED')) return Theme.colors.success;
  if (status.includes('FAILED')) return Theme.colors.destructive;
  return Theme.colors.goldenYellow;
};

const OrderCard = ({ order }: { order: StoredPurchasedESIM }) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const { eSimItem, transactionData } = order;
  const statusColor = orderStatusColor(transactionData.orderStatus);
  return (
    <View style={styles.orderCardWrapper}>
      <ESIMItem item={eSimItem} showBuyButton={false} />
      <View style={styles.orderMeta}>
        {transactionData.orderStatus ? (
          <View style={[styles.orderStatusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.orderStatusText, { color: statusColor }]}>
              {transactionData.orderStatus.replace(/_/g, ' ')}
            </Text>
          </View>
        ) : null}
        {transactionData.iccid ? (
          <Text style={styles.orderMetaText}>ICCID: {transactionData.iccid}</Text>
        ) : null}
        {transactionData.paymentMethod ? (
          <Text style={styles.orderMetaText}>{transactionData.paymentMethod}</Text>
        ) : null}
        {!transactionData.iccid && transactionData.correlationId ? (
          <Text style={styles.orderMetaText}>Ref: {transactionData.correlationId.slice(0, 8)}…</Text>
        ) : null}
      </View>
    </View>
  );
};

const OrdersContent = ({ orders, onClose }: { orders: StoredPurchasedESIM[]; onClose: () => void }) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const [enrichedOrders, setEnrichedOrders] = useState<StoredPurchasedESIM[]>(orders);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchLive = async () => {
      setIsFetching(true);
      try {
        const liveEsims = await getAllEsims();
        const liveMap: Record<string, EsimDetails> = {};
        liveEsims.forEach(e => { liveMap[e.esimId] = e; });

        const merged = await Promise.all(orders.map(async (order) => {
          const { transactionData } = order;

          // For completed orders with esimId, use live data
          if (transactionData.esimId && liveMap[transactionData.esimId]) {
            const live = liveMap[transactionData.esimId];
            return {
              ...order,
              transactionData: {
                ...transactionData,
                iccid: live.iccid ?? transactionData.iccid,
                orderStatus: live.orderStatus ?? transactionData.orderStatus,
                planId: live.planId ?? transactionData.planId,
                installationDetails: live.installationDetails ?? transactionData.installationDetails,
              },
            };
          }

          // For pending/failed orders with correlationId, re-fetch status
          if (transactionData.correlationId && !transactionData.installationDetails?.qrcode) {
            try {
              const latest = await getOrderStatus(transactionData.correlationId);
              const esimDetails = latest.esimId
                ? liveMap[latest.esimId] ?? (latest.esimId ? await getEsim(latest.esimId).catch(() => null) : null)
                : null;
              return {
                ...order,
                transactionData: {
                  ...transactionData,
                  orderId: latest.orderId || transactionData.orderId,
                  iccid: latest.iccid ?? transactionData.iccid,
                  orderStatus: latest.orderStatus ?? transactionData.orderStatus,
                  esimId: (latest as any).esimId ?? transactionData.esimId,
                  installationDetails: esimDetails?.installationDetails ?? latest.installationDetails ?? transactionData.installationDetails,
                },
              };
            } catch {
              return order;
            }
          }

          return order;
        }));

        if (!cancelled) setEnrichedOrders(merged);
      } catch {
        // live fetch failed — fall back to stored data
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };
    fetchLive();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutHeader}>
        <ThemedText style={styles.aboutTitle}>Orders</ThemedText>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>
      {isFetching ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Theme.colors.secondary} />
        </View>
      ) : enrichedOrders.length === 0 ? (
        <ThemedText style={[styles.aboutText, { textAlign: 'center', marginTop: 32 }]}>
          No orders yet.
        </ThemedText>
      ) : (
        <FlatList
          data={enrichedOrders}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <OrderCard order={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      )}
    </View>
  );
};

const AboutContent = ({ onClose }: { onClose: () => void }) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const handleLinkPress = useCallback(async (url: string) => {
    try {
      await openBrowserAsync(url);
    } catch (error) {
      console.error("Error opening browser:", error);
    }
  }, []);

  return (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutHeader}>
        <ThemedText style={styles.aboutTitle}>About</ThemedText>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.aboutContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.aboutText}>
          You are using KOKI'O Beta v1
        </ThemedText>
        <ThemedText style={styles.aboutText}>
          A mobile app to purchase eSIM data plans and subscriptions using
          crypto or fiat in over 200 countries.
        </ThemedText>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Based on </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://github.com/Blockchain-Powered-eSIM/Smart-Contract-Suite")}>
            <Text style={styles.aboutLink}>Open Source eSIM Wallet Suite</Text>
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.aboutText}>
          Built with privacy first, friendly and practical design for the digital
          well-being and connectivity freedom of mobile users worldwide.
        </ThemedText>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Website: </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://kokio.app")}>
            <Text style={styles.aboutLink}>kokio</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Follow us: </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://x.com/kokiodotapp")}>
            <Text style={styles.aboutLink}>@kokiodotapp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default function MenuScreen() {
  const { logout } = useAuthRelay();
  const { kokio, clearKokioUser } = useKokio();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const [showAbout, setShowAbout] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const bg = useThemeColor({}, "background");
  const styles = useMemo(createStyles, [isDark]);

  const menuItems = [
    {
      id: "1",
      title: "Orders",
      iconLeft: "receipt-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.PROFILE,
      action: () => setShowOrders(true),
    },
    {
      id: "2",
      title: "Notifications",
      iconLeft: "notifications-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.NOTIFICATIONS,
    },
    {
      id: "3",
      title: "Privacy",
      iconLeft: "lock-closed-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.PRIVACY,
    },
    {
      id: "4",
      title: "General",
      iconLeft: "settings-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.GENERAL,
    },
    {
      id: "5",
      title: "About",
      iconLeft: "information-circle-outline",
      iconRight: "chevron-forward-outline",
      action: () => setShowAbout(true),
    },
    {
      id: "6",
      title: "Logout",
      iconLeft: "log-out-outline",
      iconRight: "chevron-forward-outline",
      action: logout,
    },
    {
      id: "7",
      title: "Logout and Clear Data",
      iconLeft: "trash-outline",
      iconRight: "chevron-forward-outline",
      action: async () => {
        await clearKokioUser();
        await logout();
      },
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ThemedView style={styles.container}>
        {showOrders ? (
          <OrdersContent orders={kokio.purchasedESIMs} onClose={() => setShowOrders(false)} />
        ) : showAbout ? (
          <AboutContent onClose={() => setShowAbout(false)} />
        ) : (
          <>
            <FlatList
              data={menuItems}
              renderItem={({ item }) => (
                <MenuItem
                  title={item.title}
                  iconLeft={item.iconLeft}
                  iconRight={item.iconRight}
                  action={item.action}
                  disabled={item.disabled}
                />
              )}
              keyExtractor={(item) => item.id}
              style={styles.list}
            />
            { <View style={styles.themeRow}>
              <Ionicons
                name={isDark ? "moon-outline" : "sunny-outline"}
                size={24}
                color={Theme.colors.text}
                style={styles.iconLeft}
              />
              <ThemedText style={styles.themeLabel}>
                {isDark ? "Dark Mode" : "Light Mode"}
              </ThemedText>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: Theme.colors.muted, true: Theme.colors.primary }}
                thumbColor={Theme.colors.text}
              />
            </View> }
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
