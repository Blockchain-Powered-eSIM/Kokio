import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function CallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, []);

  return null;
}
