import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';// Make sure to import your Colors object

export const sharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.inactive,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  itemName: {
    flex: 1,
  },
  itemBalance: {
    fontWeight: 'bold',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.light.inactive,
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  gridItem: {
    alignItems: 'center',
    width: '33.33%',
    marginBottom: 16,
  },
  gridItemImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  gridItemName: {
    textAlign: 'center',
  },
});

// You can also create specific style functions if you need to compute styles dynamically
export const getItemIconStyle = (size = 40) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  marginRight: 12,
});

// Export individual styles for more granular usage
export const {
  container,
  listItem,
  itemIcon,
  itemName,
  itemBalance,
  transactionDetails,
  transactionName,
  transactionDate,
  transactionAmount,
  gridItem,
  gridItemImage,
  gridItemName,
} = sharedStyles;