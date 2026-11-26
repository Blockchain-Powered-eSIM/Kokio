import { Linking, Platform } from 'react-native';
import { logger } from '@/utils/logger';

// iOS has no public API to open anything but this app's own Settings entry.
export function openAppSettings(): void {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.SETTINGS').catch((err) =>
      logger.error('OPEN_APP_SETTINGS_FAILED', { err }),
    );
    return;
  }
  Linking.openSettings().catch((err) => logger.error('OPEN_APP_SETTINGS_FAILED', { err }));
}
