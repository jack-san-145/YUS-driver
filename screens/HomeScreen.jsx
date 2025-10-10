import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

const { width, height } = Dimensions.get('window');
const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// ----------------- SecureStore Session Utils -----------------
const saveSession = async (sessionId) => {
  const sessionData = { session_id: sessionId, createdAt: Date.now() };
  await SecureStore.setItemAsync('driverSession', JSON.stringify(sessionData));
};
const getSession = async () => {
  const stored = await SecureStore.getItemAsync('driverSession');
  if (!stored) return null;
  const session = JSON.parse(stored);
  return session.session_id ? session : null;
};
const getSessionId = async () => {
  const session = await getSession();
  return session ? session.session_id : null;
};
const clearSession = async () => {
  await SecureStore.deleteItemAsync('driverSession');
};

// ----------------- Background Location Task -----------------
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) return console.error('Background location task error:', error);
  if (data) {
    const { locations } = data;
    console.log('Background locations:', locations);
    // Send locations via WebSocket
    if (global.wsClient && global.wsClient.readyState === 1) {
      locations.forEach(loc => {
        global.wsClient.send(JSON.stringify({
          latitude: loc.coords.latitude.toFixed(6),
          longitude: loc.coords.longitude.toFixed(6),
          speed: loc.coords.speed.toFixed(2)
        }));
      });
    }
  }
});

