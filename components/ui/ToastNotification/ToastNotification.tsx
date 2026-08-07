import { View, Image } from 'react-native'
import React, { useEffect } from 'react'
import { ThemedView } from '@/components/ThemedView';
import { useColors } from "@/hooks/useColors";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  cancelAnimation,
  FadeOutUp
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Props interface:
interface ToastProps {
  handleToastVisible: (v: boolean) => void;
  amount: string;
  ethAmount: string;
  type: string;
}

const ToastNotification = ({ handleToastVisible, amount, ethAmount, type }: ToastProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const colors = useColors();

  useEffect(() => {
    // Auto-hide toast after 3 seconds
    const timer = setTimeout(() => {
      handleToastVisible(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
    // reanimated SharedValue refs don't trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleToastVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value }
      ],
    };
  });

  const handleClose = () => {
    if (!isAnimating.value) {
      handleToastVisible(false);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => { isAnimating.value = false; })
    .onUpdate((event) => {
      // reanimated shared value mutation inside a gesture worklet
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = event.translationX;
      // reanimated shared value mutation inside a gesture worklet
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const swipeThreshold = 50;
      if (Math.abs(event.translationX) > swipeThreshold || event.translationY < -swipeThreshold) {
        isAnimating.value = true;
        const targetX = event.translationX > 0 ? 500 : -500;
        const targetY = event.translationY < -swipeThreshold ? -500 : 0;
        // reanimated shared value mutation inside a gesture worklet
        // eslint-disable-next-line react-hooks/immutability
        translateX.value = withTiming(targetX, { duration: 300 });
        // reanimated shared value mutation inside a gesture worklet
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = withTiming(targetY, { duration: 300 }, (finished) => {
          if (finished) runOnJS(handleClose)();
        });
      } else {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      className="w-[100%] absolute items-center top-[35]"
      
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle} className="w-full items-center">
          <ThemedView
            className='w-[95%] rounded-3xl items-center h-[115px] flex-row'
            style={{ backgroundColor: colors.modalBackground }}
          >
            <Image
              source={require("../../../assets/images/wallet/complete.png")}
              className='w-[34] h-[26] z-50 absolute top-[-10] right-7'
            />
            <View className='ml-6 justify-center items-center'>
              <Image
                source={require('../../../assets/images/wallet/contact1.png')}
                className='h-[60px] w-[60px]'
              />
              <ThemedText light className='mt-1'>Sandra</ThemedText>
            </View>
            <View className='ml-[20]'>
              <ThemedText>{amount}</ThemedText>
              <ThemedText darkColor={colors.foreground} variant='sm'>{ethAmount}</ThemedText>
            </View>
            <View className='ml-[70]'>
              <ThemedText>{type}</ThemedText>
              <ThemedText darkColor={colors.foreground} variant='sm'>Completed</ThemedText>
            </View>
          </ThemedView>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

export default ToastNotification;
