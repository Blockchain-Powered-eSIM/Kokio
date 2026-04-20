import React from "react";
import { Theme } from "@/constants/Colors";
import { StyleSheet } from "react-native";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { FlatList } from "react-native-reanimated/lib/typescript/Animated";

const Active = () => {
  return (
    <ThemedView>
      <ThemedText>Active eSIMs</ThemedText>
      {/* <FlatList> */}
    </ThemedView>
  );
};

const ActiveEsimItem = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>eSIM Name</CardTitle>
      </CardHeader>
      <CardContent>
        <ThemedText>eSIM Address</ThemedText>
      </CardContent>
      <CardFooter>
        <ThemedText>Status</ThemedText>
      </CardFooter>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  listContent: {
    paddingHorizontal: 10,
  },
  esimItem: {
    backgroundColor: Theme.colors.secondary,
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    width: 150,
  },
  flagContainer: {
    marginBottom: 10,
  },
  flag: {
    width: 30,
    height: 20,
    borderRadius: 4,
  },
  country: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  details: {
    fontSize: 14,
    marginBottom: 2,
  },
});

export { Active };
