import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import AuthLoadingScreen from './screens/AuthLoadingScreen'; // 👈 Added startup check
import LoginScreen from './screens/LoginScreen';
import SendOtpScreen from './screens/SendOtpScreen';
import VerifyOtpScreen from './screens/VerifyOtpScreen';
import HomeScreen from './screens/HomeScreen'; // 👈 Add this if you have one

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AuthLoading">
        {/* 🚀 Startup session check */}
        <Stack.Screen
          name="AuthLoading"
          component={AuthLoadingScreen}
          options={{ headerShown: false }}
        />

        {/* 🔒 Auth screens */}
        <Stack.Screen 
          name="LoginScreen" 
          component={LoginScreen}
          options={{ headerShown: false }}  
        />
        <Stack.Screen 
          name="SendOtp" 
          component={SendOtpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="VerifyOtp" 
          component={VerifyOtpScreen}
          options={{ headerShown: false }}
        />

        {/* 🏠 App main screen */}
        <Stack.Screen 
          name="HomeScreen" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
