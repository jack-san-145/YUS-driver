import React, { useState, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  StatusBar,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Linking from 'expo-linking';




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
  if (error) return console.log('Background location task error:', error);
  if (data) {
    const { locations } = data;
    console.log('Background locations:', locations);
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
  const [drawerVisible, setDrawerVisible] = useState(false);

  const subscriptionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const carMoveAnim = useRef(new Animated.Value(0)).current;
  const speedometerAnim = useRef(new Animated.Value(0)).current;
  const dashboardSlideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(-width * 0.75)).current;

  // ----------------- Drawer Functions -----------------
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -width * 0.75,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setDrawerVisible(false));
  };

  const handleDrawerItemPress = (item) => {
    closeDrawer();
    setTimeout(() => {
      switch(item) {
        case 'home':
          // Already on home
          break;
       case 'about':
  Linking.openURL('https://yus.kwscloud.in/');
  break;



        case 'privacy':
  Linking.openURL('https://yus.kwscloud.in/yus/privacy-policy');
  break;

       case 'deletion':
  handleAccountDeletionRequest();
  break;

        case 'logout':
          handleLogout();
          break;
      }
    }, 300);
  };

  const handleAccountDeletionRequest = async () => {
  Alert.alert(
    'Confirm Account Deletion',
    'This will send a request to the admin to remove your account. You can continue using the app until the admin approves it.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Request Deletion',
        style: 'destructive',
        onPress: async () => {
          try {
            const sessionId = await getSessionId();
            if (!sessionId) {
              navigation.replace('LoginScreen');
              return;
            }

            const response = await fetch(
              'https://yus.kwscloud.in/yus/remove-driver-account',
              {
                method: 'DELETE',
                headers: {
                  Authorization: sessionId,
                },
              }
            );

            const result = await response.json();
            console.log('Account deletion request response:', result);

            if (result.status) {
              Alert.alert(
                'Request Sent',
                'Your account deletion request has been sent to the admin. You will be notified once it is reviewed.'
              );
            } else {
              Alert.alert(
                'Request Failed',
                'Deletion request already exists or could not be processed.'
              );
            }

          } catch (err) {
            console.log('Deletion request error:', err);
            Alert.alert(
              'Network Error',
              'Unable to send deletion request. Please try again later.'
            );
          }
        },
      },
    ]
  );
};


  // ----------------- WebSocket -----------------
  const initializeWebSocket = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) {
        navigation.replace('LoginScreen');
        return;
      }

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
        initializeWebSocket()
        // if (sharing) {
        //   reconnectTimeoutRef.current = setTimeout(() => initializeWebSocket(), 3000);
        // }
      };

      ws.onerror = (error) => {
        console.log('❌ WebSocket error:', error);
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
      console.log('WebSocket initialization failed:', err);
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
      console.log(err);
      Alert.alert('Error', 'Failed to load bus details.', [
        { text: 'Retry', onPress: fetchAllottedBus },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Start / Stop Sharing -----------------
  const toggleSharing = async () => {
    if (sharing) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setSharing(false);
      setLocation(null);
      return;
    }

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return Alert.alert('Enable location permissions');

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return Alert.alert('Enable background location');

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
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

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 0,
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
  console.log("logout triggered");

  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      navigation.replace('LoginScreen');
      return;
    }

    // 🔹 Call backend logout API
    const response = await fetch(
      'https://yus.kwscloud.in/yus/driver-logout',
      {
        method: 'DELETE',
        headers: {
          Authorization: sessionId,
        },
      }
    );

    const result = await response.json();
    console.log('Logout API response:', result);

    if (!result.status) {
      Alert.alert(
        'Logout Failed',
        'Server logout failed. You will be logged out locally.'
      );
    }

  } catch (err) {
    console.log('Logout API error:', err);
    Alert.alert(
      'Network Error',
      'Unable to reach server. Logging out locally.'
    );
  } finally {
    // 🔹 Always clean up locally
    try {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      try {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      } catch {}

      if (global.wsClient) {
        global.wsClient.close();
        global.wsClient = null;
      }

      await clearSession();
      navigation.replace('LoginScreen');

    } catch (cleanupErr) {
      console.log('Cleanup error:', cleanupErr);
    }
  }
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
      Animated.timing(dashboardSlideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (sharing) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      );
      pulseAnimation.start();

      const carAnimation = Animated.loop(
        Animated.timing(carMoveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      carAnimation.start();

      Animated.timing(speedometerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start();

      return () => {
        pulseAnimation.stop();
        carAnimation.stop();
      };
    } else {
      Animated.parallel([
        Animated.timing(speedometerAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      carMoveAnim.setValue(0);
    }
  }, [sharing]);

  const carTranslateX = carMoveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const speedometerRotate = speedometerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '80deg'],
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <LinearGradient 
          colors={['#1a1a2e', '#16213e', '#0f3460']} 
          style={styles.backgroundGradient} 
        />
        <View style={styles.loadingContainer}>
          <Animated.Text style={[styles.loadingEmoji, { transform: [{ scale: pulseAnim }] }]}>🚍</Animated.Text>
          <Text style={styles.loadingText}>Loading your bus details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity 
            style={styles.drawerBackdrop} 
            activeOpacity={1} 
            onPress={closeDrawer}
          />
          <Animated.View 
            style={[
              styles.drawerContainer,
              { transform: [{ translateX: drawerAnim }] }
            ]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleContainer}>
                <Ionicons name="bus" size={28} color="#edae25ff" style={styles.drawerTitleIcon} />
                <Text style={styles.drawerTitle}>YUS DRIVER</Text>
              </View>
              <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerContent}>
              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => handleDrawerItemPress('home')}
              >
                <Ionicons name="home" size={24} color="#edae25ff" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => handleDrawerItemPress('about')}
              >
                <Ionicons name="information-circle" size={24} color="#edae25ff" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>About</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => handleDrawerItemPress('privacy')}
              >
                <MaterialIcons name="privacy-tip" size={24} color="#edae25ff" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Privacy Policy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => handleDrawerItemPress('deletion')}
              >
                <MaterialIcons name="delete" size={24} color="#edae25ff" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Account Deletion Request</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <TouchableOpacity 
                style={[styles.drawerItem, styles.logoutItem]} 
                onPress={() => handleDrawerItemPress('logout')}
              >
                <Ionicons name="log-out" size={24} color="#f44336" style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Version 1.0</Text>
              <Text style={styles.drawerFooterText}>Yelloh Bus Services</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ScrollView with dashboard */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hamburger Menu Button inside ScrollView */}
        <TouchableOpacity style={styles.hamburgerButton} onPress={openDrawer}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <Animated.View 
          style={[
            styles.dashboard,
            {
              transform: [{ translateY: dashboardSlideAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          {/* Header with bus icon */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>YUS DRIVER</Text>
            <Text style={styles.headerSubtitle}>Yelloh Bus Location Sharing</Text>
          </View>

          {/* Bus details */}
          {busData && (
            <View style={styles.busDetailsContainer}>
              <View style={styles.busDetailRow}>
                <Text style={styles.busDetailLabel}>Bus No</Text>
                <Text style={styles.busDetailValue}>{busData.bus_id}</Text>
              </View>
              <View style={styles.busDetailRow}>
                <Text style={styles.busDetailLabel}>Route</Text>
                <Text style={styles.busDetailValue}>{busData.route_name}</Text>
              </View>
            </View>
          )}

          {/* Animated bus */}
          <View style={styles.carContainer}>
            <Animated.Text 
              style={[
                styles.animatedCar,
                {
                  transform: [
                    { translateX: carTranslateX },
                    { scale: pulseAnim }
                  ]
                }
              ]}
            >
              🚍
            </Animated.Text>
            <View style={styles.roadLine} />
          </View>

          {/* Speedometer */}
          <View style={styles.speedometerContainer}>
            <View style={styles.speedometer}>
              <Animated.View 
                style={[
                  styles.speedometerNeedle,
                  {
                    transform: [{ rotate: speedometerRotate }]
                  }
                ]} 
              />
              <Text style={styles.speedometerText}>
                {sharing ? 'ACTIVE' : 'IDLE'}
              </Text>
            </View>
          </View>

          {/* WebSocket status */}
          <View style={styles.websocketStatus}>
            <View style={[
              styles.statusDot,
              isWebSocketConnected ? styles.connectedDot : styles.disconnectedDot
            ]} />
            <Text style={styles.statusText}>
               {isWebSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </Text>
          </View>

          {/* Location display */}
          <View style={styles.locationDisplay}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationTitle}>Current Position</Text>
            </View>
            
            {location ? (
              <View style={styles.coordinatesContainer}>
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>LAT</Text>
                  <Text style={styles.coordinateValue}>
                    {location?.coords?.latitude != null
                      ? location.coords.latitude.toFixed(6) + '°'
                      : '-'}
                  </Text>
                </View>

                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>LNG</Text>
                  <Text style={styles.coordinateValue}>
                    {location?.coords?.longitude != null
                      ? location.coords.longitude.toFixed(6) + '°'
                      : '-'}
                  </Text>
                </View>

                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>SPD</Text>
                  <Text style={styles.coordinateValue}>
                    {typeof location?.coords?.speed === 'number'
                      ? (location.coords.speed * 3.6).toFixed(1) + ' km/h'
                      : '-'}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noLocationText}>
                {sharing ? 'Acquiring GPS signal...' : 'Location tracking disabled'}
              </Text>
            )}
          </View>

          {/* Control button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              sharing ? styles.stopButton : styles.startButton
            ]}
            onPress={toggleSharing}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.buttonContent, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.buttonIcon}>
                {sharing ? '🛑' : '🚀'}
              </Text>
              <Text style={styles.buttonText}>
                {sharing ? 'STOP TRACKING' : 'START TRACKING'}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Status indicator */}
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              sharing ? styles.activeDot : styles.inactiveDot
            ]} />
            <Text style={styles.statusText}>
              {sharing ? 'LIVE TRACKING' : 'OFFLINE'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  hamburgerButton: {
    padding: 10,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  hamburgerLine: {
    width: 25,
    height: 3,
    backgroundColor: '#edae25ff',
    marginVertical: 3,
    borderRadius: 2,
  },

  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
 drawerContainer: {
  position: 'absolute',  // make it absolute
  top: 0,
  left: 0,               // fix it to left
  width: width * 0.75,
  height: '100%',
  backgroundColor: '#111',
  borderRightWidth: 1,
  borderRightColor: '#333',
},

  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  drawerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerTitleIcon: {
    marginRight: 10,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#edae25ff',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 5,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  drawerItemIcon: {
    marginRight: 15,
    width: 30,
    textAlign: 'center',
  },
  drawerItemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 15,
  },
  logoutItem: {
    marginTop: 10,
  },
  logoutText: {
    color: '#f44336',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  drawerFooterText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
    paddingTop: 50,
    paddingHorizontal: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingEmoji: {
    fontSize: 60,
    marginBottom: 20,
    color: '#fff',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  dashboard: {
    flex: 1,
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#edae25ff',
    marginTop: 5,
    letterSpacing: 1,
  },

  busDetailsContainer: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  busDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  busDetailLabel: {
    color: '#edae25ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  busDetailValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'monospace',
  },

  carContainer: {
    alignItems: 'center',
    marginBottom: 30,
    height: 80,
    justifyContent: 'center',
  },
  animatedCar: {
    fontSize: 50,
    marginBottom: 10,
  },
  roadLine: {
    width: width - 80,
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
  },

  speedometerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  speedometer: {
    width: 120,
    height: 60,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#edae25ff',
    borderBottomColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  speedometerNeedle: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 50,
    backgroundColor: '#ff5722',
    transformOrigin: 'center bottom',
  },
  speedometerText: {
    color: '#edae25ff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  websocketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connectedDot: {
    backgroundColor: '#4CAF50',
  },
  disconnectedDot: {
    backgroundColor: '#ff9800',
  },

  locationDisplay: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#edae25ff',
  },
  locationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  coordinatesContainer: {
    marginTop: 10,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  coordinateLabel: {
    color: '#64b5f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  coordinateValue: {
    color: '#fff',
    fontSize: 16,
  },
  noLocationText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },

  controlButton: {
    borderRadius: 25,
    paddingVertical: 18,
    paddingHorizontal: 30,
    marginBottom: 20,
    elevation: 6,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    backgroundColor: '#4CAF50',
  },
  inactiveDot: {
    backgroundColor: '#555',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default HomeScreen;