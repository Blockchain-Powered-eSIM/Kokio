// src/context/ToastContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ToastNotification from '../components/ui/ToastNotification/ToastNotification';

type ToastContextType = {
  showToast: (amount: string, ethAmount: string, type: string) => void;
  hideToast: () => void;
  amount: string;
  ethAmount: string;
  type: string;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
  amount: '',
  ethAmount: '',
  type: ''
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [toastData, setToastData] = useState({
    amount: '',
    ethAmount: '',
    type: ''
  });

  const showToast = (amount: string, ethAmount: string, type: string) => {
    setToastData({ amount, ethAmount, type });
    setVisible(true);
  };

  const hideToast = () => {
    setVisible(false);
  };

  return (
    <ToastContext.Provider 
      value={{ 
        showToast, 
        hideToast,
        amount: toastData.amount,
        ethAmount: toastData.ethAmount,
        type: toastData.type
      }}
    >
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
            <ToastNotification 
              handleToastVisible={hideToast}
              amount={toastData.amount}
              ethAmount={toastData.ethAmount}
              type={toastData.type}
            />
          </GestureHandlerRootView>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);