// src/context/ToastContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ToastNotification from '../components/ui/ToastNotification/ToastNotification';

type MessageVariant = 'error' | 'info';

type ToastContextType = {
  showToast: (amount: string, ethAmount: string, type: string) => void;
  hideToast: () => void;
  amount: string;
  ethAmount: string;
  type: string;
  showMessage: (message: string, variant?: MessageVariant) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
  amount: '',
  ethAmount: '',
  type: '',
  showMessage: () => {},
});

function MessageToast({ message, variant, onHide }: { message: string; variant: MessageVariant; onHide: () => void }) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onHide);
  }, []);

  const bg = variant === 'error' ? '#FF3B30' : '#48484A';

  return (
    <Animated.View style={[styles.messageToast, { backgroundColor: bg, opacity }]}>
      <Text style={styles.messageText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageToast: {
    marginHorizontal: 16,
    marginTop: 56,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  messageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [toastData, setToastData] = useState({ amount: '', ethAmount: '', type: '' });
  const [msgToast, setMsgToast] = useState<{ message: string; variant: MessageVariant; key: number } | null>(null);

  const showToast = (amount: string, ethAmount: string, type: string) => {
    setToastData({ amount, ethAmount, type });
    setVisible(true);
  };

  const hideToast = () => setVisible(false);

  const showMessage = (message: string, variant: MessageVariant = 'error') => {
    setMsgToast({ message, variant, key: Date.now() });
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, amount: toastData.amount, ethAmount: toastData.ethAmount, type: toastData.type, showMessage }}>
      {children}
      {visible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, pointerEvents: 'box-none' }}>
          <GestureHandlerRootView>
            <ToastNotification
              handleToastVisible={hideToast}
              amount={toastData.amount}
              ethAmount={toastData.ethAmount}
              type={toastData.type}
            />
          </GestureHandlerRootView>
        </View>
      )}
      {msgToast && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10000, pointerEvents: 'none' }}>
          <MessageToast
            key={msgToast.key}
            message={msgToast.message}
            variant={msgToast.variant}
            onHide={() => setMsgToast(null)}
          />
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);