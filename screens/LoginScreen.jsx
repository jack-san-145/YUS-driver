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
  Dimensions,
} from 'react-native';
import { saveSession, clearSession } from '../utils/sessionUtils';

const { width } = Dimensions.get('window');

// Helper function to convert object to URL-encoded form data
const formUrlEncode = (data) => {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
    .join('&');
};

// Login function to get and store session_id
const loginDriver = async (credentials) => {
  try {
    const formData = formUrlEncode({
      driver_id: credentials.driverId,
      password: credentials.password
    });

    console.log('Attempting driver login with ID:', credentials.driverId);

    const response = await fetch("https://yus.kwscloud.in/yus/driver-login", {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();
    console.log('Driver login response:', data);

    if (!response.ok) {
      throw new Error(data.message || `Login failed: ${response.status}`);
    }

    if (data.login_status === "valid") {
      if (data.session_id) {
        await saveSession(data.session_id);
      } else {
        throw new Error("No session_id received from server");
      }
      return data;
    } else {
      throw new Error("Invalid driver ID or password");
    }
  } catch (error) {
    console.error('Error during driver login:', error);
    throw error;
  }
};

// Login screen
const LoginScreen = ({ navigation }) => {
  const [driverId, setDriverId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const driverIdBorderAnim = useRef(new Animated.Value(0)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleFocus = (inputAnim) => {
    Animated.timing(inputAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = (inputAnim) => {
    Animated.timing(inputAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!driverId || !password) {
      Alert.alert('Error', 'Please enter both driver ID and password');
      return;
    }

    animateButton();
    setLoading(true);

    try {
      const data = await loginDriver({ driverId, password });
      if (data.login_status === 'valid') {
        Alert.alert('Success', 'Login successful!');
        navigation.replace('HomeScreen');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const driverIdBorderColor = driverIdBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#f0db75e7'],
  });

  const passwordBorderColor = passwordBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2a2a2a', '#e8c513e7'],
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.formContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🚗</Text>
            </View>
            <Text style={styles.title}>Driver Portal</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Driver ID */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Driver ID</Text>
            <Animated.View style={[styles.inputWrapper, { borderColor: driverIdBorderColor }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your driver ID"
                placeholderTextColor="#666"
                value={driverId}
                onChangeText={setDriverId}
                keyboardType="numeric"
                onFocus={() => handleFocus(driverIdBorderAnim)}
                onBlur={() => handleBlur(driverIdBorderAnim)}
              />
            </Animated.View>
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <Animated.View style={[styles.inputWrapper, { borderColor: passwordBorderColor }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => handleFocus(passwordBorderAnim)}
                onBlur={() => handleBlur(passwordBorderAnim)}
              />
            </Animated.View>
          </View>

          {/* Login Button */}
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#0b0808" size="small" />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Set Password */}
          <TouchableOpacity
            style={styles.setPasswordButton}
            onPress={() => navigation.navigate('SendOtp')}
            activeOpacity={0.7}
          >
            <Text style={styles.setPasswordText}>Create New Password</Text>
            <Text style={styles.setPasswordIcon}>→</Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footerText}>Secure login powered by YUS</Text>
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
    fontSize: 15, 
    color: '#999', 
    letterSpacing: 0.3, 
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
  loginButton: { 
    backgroundColor: '#e8c513e7', 
    padding: 18, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 8, 
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
  loginButtonText: { 
    color: '#0b0808', 
    fontSize: 17, 
    fontWeight: 'bold', 
    letterSpacing: 1, 
    textTransform: 'uppercase', 
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
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 28, 
  }, 
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#2a2a2a', 
  }, 
  dividerText: { 
    color: '#666', 
    paddingHorizontal: 16, 
    fontSize: 13, 
    fontWeight: '600', 
  }, 
  setPasswordButton: { 
    flexDirection: 'row', 
    padding: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 14, 
    borderWidth: 2, 
    borderColor: '#2a2a2a', 
    backgroundColor: '#0b0808', 
  }, 
  setPasswordText: { 
    color: '#e8c513e7', 
    fontSize: 16, 
    fontWeight: '600', 
    marginRight: 8, 
  }, 
  setPasswordIcon: { 
    color: '#e8c513e7', 
    fontSize: 20, 
    fontWeight: 'bold', 
  }, 
  footerText: { 
    textAlign: 'center', 
    color: '#666', 
    fontSize: 12, 
    marginTop: 24, 
    letterSpacing: 0.5, 
  }, 
}); 

export { loginDriver, clearSession };
export default LoginScreen;