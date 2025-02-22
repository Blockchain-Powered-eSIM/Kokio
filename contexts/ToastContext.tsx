// src/context/ToastContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ToastNotification from '../components/ui/ToastNotification/ToastNotification';

type ToastContextType = {
  showToast: () => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showToast = () => setVisible(true);
  const hideToast = () => setVisible(false);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <View 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            pointerEvents: 'box-none'
          }}
        >
          <GestureHandlerRootView>
            <ToastNotification handleToastVisible={hideToast} />
          </GestureHandlerRootView>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);