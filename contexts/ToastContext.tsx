// src/context/ToastContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ToastNotification from '../components/ui/ToastNotification/ToastNotification';

type ToastContextType = {
  showToast: (amount: string, ethAmount: string, type: string,name:string,image:string) => void;
  hideToast: () => void;
  amount: string;
  ethAmount: string;
  type: string;
  name:string;
  image:string;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
  amount: '',
  ethAmount: '',
  type: '',
  name: '',
  image: '',
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [toastData, setToastData] = useState({
    amount: '',
    ethAmount: '',
    type: '',
    name: '',
    image: '',
  });

  const showToast = (amount: string, ethAmount: string, type: string,name:string,image:string) => {
    setToastData({ amount, ethAmount, type,name,image });
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
        type: toastData.type,
        name:toastData.name,
        image:toastData.image
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
              name={toastData.name}
              image={toastData.image}
            />
          </GestureHandlerRootView>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);