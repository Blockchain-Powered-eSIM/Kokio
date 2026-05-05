import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

// Completes the ASWebAuthenticationSession / Chrome Custom Tab so that
// openAuthSessionAsync in Checkout.tsx receives type: 'success'.
WebBrowser.maybeCompleteAuthSession();

export default function MoonPayReturnScreen() {
  const router = useRouter();

  // Cold-start deep-link fallback — openAuthSessionAsync handles the in-app case.
  useEffect(() => {
    router.replace('/');
  }, []);

  return null;
}
