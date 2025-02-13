import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { 
  container, 
  listItem, 
  itemIcon, 
  itemName, 
} from './sharedStyles';
import { Image, FlatList } from 'react-native';

export const AllContactsScreen = (contacts: any[]) => {
  const renderContact = ({ item }: { item: { id: string, image: string, name: string } }) => (
    <TouchableOpacity style={listItem} onPress={() => {/* Handle contact press */}}>
      <Image source={{ uri: item.image }} style={itemIcon} />
      <ThemedText style={itemName}>{item.name}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={container}>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        numColumns={3}
      />
    </ThemedView>
  );
};

