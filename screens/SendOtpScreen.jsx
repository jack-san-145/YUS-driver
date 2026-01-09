import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Common Auth Header Component
const AuthHeader = ({ title, subtitle }) => (
  <View style={styles.header}>
    <MaterialCommunityIcons name="bus" size={48} color="#f9c107" />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);

const SendOtpScreen = ({ navigation }) => {
  const [driverId, setDriverId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const driverIdBorderAnim = useRef(new Animated.Value(0)).current;
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFocus = (inputAnim) => {
    Animated.timing(inputAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = (inputAnim) => {
    Animated.timing(inputAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSendOtp = async () => {
    if (!driverId || !email) {
      Alert.alert('Error', 'Please enter both driver ID and email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    animateButton();
    setLoading(true);

    try {
      const formBody = new URLSearchParams();
      formBody.append('driver_id', driverId);
      formBody.append('email', email);

      const response = await fetch('https://yus.kwscloud.in/yus/send-otp-driver-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      });

      const data = await response.json();

      if (data.status === 'no driver found') {
        Alert.alert('Error', 'No driver found with this ID and email');
      } else if (data.otp_sent === true) {
        Alert.alert('Success', 'OTP sent successfully!');
        navigation.navigate('VerifyOtp', { driverId, email });
      } else {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.log('Send OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const driverIdBorderColor = driverIdBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ddd', '#f9c107'],
  });

  const emailBorderColor = emailBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ddd', '#f9c107'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* Header */}
          <AuthHeader
            title="Password Setup"
            subtitle="We'll send a verification code"
          />

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify Driver</Text>

            {/* Driver ID */}
            <Text style={styles.label}>DRIVER ID</Text>
            <Animated.View style={[styles.inputBox, { borderColor: driverIdBorderColor }]}>
              <MaterialCommunityIcons 
                name="account-outline" 
                size={22} 
                color="#999" 
              />
              <TextInput
                style={styles.input}
                placeholder="Enter driver ID"
                placeholderTextColor="#999"
                value={driverId}
                onChangeText={setDriverId}
                keyboardType="numeric"
                onFocus={() => handleFocus(driverIdBorderAnim)}
                onBlur={() => handleBlur(driverIdBorderAnim)}
              />
            </Animated.View>

            {/* Email */}
            <Text style={styles.label}>EMAIL</Text>
            <Animated.View style={[styles.inputBox, { borderColor: emailBorderColor }]}>
              <MaterialCommunityIcons 
                name="email-outline" 
                size={22} 
                color="#999" 
              />
              <TextInput
                style={styles.input}
                placeholder="Enter registered email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => handleFocus(emailBorderAnim)}
                onBlur={() => handleBlur(emailBorderAnim)}
              />
            </Animated.View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons 
                name="information-outline" 
                size={16} 
                color="#f9c107" 
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoText}>
                Make sure to enter the email registered with your driver account
              </Text>
            </View>

            {/* Send OTP Button */}
            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#111" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Back Button */}
            <TouchableOpacity 
              style={styles.linkBtn} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Protected by YUS Security</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#111',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f9c107',
    marginBottom: 6,
    marginTop: 14,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    marginLeft: 10,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f9c107',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
  },
  primaryButton: {
    backgroundColor: '#f4c400',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 26,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  linkBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: '#f9c107',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 30,
  },
});

export default SendOtpScreen;