// ----------------- HomeScreen -----------------
const HomeScreen = ({ navigation }) => {
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState(null);
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const subscriptionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const carMoveAnim = useRef(new Animated.Value(0)).current;
  const speedometerAnim = useRef(new Animated.Value(0)).current;
  const dashboardSlideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ----------------- WebSocket -----------------
  const initializeWebSocket = async () => {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      navigation.replace('LoginScreen');
      return;
    }

    // Append session_id as query parameter
    const ws = new W3CWebSocket(`wss://yus.kwscloud.in/yus/driver-ws?session_id=${sessionId}`);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      global.wsClient = ws;
      setIsWebSocketConnected(true);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    ws.onclose = (event) => {
      console.log('⚠ WebSocket disconnected:', event.code);
      setIsWebSocketConnected(false);
      if (sharing) {
        reconnectTimeoutRef.current = setTimeout(() => initializeWebSocket(), 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsWebSocketConnected(false);
    };

    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        console.log('Received message:', data);
      } catch {
        console.log('Raw message:', message.data);
      }
    };
  } catch (err) {
    console.error('WebSocket initialization failed:', err);
  }
};


  // ----------------- Fetch Bus -----------------
  const fetchAllottedBus = async () => {
    setLoading(true);
    try {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Session expired');

      const response = await fetch('https://yus.kwscloud.in/yus/get-allotted-bus', {
        method: 'GET',
        headers: { Authorization: sessionId },
      });

      if (!response.ok) throw new Error('Failed to fetch bus');

      const data = await response.json();
      setBusData(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load bus details.', [
        { text: 'Retry', onPress: fetchAllottedBus },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Send Location -----------------
  const sendLocation = (loc) => {
    if (global.wsClient && global.wsClient.readyState === 1) {
      global.wsClient.send(JSON.stringify(loc));
    } else {
      if (sharing) initializeWebSocket();
    }
  };



  // ----------------- Start / Stop Sharing -----------------
const toggleSharing = async () => {
  if (sharing) {
    // Stop foreground tracking
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    // Stop background tracking
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

    setSharing(false);
    setLocation(null);
    return;
  }

  // ----------------- Request Permissions -----------------
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return Alert.alert('Enable location permissions');

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return Alert.alert('Enable background location');

  // ----------------- Start Foreground Tracking -----------------
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,  // 5 seconds
      distanceInterval: 0, // send even if not moved
    },
    (loc) => {
      setLocation(loc);

      if (busData && global.wsClient && global.wsClient.readyState === 1) {
        global.wsClient.send(JSON.stringify({
          latitude: loc.coords.latitude.toFixed(6),
          longitude: loc.coords.longitude.toFixed(6),
          speed: loc.coords.speed.toFixed(2),
        }));
      }
    }
  );
  subscriptionRef.current = sub;

  // ----------------- Start Background Tracking -----------------
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,  // 5 seconds
    distanceInterval: 0, // even if stationary
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Drive Tracker',
      notificationBody: 'Sharing your location in the background',
      notificationColor: '#4CAF50',
    },
  });

  setSharing(true);
};


  // ----------------- Logout -----------------
  const handleLogout = async () => {
    if (subscriptionRef.current) subscriptionRef.current.remove();
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (global.wsClient) global.wsClient.close();
    await clearSession();
    navigation.replace('LoginScreen');
  };

  // ----------------- Lifecycle -----------------
  useEffect(() => {
    initializeWebSocket();
    fetchAllottedBus();

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (global.wsClient) global.wsClient.close();
    };
  }, []);

  // ----------------- Animations -----------------
  useEffect(() => {
    Animated.parallel([
      Animated.timing(dashboardSlideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (sharing) {
      const pulseAnimLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulseAnimLoop.start();
      return () => pulseAnimLoop.stop();
    }
  }, [sharing]);

  const carTranslateX = carMoveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.3] });
  const speedometerRotate = speedometerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <LinearGradient colors={['#0a0a0a', '#1a1a2e', '#16213e']} style={styles.backgroundGradient} />
        <View style={styles.loadingContainer}>
          <Animated.Text style={[styles.loadingEmoji, { transform: [{ scale: pulseAnim }] }]}>🚌</Animated.Text>
          <Text style={styles.loadingText}>Loading your bus details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <LinearGradient colors={['#0a0a0a', '#1a1a2e', '#16213e']} style={styles.backgroundGradient} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* ScrollView with dashboard */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.dashboard, { transform: [{ translateY: dashboardSlideAnim }], opacity: fadeAnim }]}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerEmoji}>🚌</Text>
            <Text style={styles.headerTitle}>DRIVE TRACKER</Text>
            <Text style={styles.headerSubtitle}>Professional Location Sharing</Text>
          </View>

          {busData && (
            <View style={styles.busDetailsContainer}>
              <Text style={styles.busDetailValue}>Bus ID: {busData.bus_id}</Text>
              <Text style={styles.busDetailValue}>Route: {busData.route_name}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.controlButton, sharing ? styles.stopButton : styles.startButton]}
            onPress={toggleSharing}
          >
            <Text style={styles.buttonText}>{sharing ? 'STOP TRACKING' : 'START TRACKING'}</Text>
          </TouchableOpacity>

          <View style={styles.websocketStatus}>
            <View style={[styles.statusDot, isWebSocketConnected ? styles.connectedDot : styles.disconnectedDot]} />
            <Text style={styles.statusText}>
              WEBSOCKET: {isWebSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </Text>
          </View>

          {location && (
            <View style={styles.locationDisplay}>
              <Text style={styles.coordinateValue}>LAT: {location.coords.latitude.toFixed(6)}</Text>
              <Text style={styles.coordinateValue}>LNG: {location.coords.longitude.toFixed(6)}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  backgroundGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingEmoji: { fontSize: 60, marginBottom: 20 },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutButton: { position: 'absolute', top: 50, right: 20, backgroundColor: '#e8c513', padding: 12, borderRadius: 20, zIndex: 1000 },
  logoutText: { color: '#0b0808', fontWeight: 'bold' },
  dashboard: { flex: 1, padding: 20, paddingTop: 120 },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  headerEmoji: { fontSize: 50 },
  headerTitle: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  headerSubtitle: { fontSize: 16, color: '#64b5f6' },
  busDetailsContainer: { backgroundColor: 'rgba(100,181,246,0.2)', padding: 15, borderRadius: 12, marginBottom: 20 },
  busDetailValue: { color: '#fff', fontSize: 16, marginBottom: 5 },
  controlButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  startButton: { backgroundColor: '#4CAF50' },
  stopButton: { backgroundColor: '#f44336' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  websocketStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  statusDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  connectedDot: { backgroundColor: '#4CAF50' },
  disconnectedDot: { backgroundColor: '#ff9800' },
  statusText: { color: '#fff', fontWeight: 'bold' },
  locationDisplay: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 10 },
  coordinateValue: { color: '#fff', fontSize: 14 },
});

export default HomeScreen;