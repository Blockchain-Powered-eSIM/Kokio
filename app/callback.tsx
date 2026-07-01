import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function CallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
