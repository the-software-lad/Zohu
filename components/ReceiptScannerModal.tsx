import { COLORS } from "@/constants/theme";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

const ReceiptScannerModal = ({visible, onClose, onCaptured}:{
    visible: boolean;
    onClose: ()=>void;
    onCaptured: (base64: string, mimeType:string)=>void
}) => {
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [capturing, setCapturing] = useState(false);

    useEffect(()=>{
        if(visible && !permission?.granted) requestPermission();
    },[visible, permission?.granted, requestPermission]);


    const handleCapture = async ()=> {
        if(!cameraRef.current || capturing) return;
        setCapturing(true);
        try{
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.6
            });
            if(photo?.base64) onCaptured(photo.base64, "image/jpeg")
        }catch (err){
            console.error("Camera capture failed:", err)
        } finally{
            setCapturing(false);
        }
    };
    

    const handlePickFromLibrary = async () => {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if(!libraryPermission) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes : ["images"],
            quality: 0.7,
            base64: true
        });
        if(result.canceled) return;

        const asset = result.assets[0];
        if(asset.base64) onCaptured(asset.base64, asset.mimeType ?? "image/jpeg");
    };
  return (
    <Modal visible={visible} animationType="slide">
        <View className="flex-1 bg-black">
            {permission?.granted && (
                <CameraView ref={cameraRef} style={{flex:1}} facing="back"/>
                )}
        </View>
        <View className="absolute inset-0 items-center justify-center px-10">
            <View className="w-full aspect-[3/4] rounded-2xl border-2 border-white/70" style={{ borderStyle:"dashed" }} />
            <SafeAreaView className="absolute inset-0" edges={["top", "bottom"]}>
                <View className="flex-row items-center justify-between px-5 pt-3">
                    <TouchableOpacity 
                        onPress={onClose}
                        className="w-10 h-10 rounded=full bg-black/40 items-center justify-center"
                    >
                        <Feather name="x" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 mr-32">
                        <MaterialCommunityIcons name="robot-outline" size={12} color={COLORS.teal} />
                        <Text className="text-white text-[11px] font-medium">
                            Align the receipt
                        </Text>
                    </View>
                </View>
                <View className="flex-1" />
                <View className="flex-row items-center justify-between px-10 pb-6">
                    <TouchableOpacity
                        onPress={handlePickFromLibrary}
                        disabled={capturing}
                        className="w-12 h-12 rounded-full bg-black/40 items-center justify-center"
                        activeOpacity={0.8}
                    >
                        <Feather name="image" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={handleCapture}
                        disabled={capturing || !permission?.granted }
                        activeOpacity={0.8}
                        className="w-[72px] h-[72px] rounded-full bg-brand-blue items-center justify-center"
                        style={{ borderWidth:3, borderColor: "rgba(255,255,255,0.85)" }}
                    >
                        {
                            capturing ? (
                                <ActivityIndicator/>
                            ):
                            (
                                <Feather name="camera" size={26} color="#fff" />
                            )
                        }
                    </TouchableOpacity>
                    <View className="w-12 h-12" />
                </View>
            </SafeAreaView>
            {
                !permission?.granted && permission?.canAskAgain === false && (
                    <View className="absolute inset-0 items-center justify-center bg-black/80 px-10">
                        <Feather name="camera-off" size={32} color="#8A8D96" />
                        <Text className="text-white/70 text-sm mt-3 text-center">
                            Camera access is off. Enable it from Settings to scan receipts.
                        </Text>
                        <TouchableOpacity onPress={onClose} className="mt-6">
                            <Text className="text-white text-sm font-medium">Close</Text>
                        </TouchableOpacity>
                    </View>
                )
            }
        </View>
    </Modal>
  )
}

export default ReceiptScannerModal