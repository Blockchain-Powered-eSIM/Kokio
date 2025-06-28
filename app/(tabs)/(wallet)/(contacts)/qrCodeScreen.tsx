import { ThemedText } from '@/components/ThemedText';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert, Linking, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

export default function QrCodeScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [scanned, setScanned] = useState(false);
  const {firstName,lastName,isEdit,monogramUrl,id} = useLocalSearchParams();
  const navigation = useNavigation();

  const handleBarCodeScanned = ({ data }:{data:string}) => {
    if (scanned) return;
    
    setScanned(true);
    console.log('Scanned wallet address:', data);

    if(isEdit === "true"){
      router.replace({
        pathname: '/(contacts)/editContact',
        params: { walletAddress: data,firstName:firstName,lastName:lastName,id:id,monogramUrl:monogramUrl }
      });
    }else{
      router.replace({
        pathname: '/(contacts)/addContactScreen',
        params: { walletAddress: data,firstName:firstName,lastName:lastName }
      });
    }
    
    
  };

  // Function to handle permission request
  const handleRequestPermission = async () => {
    const permissionResult = await requestPermission();
    
    // If permissions are still not granted after request
    if (!permissionResult.granted) {
      setPermissionDenied(true);
    } else {
      setPermissionDenied(false);
    }
  };

  // Check permission status on component mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain === false) {
      setPermissionDenied(true);
    }
  }, [permission]);

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container}><ThemedText>Loading camera permissions...</ThemedText></View>;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <ThemedText darkColor='white' variant='xl' className='text-center' >We need your permission to show the camera</ThemedText>
        
        {permissionDenied && permission.canAskAgain === false ? (
          // If permission was permanently denied, provide instructions to enable in settings
          <View>
            <ThemedText darkColor='white' variant='xl' className='text-center' >
              Camera permission was denied. Please enable camera access in your device settings.
            </ThemedText>
            <Pressable
              
              onPress={() => Linking.openSettings()} 
              className=' w-full mt-5 h-16 items-center justify-center rounded-3xl bg-primaryOrange'
               
            >
              <ThemedText bold className='text-center'>Open Settings</ThemedText>
              </Pressable>
          </View>
        ) : (
          // Standard permission request button
          <Pressable
              
          onPress={handleRequestPermission} 
          className=' w-full mt-5 h-16 items-center justify-center rounded-3xl bg-primaryOrange'
           
        >
          <ThemedText bold className='text-center'>Grant Permission</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing='back'
        onBarcodeScanned={handleBarCodeScanned}
      >
        {/* QR code scan overlay */}
        <View style={styles.overlay}>
          {/* Semi-transparent backgrounds */}
          <View style={styles.overlayTop} />
          <View style={styles.horizontalContainer}>
            <View style={styles.overlaySide} />
            
            {/* Scan area with frame */}
            <View style={styles.scanArea}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
        
        {/* Back button */}
        {/* <TouchableOpacity style={styles.backButton} onPress={()=>router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity> */}
        
       
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  horizontalContainer: {
    flexDirection: 'row',
    height: 250,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
});