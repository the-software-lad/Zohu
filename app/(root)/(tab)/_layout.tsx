import { Feather } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from "react-native";

const nativeTabs = Platform.OS === "ios";

export default function TabLayout() {
  if(nativeTabs){
    return (
      <NativeTabs 
        backgroundColor="#0B0E14" 
        tintColor="#4A9EFF"
        iconColor={{
          default:"#5C5F68",
          selected:"#4A9EFF"
        }}
        labelStyle={{
          default:{color:"#5C5F68"},
          selected:{color:"#4A9EFF"}
        }}
      >
        <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          <Icon sf="house.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="transactions">
          <Label>Transactions</Label>
          <Icon sf="list.bullet" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="add-transaction">
          <Label>Add</Label>
          <Icon sf="plus.circle.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="assistant">
          <Label>Assistant</Label>
          <Icon sf="brain.head.profile" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Label>Profile</Label>
          <Icon sf="person.fill" />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  else{
    return (
      <Tabs screenOptions={{ 
        tabBarActiveTintColor: '#4A9EFF', 
        headerShown:false,
        tabBarInactiveTintColor:"#5C5F68",
        tabBarStyle:{
          backgroundColor:"#FFFFFF",
          borderTopColor:"#E8E6DF",
          paddingTop:4,
          height:85
        }
        }} >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color , size}) => <Feather size={size} name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color , size }) => <Feather size={size} name="list" color={color} />,
          }}
        />
        <Tabs.Screen
          name="add-transaction"
          options={{
            title: 'Add',
            tabBarIcon: ({ color, size }) => <Feather size={size} name="plus-circle" color={color} />,
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: 'Assistant',
            tabBarIcon: ({ color , size }) => <Feather size={size} name="cpu" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <FontAwesome size={28} name="user" color={color} />,
          }}
        />
      </Tabs>
    );
  }
}
