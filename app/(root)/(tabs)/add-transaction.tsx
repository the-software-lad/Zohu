import AiActionCard from '@/components/AiActionCard';
import CalenderPicker from '@/components/CalenderPicker';
import PillGroup from '@/components/PillGroup';
import ReceiptScannerModal from '@/components/ReceiptScannerModal';
import VoiceRecorderModal from '@/components/VoiceRecorderModal';
import { CategoryKey, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/Categories';
import ErrorCodes from '@/constants/ErrorCodes';
import { AI_GRADIENT, AI_GRADIENT_REVERSE } from '@/constants/theme';
import { useCreateTransaction } from '@/hooks/mutations/useTransactionMutation';
import { useAccountsQuery } from '@/hooks/queries/useAccountQuery';
import { useSupabase } from '@/hooks/useSupabase';
import { TransactionFormValues, transactionSchema } from '@/lib/schemas/transaction';
import { Account } from '@/lib/services/accounts';
import { ExtractedTransaction, extractTransactionFromReceipt } from '@/lib/services/extractTransaction';
import { InputMethod } from '@/lib/services/transactions';
import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_VALUES = (accounts : Account[]): TransactionFormValues => ({
  type:"EXPENSE",
  amount:"",
  category: "food",
  accountId: accounts[0]?.id ?? "",
  description: "",
  date: new Date(),
});

const TYPE_OPTIONS = [
  {key:"EXPENSE" as const, label:"Expense"},
  {key:"INCOME" as const, label:"Income"}
];

const AddTransaction = () => {
  const {user} = useUser();
  const router = useRouter();
  const supabase = useSupabase();
  const params = useLocalSearchParams<{action?: string}>();


  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    isError: accountsError
  }= useAccountsQuery();

  const {mutateAsync: createTransaction, isPending: saving} = useCreateTransaction();

  const [error, setError] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [inputMethod, setInputMethod] = useState<InputMethod>("MANUAL");
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset: resetForm,
    formState:{errors},
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode:"onBlur",
    defaultValues:DEFAULT_VALUES([]),
  });

  const type = watch("type");
  const category = watch("category");
  const accountId = watch("accountId");
  const date = watch("date");

  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(()=>{
    if (accounts.length > 0) resetForm(DEFAULT_VALUES(accounts));
  },[accounts, resetForm]);

  const onSubmit = async(values: TransactionFormValues)=>{
    if (!user) return;

    const parsed = parseFloat(values.amount.replace(/,/g, ""));

    const {error : createError} = await createTransaction({
      user_id:user.id,
      account_id:values.accountId,
      type:values.type,
      amount:parsed,
      category: values.category,
      description: values.description?.trim() || null,
      date:values.date.toISOString(),
      input_method:inputMethod,
      voice_transcript: inputMethod === "VOICE" ? voiceTranscript : null,
    });

    if(createError){
      setError(ErrorCodes.SOMETHING_WENT_WRONG);
      return;
    }

    resetForm(DEFAULT_VALUES(accounts))

    setInputMethod("MANUAL");
    setVoiceTranscript(null);
    if(router.canGoBack()){
      router.back();
    }else{
      router.replace("/(root)/(tabs)/transactions");
    }
  };

  const applyExtraction = (result: ExtractedTransaction)=>{
    const categoryList = result.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const isValidCategory = (key: CategoryKey | null): key is CategoryKey => !!key && categoryList.some((c) => c.key === key);

      if(result.type) setValue("type", result.type);
      if (isValidCategory(result.category)) {
          setValue("category", result.category);
        } else if (result.type) {
          setValue("category", categoryList[0].key);
        }
      if(result.amount != null) setValue("amount", String(result.amount));
      if(result.description) setValue("description", result.description);
      if(result.date){
        const parsedDate = new Date(result.date);
        if(isValid(parsedDate) && parsedDate <= new Date()){
          setValue("date", parsedDate)
        }
      }
      
    const missing=[
      result.amount == null && "amount",
      !isValidCategory(result.category) && "category",
    ].filter(Boolean);

    if (missing.length > 0){
      Alert.alert("Review before saving",`Couldn't confidently read the ${missing.join(" and ")}. Please fll it in.`,);
    }
  };

  const handleReceiptCaptured = async (base64: string, mimeType: string) =>{
    setScannerOpen(false);
    setScanning(true);
    try{
      const extracted = await extractTransactionFromReceipt(supabase, base64, mimeType);
      applyExtraction(extracted);
      setInputMethod("RECEIPT_SCAN");
    }
    catch(err){
      console.error("Receipt scanning failed:", err);
      Alert.alert("Error", "Couldn't read the receipt. Try again or enter it manually");
    }
    finally{
      setScanning(false);
    }
  };

  const handleVoiceExtracted = (result : ExtractedTransaction)=>{
    applyExtraction(result);
    setVoiceTranscript(result.transcript);
    setInputMethod("VOICE");
  };

  useEffect(()=>{
    if(params.action == 'scan'){
      setScannerOpen(true);
      router.setParams({action: undefined});
    }else if(params.action === "voice"){
      setVoiceModalOpen(true);
      router.setParams({action:undefined});
    }
  },[params.action, router])

  return (
    <SafeAreaView className='flex-1 bg-brand-body' edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className='text-brand-bg text-xl font-semibold'>
          Add Transaction
        </Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios"? "padding" : "height"}
        className='flex-1'

      >
        
        {
          loadingAccounts ? (
            <View className='flex-1 items-center justify-center'>
              <ActivityIndicator color="#4A9EFF" />
            </View>
          ): accountsError ? (
            
            <View className='flex-1 items-center justify-center px-10'>
              <Feather name="alert-circle" size={32} color="#FF6B4A" />
              <Text className='text-brand-text-muted text-sm mt-3 text-center'>
                Couldn&apos;t load your accounts.
              </Text>
            </View>
          ):
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal:20,
              paddingBottom:100,
            }}
          >
            <View className='flex-row gap-2.5 mb-4'>
              <AiActionCard 
                icon="camera"
                title="Scan Receipt"
                subtitle='Snap a photo'
                colors={AI_GRADIENT}
                onPress={()=> setScannerOpen(true)}
              />

              <AiActionCard 
                icon="mic"
                title="Voice Log"
                subtitle='Just say it'
                colors={AI_GRADIENT_REVERSE}
                onPress={()=> setVoiceModalOpen(true)}
              />
            </View>
            <View className='flex-row bg-white rounded-xl border border-[#E8E6DF] p-1 mb-4'>
              {
                TYPE_OPTIONS.map((typ)=>(
                  <TouchableOpacity
                    key={typ.key}
                    onPress={()=>{
                      setValue("type", typ.key);
                      setValue("category", typ.key === "INCOME" ? INCOME_CATEGORIES[0].key : EXPENSE_CATEGORIES[0].key);
                    }}
                    className={`flex-1 py-2 rounded-lg items-center ${type === typ.key ? "bg-brand-bg" : ""}`}
                  >
                    <Text className={`text-xs font-medium ${type === typ.key ? "text-white" : "text-brand-text-secondary"}`}>
                      {typ.label}
                    </Text>
                  </TouchableOpacity>
                ))
              }
            </View>
            <Text className='text-brand-bg text-xs font-medium mb-1.5'>
              Amount
            </Text>
            <Controller 
              control={control}
              name="amount"
              render={({field: {value, onChange, onBlur}})=>(
                <TextInput
                  value={value}
                  onChangeText={(val)=>{
                    setError("");
                    onChange(val);
                  }}
                  onBlur={onBlur}
                  placeholder='0'
                  placeholderTextColor="#8A8D96"
                  keyboardType='numeric'
                  className='bg-white border border-[#E8E6DF] rounded-xl px-4 py-3.5 text-sm text-brand-bg'
                />
  )}
            />
            {
              errors.amount && (
                <Text className='text-brand-coral text-xs mt-1.5'>
                  {errors.amount.message}
                </Text>
              )
            }
            <View className='mb-4'/>
            <Text className='text-brand-bg text-xs font-medium mb-1.5'>
              Category
            </Text>
            <View className='mb-4'>
              <PillGroup options={categories.map((c)=>({
                key: c.key,
                label: c.label,
                icon: c.icon,
              }))} 
              value={category}
              onChange={(key)=>setValue("category", key)}
              />
            </View>

            <Text className='text-brand-bg text-xs font-medium mb-1.5'>
              Account
            </Text>
            <View className='mb-4'>
              <PillGroup options={accounts.map((acc)=>({
                key: acc.id,
                label: acc.name,
              }))} 
              value={accountId}
              onChange={(key)=>setValue("accountId", key)}
              />
            </View>
            {
              errors.accountId && (
                <Text className='text-brand-coral text-xs mb-3'>{errors.accountId.message}</Text>
              )
            }
            <View className='mb-3'/>

            <Text className='text-brand-bg text-xs font-medium mb-1.5'>Date</Text>
            <TouchableOpacity
              onPress={()=> setDatePickerOpen((v)=> !v)}
              className='flex-row items-center justify-between bg-white border border-[#E8E6DF] rounded-xl px-4 py-3.5 mb-1'
              activeOpacity={0.7}
            >
              <Text className='text-sm text-brand-bg' >
                {format(date, "d MMM yyyy")}
              </Text>
              <Feather name="calendar" size={16} color="#5C5F68" />
            </TouchableOpacity>
            {
              datePickerOpen && (
                <View className='bg-white border border-[#E8E6DF] rounded-xl mb-4 overflow-hidden'>
                  <CalenderPicker 
                    value={date} 
                    maximumDate={new Date()}
                    onChange={(selectedDate)=>{
                      setValue("date", selectedDate);
                      setDatePickerOpen(false)
                    }}
                  />
                </View>
              )
            }
            {!datePickerOpen && <View className='mb-4'/>}
            <Text className='text-brand-bg text-xs font-medium mb-1.5'> Description (optional)</Text>
            <Controller 
              control={control}
              name="description"
              render={({field:{value, onChange, onBlur}})=>(
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder='e.g. Swiggy Order'
                  placeholderTextColor="#8A8D96"
                  className='bg-white border border-[#E8E6DF] rounded-xl px-4 py-3.5 mb-4 text-sm text-brand-bg'
                />
              )}
            />
            {error ?(<Text className='text-brand-coral text-xs mb-4'>{error}</Text>):null}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
              className='bg-brand-bg rounded-xl py-4 items-center mb-2'
              activeOpacity={0.85}
            >
              <Text className='text-white text-sm font-semibold'>
                {saving ? "Saving...":"Save Transaction"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        }
      </KeyboardAvoidingView>
      {scanning && (
        <View className='absolute inset-0 items-center justify-center bg-black/40'>
          <View className='bg-white rounded-2xl px-6 py-5 items-center'>
            <ActivityIndicator color="#4A9EFF"/>
            <Text className='text-brand-bg text-sm mt-3'>Reading receipt...</Text>
          </View>
        </View>
      )}

      <ReceiptScannerModal
        visible={scannerOpen}
        onClose={()=> setScannerOpen(false)}
        onCaptured = {handleReceiptCaptured}
      />

      <VoiceRecorderModal
        visible={voiceModalOpen}
        onClose={()=>setVoiceModalOpen(false)}
        onExtracted={handleVoiceExtracted}
      />
    </SafeAreaView>
  )
}

export default AddTransaction
