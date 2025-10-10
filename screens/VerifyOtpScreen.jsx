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

const VerifyOtpScreen = ({ route, navigation }) => {
  const { driverId, email } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordBorderAnim = useRef(new Animated.Value(0)).current;
  const otpBorderAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Regex patterns for validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const otpRegex = /^\d{4,8}$/;

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

  const handlePasswordFocus = () => {
    Animated.timing(passwordBorderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handlePasswordBlur = () => {
    Animated.timing(passwordBorderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleConfirmPasswordFocus = () => {
    Animated.timing(confirmPasswordBorderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleConfirmPasswordBlur = () => {
    Animated.timing(confirmPasswordBorderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleOtpFocus = () => {
    Animated.timing(otpBorderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleOtpBlur = () => {
    Animated.timing(otpBorderAnim, {
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

  const validateForm = () => {
    if (!password || !confirmPassword || !otp) {
      return 'Please fill all fields';
    }

    if (!otpRegex.test(otp)) {
      return 'OTP must be 4-8 digits';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (!passwordRegex.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleVerifyOtp = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    animateButton();
    setLoading(true);

    try {
      const formBody = new URLSearchParams();
      formBody.append('driver_id', driverId);
      formBody.append('email', email);
      formBody.append('password', password);
      formBody.append('otp', otp);

      const response = await fetch('https://yus.kwscloud.in/yus/verify-otp-driver-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });

      const data = await response.json();

      if (data.status === 'success') {
        Alert.alert('Success', 'Password set successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
      } else if (data.status === 'invalid_otp') {
        Alert.alert('Error', 'Invalid OTP. Please check and try again.');
      } else if (data.status === 'otp_expired') {
        Alert.alert('Error', 'OTP has expired. Please request a new one.');
      } else {
        Alert.alert('Error', data.message || 'Failed to set password. Please try again.');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
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

      if (data.otp_sent === true) {
        Alert.alert('Success', 'New OTP sent successfully!');
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const passwordBorderColor = passwordBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#e8c513e7'],
  });

  const confirmPasswordBorderColor = confirmPasswordBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#e8c513e7'],
  });

  const otpBorderColor = otpBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#e8c513e7'],
  });

  const getPasswordStrength = () => {
    if (!password) return null;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    if (strength <= 2) return { text: 'Weak', color: '#ff4444' };
    if (strength <= 3) return { text: 'Medium', color: '#ffaa00' };
    return { text: 'Strong', color: '#00C851' };
  };

  const passwordStrength = getPasswordStrength();

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
              <Text style={styles.iconText}>✓</Text>
            </View>
            <Text style={styles.title}>Verify & Set Password</Text>
            <Text style={styles.subtitle}>
              Enter the code sent to your email
            </Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver ID:</Text>
              <Text style={styles.infoValue}>{driverId}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          {/* OTP Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <Animated.View 
              style={[
                styles.inputWrapper,
                { borderColor: otpBorderColor }
              ]}
            >
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 4-8 digit code"
                placeholderTextColor="#666"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={8}
                onFocus={handleOtpFocus}
                onBlur={handleOtpBlur}
              />
            </Animated.View>
            {otp && !otpRegex.test(otp) && (
              <Text style={styles.errorText}>⚠️ OTP must be 4-8 digits</Text>
            )}
          </View>
          
          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <Animated.View 
              style={[
                styles.inputWrapper,
                { borderColor: passwordBorderColor }
              ]}
            >
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </Animated.View>
            {password && passwordStrength && (
              <View style={styles.strengthContainer}>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  Strength: {passwordStrength.text}
                </Text>
              </View>
            )}
            <Text style={styles.helperText}>
              • Min 8 characters • Uppercase • Lowercase • Number • Special char
            </Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <Animated.View 
              style={[
                styles.inputWrapper,
                { borderColor: confirmPasswordBorderColor }
              ]}
            >
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                onFocus={handleConfirmPasswordFocus}
                onBlur={handleConfirmPasswordBlur}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </Animated.View>
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>⚠️ Passwords do not match</Text>
            )}
            {confirmPassword && password === confirmPassword && (
              <Text style={styles.successText}>✓ Passwords match</Text>
            )}
          </View>

          {/* Set Password Button */}
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.disabledButton]}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#0b0808" size="small" />
                  <Text style={styles.loadingText}>Setting Password...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.verifyButtonText}>Set Password</Text>
                  <Text style={styles.buttonIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Resend OTP Button */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOtp}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.resendIcon}>↻</Text>
            <Text style={styles.resendButtonText}>Resend Code</Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footerText}>
            Your password will be encrypted and stored securely
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
    marginBottom: 28,
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
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0b0808',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    padding: 18,
    borderRadius: 14,
    marginBottom: 28,
    borderLeftWidth: 4,
    borderLeftColor: '#e8c513e7',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#e8c513e7',
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  inputContainer: {
    marginBottom: 22,
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
  eyeIcon: {
    fontSize: 20,
    padding: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    lineHeight: 16,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 6,
    fontWeight: '500',
  },
  successText: {
    fontSize: 12,
    color: '#00C851',
    marginTop: 6,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#e8c513e7',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
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
  verifyButtonText: {
    color: '#0b0808',
    fontSize: 17,
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
  resendButton: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    backgroundColor: '#0b0808',
    marginBottom: 12,
  },
  resendIcon: {
    color: '#e8c513e7',
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
  },
  resendButtonText: {
    color: '#e8c513e7',
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonIcon: {
    color: '#999',
    fontSize: 18,
    marginRight: 6,
  },
  backButtonText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 11,
    marginTop: 20,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
});

export default VerifyOtpScreen;