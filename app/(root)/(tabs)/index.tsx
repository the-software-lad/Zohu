import BudgetModal from '@/components/BudgetModal';
import TransactionRow from '@/components/TransactionRow';
import { getCategoryConfig } from '@/constants/Categories';
import ImagePath from '@/constants/ImagePath';
import { useAccountsQuery } from '@/hooks/queries/useAccountQuery';
import { useBudgetQuery } from '@/hooks/queries/useBudgetQuery';
import { useTransactionsQuery } from '@/hooks/queries/userTransactionsQuery';
import { Transaction } from '@/lib/services/transactions';
import { formatPrice } from '@/lib/utils';
import { useUserStore } from '@/store/userStore';
import { useUser } from '@clerk/expo';
import { Feather } from "@expo/vector-icons";
import { isSameMonth } from "date-fns";
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import { PieChart } from "react-native-gifted-charts";
import { SafeAreaView } from 'react-native-safe-area-context';

const QUICK_ACTIONS = [
  {
    icon:"camera",
    label:"AI Receipt Scan",
    action:"scan",
    color:"#1A85FF",
  },
  {icon:"mic", label:"Voice Entry", action:"voice", color:"#FF684A"},
  {icon:"plus", label:"Add Manually", action:"manual", color:"#3DDC84"}
] as const;

function getGreeting(){
  const hour= new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening"
}


