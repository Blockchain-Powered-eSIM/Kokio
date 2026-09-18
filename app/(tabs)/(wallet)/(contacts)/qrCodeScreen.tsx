import { ThemedText } from '@/components/ThemedText';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Linking, Pressable, Modal, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";
import { logger } from '@/utils/logger';

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  horizontalContainer: {
    flexDirection: 'row',
    height: 250,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.text,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.text,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.text,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.text,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: colors.overlayDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  permissionModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.popover,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 999,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButton: {
    marginTop: 22,
    width: '100%',
    minHeight: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

// A soft, endlessly-breathing ring behind the camera icon - the one bit of
// "cool" motion this popup gets, since everything else about it is a plain
// permission dialog.
function PulsingIconBadge({ iconName, color }: { iconName: keyof typeof Ionicons.glyphMap; color: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={[styles.iconRing, ringStyle, { backgroundColor: color }]} />
      <View style={[styles.iconBadge, { backgroundColor: color }]}>
        <Ionicons name={iconName} size={26} color={colors.primaryForeground} />
      </View>
    </View>
  );
}

function CameraPermissionPopup({
  permanentlyDenied,
  onRequest,
  onOpenSettings,
  onCancel,
}: {
  permanentlyDenied: boolean;
  onRequest: () => void;
  onOpenSettings: () => void;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.permissionModalOverlay}>
        <View style={styles.permissionCard}>
          <PulsingIconBadge iconName={permanentlyDenied ? 'camera-outline' : 'camera'} color={colors.primary} />
          <ThemedText lightColor="#000000" bold variant="xl" style={{ textAlign: 'center', marginTop: 18 }}>
            {permanentlyDenied ? 'Camera access is off' : 'Scan a QR code'}
          </ThemedText>
          <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            {permanentlyDenied
              ? 'Camera access was turned off for Kokio. Enable it in Settings to scan a QR code.'
              : 'To scan a QR, we need your permission to show the camera — we prefer you select "Only This Time" for one-time access.'}
          </ThemedText>
          <Pressable
            onPress={permanentlyDenied ? onOpenSettings : onRequest}
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name={permanentlyDenied ? 'settings-outline' : 'camera-outline'} size={18} color={colors.primaryForeground} />
            <ThemedText bold style={{ color: colors.primaryForeground }}>
              {permanentlyDenied ? 'Open Settings' : 'Allow Camera Access'}
            </ThemedText>
          </Pressable>
          <Pressable onPress={onCancel} style={{ marginTop: 12, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ fontWeight: '600' }}>Not now</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function QrCodeScreen() {
  const styles = useThemedStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const permanentlyDenied =
    !!permission && !permission.granted && permission.canAskAgain === false;
  const [scanned, setScanned] = useState(false);
  const {isEdit,id,returnTo} = useLocalSearchParams();

  const handleBarCodeScanned = ({ data }:{data:string}) => {
    if (scanned) return;

    setScanned(true);
    logger.debug('WALLET_ADDRESS_SCANNED', { data });

    if(returnTo === "send"){
      router.replace({
        pathname: '/(tabs)/(wallet)/(contacts)/sendToContact',
        params: { scannedAddress: data }
      });
    }else if(isEdit === "true"){
      router.replace({
        pathname: '/(tabs)/(wallet)/(contacts)/editContact',
        params: { walletAddress: data,id:id }
      });
    }else{
      router.replace({
        pathname: '/(tabs)/(wallet)/(contacts)/addContactScreen',
        params: { walletAddress: data }
      });
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <CameraPermissionPopup
          permanentlyDenied={permanentlyDenied}
          onRequest={requestPermission}
          onOpenSettings={() => Linking.openSettings()}
          onCancel={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing='back'
        onBarcodeScanned={handleBarCodeScanned}
      >
        {/* QR code scan overlay */}
        <View style={styles.overlay}>
          {/* Semi-transparent backgrounds */}
          <View style={styles.overlayTop} />
          <View style={styles.horizontalContainer}>
            <View style={styles.overlaySide} />

            {/* Scan area with frame */}
            <View style={styles.scanArea}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>

            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
      </CameraView>
    </View>
  );
}
