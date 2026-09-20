import ErrorCodes from '@/constants/ErrorCodes';
import { COLORS } from '@/constants/theme';
import { useUpsertBudget } from '@/hooks/mutations/useBudgetMutation';
import { Budget } from '@/lib/services/budgets';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import FormSheetModal from './FormSheetModal';

const BudgetModal = ({visible, budget, onClose, onSaved}:{
    visible:boolean;
    budget: Budget | null;
    onClose:()=>void;
    onSaved:()=>void;
}) => {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");

    const {mutateAsync : upsertBudget, isPending: saving} = useUpsertBudget();

    useEffect(()=>{
        if(visible){
            setAmount(budget ? String(budget.amount) : "");
            setError("")
        }
    },[budget, visible]);

    const handleSave = async () =>{
        const parsedAmount = parseFloat(amount.replace(/,/g, ""));

        if(!parsedAmount || parsedAmount <= 0){
            setError("Enter a valid monthly budget");
            return;
        }
        setError("");
        try{
            await upsertBudget(parsedAmount);
            onSaved();
        }catch (err){
            console.log("Error saving budget:", err);
            setError(ErrorCodes.SOMETHING_WENT_WRONG);
        }
    };
  return (
    <FormSheetModal 
        visible={visible}
        title={budget ? "Edit monthly budget" : "Set monthly budget"}
        onClose={onClose}
    >
        <Text className='text-brand-bg- text-xs font-medium mb-1.5'>Budget Modal</Text>
        <TextInput
            value={amount}
            onChangeText={(val)=>{
                setError("");
                setAmount(val);
            }}
            placeholder='e.g. 50000'
            placeholderTextColor={COLORS.placeholder}
            keyboardType='numeric'
            autoFocus
            className='bg-white- border-[#E8E6DF] rounded-xl px-4 py-3 mb-5 text-sm text-brand-bg'
        />
        {error ? (
            <Text className='text-brand-coral text-xs mb-3'>{error}</Text>
            ) : null }
        <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className='bg-brand-bg rounded-xl py-4 items-center mb-3'
            activeOpacity={0.8}
        >
           <Text className='text-white text-sm font-semibold'> {saving ? "Saving..." :"Save budget"} </Text>
        </TouchableOpacity>
    </FormSheetModal>
  )
}

export default BudgetModal