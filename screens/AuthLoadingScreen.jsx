import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { validateSession } from '../utils/sessionUtils';

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    const checkSession = async () => {
      try {
        const isValid = await validateSession();
        if (isValid) {
          navigation.replace('HomeScreen');
        } else {
          navigation.replace('LoginScreen');
        }
      } catch (error) {
        console.log('Error checking session:', error);
        navigation.replace('LoginScreen');
      }
    };

    checkSession();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#e8c513" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0808',
  },
  loadingText: {
    color: '#e8c513',
    fontWeight: '600',
    marginTop: 16,
    fontSize: 16,
  },
});