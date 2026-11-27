import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function CallbackScreen() {
  useEffect(() => {
    router.replace('/');
  }, []);

  return null;
}
