import CurrencyPicker, { ALL_CURRENCIES } from "@/components/CurrencyPicker";
import { useSupabase } from "@/hooks/useSupabase";
import { OnboardingFormValues, onboardingSchema } from "@/lib/schemas/onboarding";
import { useUserStore } from "@/store/userStore";
import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from "expo-router";
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorCodes from "../../constants/ErrorCodes";
import ImagePath from "../../constants/ImagePath";

const OnboardingScreen = () => {

    const {user} = useUser();
    const router = useRouter();
    const setCurrency = useUserStore((s)=>s.setCurrency);
    const setNeedsOnboarding = useUserStore((s)=> s.setNeedsOnboarding);
    const {control, handleSubmit, formState:{ errors : formErrors},} = useForm <OnboardingFormValues> ({
        resolver : zodResolver(onboardingSchema),
        mode : "onBlur",
        defaultValues : { startingBalance : ""},
    });

    const [selectedCurrency, setSelectedCurrency] = useState(
        ALL_CURRENCIES.find((c)=>c.code === "INR")?? ALL_CURRENCIES[0],
    );

    const [pickerOpen, setPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const authSupabase = useSupabase();

    const handleSave = async ({startingBalance}: OnboardingFormValues)=>{
        const parsed = parseFloat(startingBalance.replace(/,/g,""));
        setSaving(true);
        setError("");

        const {error : updateError} = await authSupabase.from("users").update({currency:selectedCurrency.code,}).eq("clerk_id",user!.id);
        if (updateError){
            setSaving(false);
            setError(ErrorCodes.SOMETHING_WENT_WRONG);
            return;
        }

        const {data : defaultAccount, error:accountFetchError} = await authSupabase.from("accounts").select("id,balance").eq("user_id",user!.id).eq("is_default",true).single();
        
        if(accountFetchError || !defaultAccount){
            setSaving(false);
            setError(ErrorCodes.SOMETHING_WENT_WRONG);
            return;
        }

        const {error: txError} = await authSupabase.from("transactions").insert({
            user_id:user!.id,
            account_id: defaultAccount.id,
            type: "INCOME",
            amount:parsed,
            category:"other_income",
            description:"starting balance",
            date:new Date().toISOString(),
            input_method:"MANUAL",
        });

        if(txError){
            setSaving(false);
            setError(ErrorCodes.SOMETHING_WENT_WRONG);
            return;
        }

        const {error: balanceError} = await authSupabase.from("accounts").update({balance:defaultAccount.balance + parsed}).eq("id",defaultAccount.id);

        setSaving(false);

        if(balanceError){
            setError(ErrorCodes.SOMETHING_WENT_WRONG);
            return;
        }
        setCurrency(selectedCurrency.code);
        setNeedsOnboarding(false);
        router.replace("/(root)/(tabs)");
    };

  return (
    <SafeAreaView className='flex-1 bg-brand-body' edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding":"height"} className="flex-1">
        <View className='flex-1 justify-center px-6 -mt-16'>
            <Image
                source={ImagePath.logo}
                resizeMode='contain'
                className='w-36 h-14 mb-10'
            />
            <Text className='text-3xl font-bold text-[#1A1D26] mb-2'>
                Lets&apos;s get you setup
            </Text>
            <Text className='text-brand-text-muted text-sm mb-10'>
                A couple of quick details to personalise your experience
            </Text>
            <Text className='text-brand-bg text-xs font-medium mb-1.5'>
                Starting balance
            </Text>
            <View className="flex-row items-center bg-white border-[#E8E6DF] rounded-xl px-4 mb-1">
                <Text className="text-brand-text-secondary text-sm mr-2">
                    {selectedCurrency.symbol}
                </Text>
                <Controller  
                control={control}
                name="startingBalance"
                render={({field : {value, onChange}})=>{
                return(
                    <TextInput  
                        className='flex-1 py-3.5 mb-1.5 text-sm text-brand-bg'
                        placeholder='e.g. 50000'
                        keyboardType="numeric"
                        returnKeyType="done"
                        placeholderTextColor="#8A8D96"
                        value={value}
                        onChangeText={(v)=>{
                            setError("");
                            onChange(v);
                        }}
                    />
                );}}
                />
            </View>
            {(formErrors.startingBalance) && (
                <Text className='text-brand-coral mb-4 text-sm'>
                    {formErrors.startingBalance?.message }
                </Text>
            )}
            <View className="mb-4" />
            <Text className="text-brand-bg text-xs font-medium mb-1.5">
                Currency
            </Text>
            <TouchableOpacity 
                onPress={()=>setPickerOpen(true)}
                className="flex-row items-center justify-between bg-white border border-[#E8E6DF] rounded-xl px-4 py-3.5 mb-6"
                activeOpacity={0.7}
            >
                <Text className="text-sm text-brand-bg">
                    {selectedCurrency.symbol} {selectedCurrency.code}-{" "}
                    {selectedCurrency.name}
                </Text>
                <Feather name="chevron-down" size={16} color="#8A8D96"/>
            </TouchableOpacity>

            <TouchableOpacity 
                className='bg-brand-bg py-4 rounded-xl items-center my-4'
                onPress={handleSubmit(handleSave)}
                disabled={saving}
                activeOpacity={0.8}
            >
                <Text className="text-white text-sm font-semibold">
                    {saving ? "Saving...":"Get started"}
                </Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <CurrencyPicker 
        visible={pickerOpen}
        selectedCode={selectedCurrency.code}
        onSelect={(currency)=>{
            setSelectedCurrency(currency);
            setPickerOpen(false);
        }}
        onClose={()=>setPickerOpen(false)}
      />
    </SafeAreaView>
  )
}

export default OnboardingScreen;