import * as WebBrowser from 'expo-web-browser';

// Close any active SFSafariViewController / Chrome Custom Tab opened by
// openBrowserAsync in Checkout.tsx so the user lands back in the app.
WebBrowser.dismissBrowser();

// Keep this in case any flow still uses openAuthSessionAsync.
WebBrowser.maybeCompleteAuthSession();

export default function MoonPayReturnScreen() {
  return null;
}