const HomeScreen = () => {

  const {user} = useUser();
  const router = useRouter();
  const currency = useUserStore((s)=>s.currency);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const { 
          data:accounts = [],
          isLoading: accountsLoading,
          isRefetching: accountsRefetching,
          refetch: refetchAccounts,
   } = useAccountsQuery();


   const {
          data:transactions = [],
          isLoading: transactionsLoading,
          isRefetching: transactionsRefetching,
          refetch: refetchTransactions,
   } = useTransactionsQuery();

   const {
          data:budget = null,
          refetch: refetchBudget
   } = useBudgetQuery();

   const loading = accountsLoading || transactionsLoading;
   const refreshing = accountsRefetching || transactionsRefetching;

   const onRefresh = ()=>{
      refetchAccounts();
      refetchTransactions();
      refetchBudget()
   }

   const totalBalance = useMemo(()=>accounts.reduce((sum, account)=>sum + account.balance, 0),[accounts]);
   
   const monthTransactions = useMemo(()=>{
      const now = new Date();
      return transactions.filter((tx)=> isSameMonth(new Date(tx.date), now));
   },[transactions]);

   const monthIncome = useMemo(
    ()=>monthTransactions.filter((tx)=>tx.type === "INCOME").reduce((sum, tx)=> sum + tx.amount, 0),[monthTransactions]
   );

   const monthExpenses = useMemo(
    ()=>monthTransactions.filter((tx)=>tx.type === "EXPENSE").reduce((sum, tx)=> sum + tx.amount, 0),[monthTransactions]
   );

   const recentTransactions = useMemo(
    ()=>transactions.slice(0,5),
    [transactions],
   );

   const expenseBreakDown = useMemo(()=>{
    const map: Record<string, number> = {};
    monthTransactions.filter((tx)=>tx.type ==="EXPENSE").forEach((tx)=>{
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
    });

    return Object.entries(map).sort((a, b)=>b[1] - a[1]).map(([category, amount])=>({
      category: category as Transaction["category"],
      amount,
      color: getCategoryConfig(category as Transaction["category"]).color,
    }));
   },[monthTransactions]);

  return (
    <SafeAreaView
      className='flex-1 bg-brand-bg'
      edges={["top"]}
    >
      <ScrollView 
        className='flex-1 bg-brand-body'
        showsVerticalScrollIndicator = {false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
        }
      >
        <View className='bg-brand-bg rounded-b-[28px] px-5 pt-5 pb[22px]' >
          <View className='flex-row justify-between items-center mb-[22px]'>
            <Image source={ImagePath.logoLight} style={{width: 80, height:"100%"}} resizeMode="contain"/>
            <View className="flex-row items-center gap-2.5">
              <View className="items-end">
                <Text className="text-brand-text-secondary text-xs">
                  {getGreeting()}
                </Text>
                <Text className='text-brand-text-primary text-base font-medium'>
                  {user?.firstName ?? "there"} {user?.lastName}
                </Text>
              </View>

              <TouchableOpacity
                onPress={()=>router.push("/(root)/(tabs)/profile")}
                className='w-[38px] h-[38px] round-full bg-[#1A1D26] items-center justify-center overflow-hidden'
              >
                {
                  user?.imageUrl && user.hasImage ?(
                    <Image
                      source={{uri: user.imageUrl}}
                      style={{width:38, height:38}}
                      resizeMode='cover'
                      />
                  ):(<Feather name="user" size={38} color="#8A8D96" />
                    
                  )
                }
              </TouchableOpacity>
            </View>
          </View>
          <View className='mb-[22px]'>
            <Text className='text-brand-text-secondary text-xs mb-1.5'>Total balance</Text>
            <Text className='text-brand-text-primary text-[38px] font-medium tracking-light'>
              {formatPrice(totalBalance, currency)}
            </Text>
            <View className='flex-row gap-3.5 mt-2.5'>
              <View className='flex-row items-center gap-1.5'>
                  <Feather name="arrow-up-right" size={14} color="#3DDC84" />
                  <Text className='text-brand-success text-[13px]'>
                    {formatPrice(monthIncome, currency)}
                  </Text>
              </View>

              <View className='flex-row items-center gap-1.5'>
                <Feather name="arrow-down-right" size={14} color="#FF6B4A" />
                <Text className='text-brand-coral text-[13px]'>
                  {formatPrice(monthExpenses, currency)}
                </Text>
              </View>
            </View>
            
            <View className='flex-row gap-2.5 mt-3'>
                {QUICK_ACTIONS.map((action)=>(
                  <TouchableOpacity 
                    key={action.label} 
                    onPress={()=>router.push({pathname:"/(root)/(tabs)/add-transaction", params:{action:action.action}})}
                    activeOpacity={0.7}
                    className='flex-1 bg-brand-surface rounded-2xl border border-brand-surface-border py-4 items-center gap-2'
                    >
                    <View className='w-9 h-9 rounded-full items-center justify-center' style={{backgroundColor : `${action.color}26`}}>
                      <Feather name={action.icon} size={17} color={action.color}/>
                    </View>
                    <Text className='text-[#B8BAC2] text-[11px] font-medium text-center'>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        </View>
        
        <View className='px-5 pt-[18px] pb-5'>
          <TouchableOpacity 
            onPress={()=>router.push("/(root)/(tabs)/assistant")}
            className='bg-white rounded-[18px] border border-[#E8E6DF] p-5 flex-row items-center gap-2.5 mb-[18px]'
          >
            <View className='w-[26px] h-[26px] rounded-full bg-[#4A9EFF1A] items-center justify-center' >
              <View className='w-[7px] h-[7px] rounded-full bg-brand-blue' />
            </View>
            <Text className='text-brand-text-muted text-[13px] flex-1'> Ask AI anything about your money</Text>
            <Feather name="arrow-right" size={16} color="#4A9EFF"/>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={()=>setBudgetModalOpen(true)}
            activeOpacity={0.8}
            className='bg-white rounded-[18px] border border-[#E8E6DF] p-4 mb-[18px] '
          >
            <View className='flex-row items-center justify-between mb-1.5'>
              <Text className='text-[#1A1D26] text-sm font-medium'>Monthly budget</Text>
              <Feather name="edit-2" size={13} color="#8A8D96" />
            </View>
            {
              budget ?(
                <>
                  <Text className='text-brand-text-secondary text-xs mb-2'>
                    {formatPrice(monthExpenses, currency)} of {" "}
                    {formatPrice(budget.amount, currency)} spent
                  </Text>
                  <View className='h-2 rounded-full bg-[#F0EEE7] overflow-hidden'>
                    <View className='h-2 rounded-full'
                      style={{
                        width:`${Math.min(Math.round((monthExpenses/budget.amount)*100),100,)}%`,
                        backgroundColor: monthExpenses >= budget.amount ? "#FF6B4A" : monthExpenses >= budget.amount * 0.8 ? "#F7DC6F" : "#3DDC84"
                      }}
                    />
                  </View>
                </>
              ):(
                <Text className='text-brand-text-secondary text-xs'>
                  Tap to set a monthly spending budget
                </Text>
              )
            }
          </TouchableOpacity>
          {
            expenseBreakDown.length > 0 && (
              <View className='bg-white rounded-[18px] border border-[#E8E6DF] p-4 mb-[18px]'>
                <Text className='text-[#1A1D26] text-sm font-medium mb-3'>
                  Expense breakdown (this month)
                </Text>
                <View className='flex-row items-center'>
                  <PieChart
                   data={expenseBreakDown.map((c)=>({
                    value:c.amount,
                    color:c.color
                   }))}
                   radius={60}
                   innerRadius={38}
                   innerCircleColor="#FFFFFF"
                  />
                  <View className='flex-1 ml-4 gap-1.5'>
                    {expenseBreakDown.slice(0,6).map((item)=>(
                      <View className='flex-row items-center justify-between' key={item.category}>
                        <View className='flex-row items-center gap-1.5'>
                          <View className='w-2 h-2 rounded-full' style={{backgroundColor: item.color}} />
                          <Text className='text-brand-text-secondary text-[11px]'>
                            {getCategoryConfig(item.category).label}
                          </Text>
                        </View>
                        <Text className='text-brand-bg- text-[11px] font-medium'>
                          {formatPrice(item.amount, currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )
          }

          <View className='flex-row justify-between items-center mb-3'>
            <Text className='text-[#1A1D26] text-sm font-medium'>Recent Transactions</Text>
            <TouchableOpacity onPress={()=>router.push("/(root)/(tabs)/transactions")} activeOpacity={0.7}>
              <Text className='text-brand-text-secondary text-xs'> See all</Text>
            </TouchableOpacity>
          </View>
          {
            loading ? (<View className='items-center py-6'><ActivityIndicator color="#4A9EFF"/></View>) : 
            (recentTransactions.length === 0 ? (
              <View className='items-center py-6'>
                <Feather name="inbox" size={28} color="#BDC3C7" />
                <Text className='text-brand-text-muted text-sm mt-3'> No transactions yet</Text>
              </View>
            ):(
            recentTransactions.map((tx)=>( 
             <TransactionRow key={tx.id} tx={tx} />

            ))
        ))}
        </View>
      </ScrollView>
      {user && (
          <BudgetModal 
            visible={budgetModalOpen}
            budget={budget}
            onClose={()=>setBudgetModalOpen(false)}
            onSaved={()=>setBudgetModalOpen(false)}
          />
        )}
    </SafeAreaView>
  )
}

export default HomeScreen