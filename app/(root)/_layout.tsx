import { useAuth } from '@clerk/expo';
import { Redirect, Slot } from 'expo-router';
import React from 'react';

const RoootGroupLayout = () => {
  const {isSignedIn, isLoaded} = useAuth();
  
    if(!isLoaded){
      return null;
    }
    if(!isSignedIn){
      return <Redirect href="/sign-in" />
    }
  return (
    <Slot/>
      
  )
}

export default RoootGroupLayout