import React from 'react'
import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const OnboardingScreen = () => {
  return (
    <SafeAreaView className='flex-1 bg-brand-body' edges={['top']}>
      <Text>Onboarding Screen</Text>
    </SafeAreaView>
  )
}

export default OnboardingScreen