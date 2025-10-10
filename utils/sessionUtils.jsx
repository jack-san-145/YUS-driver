import * as SecureStore from 'expo-secure-store';

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// Save session to SecureStore
export const saveSession = async (sessionId) => {
  try {
    if (!sessionId) {
      throw new Error('No session ID provided');
    }

    const sessionData = {
      session_id: sessionId,
      createdAt: Date.now(),
    };
    
    await SecureStore.setItemAsync('driverSession', JSON.stringify(sessionData));
    console.log('✅ Session saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving session:', error);
    throw error;
  }
};

// Get session from SecureStore
export const getSession = async () => {
  try {
    const stored = await SecureStore.getItemAsync('driverSession');
    if (!stored) {
      console.log('❌ No session found in storage');
      return null;
    }
    
    const session = JSON.parse(stored);
    
    // Validate session structure
    if (!session.session_id || !session.createdAt) {
      console.error('❌ Invalid session structure');
      await SecureStore.deleteItemAsync('driverSession');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('❌ Error parsing session:', error);
    // Clear corrupted session
    await SecureStore.deleteItemAsync('driverSession');
    return null;
  }
};

// Get session ID only
export const getSessionId = async () => {
  try {
    const session = await getSession();
    return session ? session.session_id : null;
  } catch (error) {
    console.error('❌ Error getting session ID:', error);
    return null;
  }
};

// Validate session
export const validateSession = async () => {
  try {
    const session = await getSession();
    if (!session) return false;

    const age = Date.now() - session.createdAt;
    if (age > SIX_DAYS_MS) {
      await SecureStore.deleteItemAsync('driverSession');
      console.log('⚠️ Session expired — deleted');
      return false;
    }

    console.log('✅ Session still valid');
    return true;
  } catch (error) {
    console.error('❌ Error validating session:', error);
    return false;
  }
};

// Clear session
export const clearSession = async () => {
  try {
    await SecureStore.deleteItemAsync('driverSession');
    console.log('✅ Session cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing session:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  return await validateSession();
};