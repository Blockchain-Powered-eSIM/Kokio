import React from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";

import { Colors } from "@/constants/Colors";

import ESIMItem, { Esim } from "../ESIMItem";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.9;
const SPACING = 8;

const ActiveESIMsScroll = ({ esims }: { esims: Esim[] }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active eSIMs</Text>
      <FlatList
        data={esims}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <ESIMItem item={item} showBuyButton={false} />
          </View>
        )}
        keyExtractor={(item) => item.catalogueId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={ITEM_WIDTH + SPACING}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 16,
    color: Colors.dark.accentForeground,
    paddingLeft: 20,
  },
  listContainer: {
    paddingHorizontal: SPACING,
  },
  itemWrapper: {
    width: ITEM_WIDTH,
  },
});

export default ActiveESIMsScroll;
