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
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);


const VerifyOtpScreen = ({ route, navigation }) => {
  const { driverId, email } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const cleanPassword = password.trim();
  const cleanConfirmPassword = confirmPassword.trim();


  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordBorderAnim = useRef(new Animated.Value(0)).current;
  const otpBorderAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Regex patterns for validation
 const passwordRegex =
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-])[A-Za-z\d@$!%*?&\-]{8,}$/;

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

   if (!passwordRegex.test(cleanPassword)) {
  return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
}

if (cleanPassword !== cleanConfirmPassword) {
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
            onPress: () => navigation.navigate('LoginScreen'),
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
      console.log('Verify OTP error:', error);
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
      console.log('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const passwordBorderColor = passwordBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ddd', '#f9c107'],
  });

  const confirmPasswordBorderColor = confirmPasswordBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ddd', '#f9c107'],
  });

  const otpBorderColor = otpBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ddd', '#f9c107'],
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
    <Animated.View
      style={[
        styles.mainWrapper,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Header – NO ICON */}
      <View style={styles.header}>
        <Text style={styles.title}>Verify & Set Password</Text>
        <Text style={styles.subtitle}>Enter the code sent to your email</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DRIVER ID</Text>
            <Text style={styles.infoValue}>{driverId}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>
        </View>

        {/* OTP */}
        <Text style={styles.label}>Verification Code</Text>
        <Animated.View style={[styles.inputBox, { borderColor: otpBorderColor }]}>
          <MaterialCommunityIcons name="key-outline" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Enter 4-8 digit code"
            value={otp}
            keyboardType="numeric"
            maxLength={8}
            onChangeText={setOtp}
            onFocus={() => handleFocus(otpBorderAnim)}
            onBlur={() => handleBlur(otpBorderAnim)}
          />
        </Animated.View>

        {/* New Password */}
        <Text style={styles.label}>New Password</Text>
        <Animated.View style={[styles.inputBox, { borderColor: passwordBorderColor }]}>
  <MaterialCommunityIcons name="lock-outline" size={20} color="#999" />

  <TextInput
    style={styles.input}
    placeholder="Enter new password"
    secureTextEntry={!showPassword}
    value={password}
    onChangeText={setPassword}
    onFocus={() => handleFocus(passwordBorderAnim)}
    onBlur={() => handleBlur(passwordBorderAnim)}
  />

  {/* 👁 Eye Icon */}
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
    <MaterialCommunityIcons
      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
      size={20}
      color="#999"
    />
  </TouchableOpacity>
</Animated.View>


        {/* Confirm */}
        <Text style={styles.label}>Confirm Password</Text>
        <Animated.View style={[styles.inputBox, { borderColor: confirmPasswordBorderColor }]}>
  <MaterialCommunityIcons name="lock-check-outline" size={20} color="#999" />

  <TextInput
    style={styles.input}
    placeholder="Confirm new password"
    secureTextEntry={!showConfirmPassword}
    value={confirmPassword}
    onChangeText={setConfirmPassword}
    onFocus={() => handleFocus(confirmPasswordBorderAnim)}
    onBlur={() => handleBlur(confirmPasswordBorderAnim)}
  />

  {/* 👁 Eye Icon */}
  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
    <MaterialCommunityIcons
      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
      size={20}
      color="#999"
    />
  </TouchableOpacity>
</Animated.View>


        {/* Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleVerifyOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.primaryButtonText}>Set Password</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity style={styles.secondaryButton} onPress={handleResendOtp}>
          <Text style={styles.secondaryButtonText}>Resend Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={styles.backGhostBtn}
  onPress={() => navigation.goBack()}
>
  <Text style={styles.backGhostText}>Back to Previous</Text>
</TouchableOpacity>

      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Your password will be encrypted and stored securely
      </Text>
    </Animated.View>
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
  marginBottom: 16,
},
 title: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#111',
},
  subtitle: {
  fontSize: 14,
  color: '#666',
  marginTop: 4,
},
  card: {
  backgroundColor: '#fff',
  borderRadius: 22,
  padding: 22,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
},
  infoSection: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f9c107',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f9c107',
    marginVertical: 10,
    opacity: 0.3,
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
  helperText: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    lineHeight: 16,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f9c107',
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9c107',
  },
  linkBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: '#f9c107',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  footer: {
  textAlign: 'center',
  fontSize: 12,
  color: '#999',
  marginTop: 20,
},
mainWrapper: {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: 24,
},
backGhostBtn: {
  marginTop: 14,
  paddingVertical: 10,
  borderRadius: 12,
  alignItems: 'center',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#eee',
},

backGhostText: {
  fontSize: 14,
  color: '#777',
  fontWeight: '600',
},

});

export default VerifyOtpScreen;



