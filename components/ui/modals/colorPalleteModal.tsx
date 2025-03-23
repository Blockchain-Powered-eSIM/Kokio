import { View, TouchableOpacity, Modal, Text, Pressable } from 'react-native';
import React, { useState } from 'react';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

;

const ColorPaletteModal = ({ 
  isVisible, 
  onClose, 
  onSelectColor,
  colors = [
    '#FF453A', // Red
    '#FF9F0A', // Orange
    '#FFD60A', // Yellow
    '#30D158', // Green
    '#64D2FF', // Light Blue
    '#0A84FF', // Blue
    '#5E5CE6', // Purple
    '#BF5AF2', // Violet
    '#FF2D55', // Pink
    '#AC8E68', // Brown
  ]
}) => {
  const handleColorSelect = (color:string) => {
    const newcolor = color.slice(1)
    onSelectColor(newcolor);
    
    setSelectedColor(color);
  };
  const [selectedColor, setSelectedColor] = useState("");


  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <ThemedView darkColor="#242427" className="w-5/6 rounded-2xl  p-5  items-center">
          <View className="flex-row flex-wrap justify-center mb-4">
            {colors.map((color, index) => (
              <TouchableOpacity
              key={index}
              className="w-10 h-10 rounded-full m-2 justify-center items-center"
              style={{
                backgroundColor: color,
                ...(selectedColor === color && { borderWidth: 2, borderColor: "white" }),
              }}
              onPress={() => handleColorSelect(color)}
              activeOpacity={0.7}
            >
            
                {/* Check icon for selected color (optional) */}
                {/* You can add a check icon here if you want to show the currently selected color */}
              </TouchableOpacity>
            ))}
          </View>
          <ThemedText className="text-lg font-bold mb-4">Choose Color</ThemedText>
          <View className="flex-row gap-x-[-10] justify-between w-full border-t border-gray-600 pt-4">
            <Pressable className="px-5  ml-5 items-center justify-center py-2" onPress={onClose}>
              <ThemedText className="text-gray-400 text-center text-base">Cancel</ThemedText>
            </Pressable>
            <Pressable className="px-5 border-l border-gray-600 pl-[60]  mr-7 py-2" onPress={onClose}>
              <ThemedText bold darkColor='#FF9F0A' className="text-orange-500  text-base">Done</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
};

export default ColorPaletteModal;