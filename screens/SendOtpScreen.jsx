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

const SendOtpScreen = ({ navigation }) => {
  const [driverId, setDriverId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

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

  const handleDriverIdFocus = () => {
    setFocusedInput('driverId');
    Animated.timing(driverIdBorderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleDriverIdBlur = () => {
    setFocusedInput(null);
    Animated.timing(driverIdBorderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleEmailFocus = () => {
    setFocusedInput('email');
    Animated.timing(emailBorderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleEmailBlur = () => {
    setFocusedInput(null);
    Animated.timing(emailBorderAnim, {
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });

      const data = await response.json();

      if (data.status === 'no driver found') {
        Alert.alert('Error', 'No driver found with this ID and email');
      } else if (data.otp_sent === true) {
        Alert.alert('Success', 'OTP sent successfully!');
        navigation.navigate('VerifyOtp', {
          driverId: driverId,
          email: email,
        });
      } else {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const driverIdBorderColor = driverIdBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#e8c513e7'],
  });

  const emailBorderColor = emailBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#e8c513e7'],
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Password Setup</Text>
            <Text style={styles.subtitle}>
              We'll send a verification code to your email
            </Text>
          </View>
          
          {/* Driver ID Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Driver ID</Text>
            <Animated.View 
              style={[
                styles.inputWrapper,
                { borderColor: driverIdBorderColor }
              ]}
            >
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your driver ID"
                placeholderTextColor="#666"
                value={driverId}
                onChangeText={setDriverId}
                keyboardType="numeric"
                onFocus={handleDriverIdFocus}
                onBlur={handleDriverIdBlur}
              />
            </Animated.View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <Animated.View 
              style={[
                styles.inputWrapper,
                { borderColor: emailBorderColor }
              ]}
            >
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={handleEmailFocus}
                onBlur={handleEmailBlur}
              />
            </Animated.View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Make sure to enter the email registered with your driver account
            </Text>
          </View>

          {/* Send OTP Button */}
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.sendOtpButton, loading && styles.disabledButton]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#0b0808" size="small" />
                  <Text style={styles.loadingText}>Sending OTP...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.sendOtpButtonText}>Send Verification Code</Text>
                  <Text style={styles.buttonIcon}>→</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footerText}>
            Protected by YUS Security
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(11, 8, 8, 1)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    backgroundColor: '#1a1a1a',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#e8c513e7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8c513e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#e8c513e7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#e8c513e7',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: '#0b0808',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    height: '100%',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#e8c513e7',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  sendOtpButton: {
    backgroundColor: '#e8c513e7',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#e8c513e7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#4a4a4a',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendOtpButtonText: {
    color: '#0b0808',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    color: '#0b0808',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#0b0808',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    backgroundColor: '#0b0808',
  },
  backButtonIcon: {
    color: '#e8c513e7',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  backButtonText: {
    color: '#e8c513e7',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 24,
    letterSpacing: 0.5,
  },
});

export default SendOtpScreen;