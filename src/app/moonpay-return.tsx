import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';

export default function MoonPayReturnScreen() {
  useEffect(() => {
    WebBrowser.dismissBrowser();
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return null;
}
