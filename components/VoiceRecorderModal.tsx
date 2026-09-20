import { AI_GRADIENT, COLORS, RECORDING_GRADIENT } from '@/constants/theme';
import { useSupabase } from '@/hooks/useSupabase';
import { ExtractedTransaction, extractTransactionFromVoice } from '@/lib/services/extractTransaction';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { BlurView } from 'expo-blur';
import { File } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';

type Status = "idle" | "recording" | "processing" | "error";

const VOICE_RECORDING_OPTIONS = {
    ...RecordingPresets.HIGH_QUALITY,
    extension: ".m4a",
};

const VoiceRecorderModal = ({visible, onClose, onExtracted}:{
    visible: boolean;
    onClose: ()=> void;
    onExtracted:(result : ExtractedTransaction)=>void;
}) => {

    const supabase = useSupabase();
    const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
    const [status, setStatus] = useState<Status>("idle");
    const [seconds, setSeconds] = useState(0);

    useEffect(()=>{
        if(!visible){
            setStatus("idle");
            setSeconds(0);
            return;
        }
        (async ()=>{
            const { granted } = await requestRecordingPermissionsAsync();
            if(!granted){
                setStatus("error");
                return;
            }
            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode : true,
            });
        })();
    },[visible]);

    useEffect(()=>{
        if(status !== "recording") return;
        const interval = setInterval(()=> setSeconds((s)=> s+1) ,1000);
        return ()=> clearInterval(interval);
    },[status]);

    const stopRecording = async ()=>{
        setStatus("processing");
        await recorder.stop();

        try{
            const uri = recorder.uri;
            if(!uri) throw new Error("No recording captured");

            const file = new File(uri);
            const base64 = await file.base64();
            const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/m4a";
            const result = await extractTransactionFromVoice(supabase, base64, mimeType);
            onExtracted(result);
            onClose();
        }
        catch(error){
            console.error("Voice extraction failed" ,error);
            setStatus("error")
        }
    };

    const startRecording = async ()=>{
        setSeconds(0);
        await recorder.prepareToRecordAsync();
        recorder.record();
        setStatus("recording")
    };

  return (
    <Modal visible={visible} animationType='slide' transparent>
        <View className='flex-1 justify-end'>
            <BlurView intensity={40} tint="dark" className='absolute inset-0' />
            <View style={{
                width:"100%",
                alignItems: "center",
                backgroundColor: "#14162A",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: 40
            }}>
                {
                    status === "error" ?
                    <>
                        <Feather name="alert-circle" size={32} color="#FF6B4A" />
                        <Text className="text-white/60 text-sm mt-3 mb-6 text-center">
                            Couldn&apos;t proess that. check your microphone permission and try again.
                        </Text>
                        <TouchableOpacity 
                            className='bg-white/10 rounded-xl px-6 py-3.5'
                            onPress={onClose}
                        >
                            <Text className='text-white text-sm font-semibold'>Close</Text>
                        </TouchableOpacity>
                    </>:
                    <>
                        <View className='flex-row items-center gap-1.5 mb-1'>
                            <MaterialCommunityIcons
                                name="robot-outline"
                                size={13}
                                color={COLORS.teal}
                            />
                            <Text 
                                className='text-[11px] font-semibold tracking-wide uppercase'
                                style={{color: COLORS.teal}}
                            >
                                AI voice log
                            </Text>
                        </View>
                        <Text className='text-white text-base font-semibold mb-1'>
                            {
                                status === "recording" ?
                                "Listening..." : status ==="processing" ?  "Understading that..." : "Tell me about a transaction"
                            }
                        </Text>
                        <Text
                            className='text-white/50 text-xs mb-8 text-center px-4'
                        >
                            {
                                status === "recording" ? `${Math.floor(seconds/60)}:${String(seconds % 60).padStart(2, "0")}`: status === "processing" ? "transcribing and extracting the details" : '"I Spent 400 on groceries yesterday"'
                            }
                        </Text>
                        <View className='w-24 h-24 items-center justify-center mb-8'>
                            {
                                status === "processing" ?<ActivityIndicator size="large" color={COLORS.teal}/>:(
                                    <TouchableOpacity
                                        onPress={
                                            status === "recording" ? stopRecording : startRecording
                                        }
                                        activeOpacity={0.8}
                                        className='w-16 h-16 rounded-full items-center justify-center'
                                        style={{
                                            backgroundColor : status === "recording" ? RECORDING_GRADIENT[0] : AI_GRADIENT[0], 
                                        }}
                                    >
                                        <Feather 
                                            name = {status === "recording" ? "square" : "mic"}
                                            size={24}
                                            color="#fff"
                                        />
                                    </TouchableOpacity>
                                )
                            }
                        </View>
                        <TouchableOpacity
                        onPress={onClose}
                        disabled={status === "processing"}
                        >
                        <Text className='text-white/40 text-sm'>Cancel</Text>
                        </TouchableOpacity>
                    </>
                }
                
            </View>
        </View>
    </Modal>
  )
}

export default VoiceRecorderModal
