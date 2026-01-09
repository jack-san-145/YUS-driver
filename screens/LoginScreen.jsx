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
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    console.log('Error during driver login:', error);
    throw error;
  }
};

// Login screen
const LoginScreen = ({ navigation }) => {
  const [driverId, setDriverId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      console.log('Login error:', error);
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
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
  <ScrollView
    contentContainerStyle={styles.scroll}
    keyboardShouldPersistTaps="handled"
  >
    {/* Logo Section */}
    <View style={styles.logoContainer}>
      <Text style={styles.busIcon}>🚍</Text>
      <Text style={styles.appTitle}>YUS Driver</Text>
      <Text style={styles.appSubtitle}>Driver Login Portal</Text>
    </View>

    {/* Card */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Driver Authentication</Text>

      <Text style={styles.label}>DRIVER ID</Text>

<View style={styles.inputBox}>
  <MaterialCommunityIcons
    name="account-outline"
    size={22}
    color="#999"
    style={styles.leftIcon}
  />

  <TextInput
    placeholder="Enter your driver ID"
    value={driverId}
    onChangeText={setDriverId}
    keyboardType="numeric"
    style={styles.input}
  />
</View>


      <Text style={styles.label}>PASSWORD</Text>

<View style={styles.passwordBox}>
  <MaterialCommunityIcons
    name="lock-outline"
    size={22}
    color="#999"
    style={styles.leftIcon}
  />

  <TextInput
    placeholder="Enter your password"
    value={password}
    onChangeText={setPassword}
    secureTextEntry={!showPassword}
    style={styles.passwordInput}
  />

  <TouchableOpacity
    onPress={() => setShowPassword(prev => !prev)}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons
      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
      size={22}
      color="#999"
    />
  </TouchableOpacity>
</View>

      {/* Login Button */}
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </TouchableOpacity>

      {/* Create Password */}
      <TouchableOpacity
        onPress={() => navigation.navigate('SendOtp')}
        style={styles.linkBtn}
      >
        <Text style={styles.linkText}>Create New Password</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.footer}>
      © 2024 YUS Bus Management System
    </Text>
  </ScrollView>
</KeyboardAvoidingView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

 logoContainer: {
  alignItems: 'center',
  marginTop: -90,   
  marginBottom: 20,
},

  busIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#f4c400',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
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
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ddd',
  paddingHorizontal: 14,
  height: 50,
},


  input: {
    fontSize: 15,
    color: '#111',
  },

  loginButton: {
    backgroundColor: '#f4c400',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 26,
  },

  loginText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },

  linkBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: '#f4c400',
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    marginTop: 30,
  },

  passwordBox: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ddd',
  paddingHorizontal: 14,
  height: 50,
},

passwordInput: {
  flex: 1,
  fontSize: 15,
  color: '#111',
},

eyeIcon: {
  fontSize: 18,
  color: '#777',
  paddingLeft: 10,
},
leftIcon: {
  marginRight: 10,
},


});

export { loginDriver, clearSession };
export default LoginScreen;