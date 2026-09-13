
import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import React from 'react';

const AuthLayout = () => {
  const {isSignedIn, isLoaded} = useAuth();
    if(!isLoaded){
      return null;
    }
    if(isSignedIn){
      return <Redirect href="/" />
    }
  return (
    <Stack screenOptions={{headerShown:false}} />
  )
}

export default AuthLayout