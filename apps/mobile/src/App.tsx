import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';

import HomeScreen from './screens/HomeScreen.js';
import TransactionsScreen from './screens/TransactionsScreen.js';
import DisputesScreen from './screens/DisputesScreen.js';
import SettingsScreen from './screens/SettingsScreen.js';
import { startNotificationListener } from './services/notification-bridge.js';
import { registerDevice, sendHeartbeat } from './services/api.js';

const Tab = createBottomTabNavigator();

const CLERK_PUBLISHABLE_KEY =
  process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'] ?? '';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

function AppTabs() {
  const { getToken, isSignedIn } = useAuth();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    initApp();
    startHeartbeat();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isSignedIn]);

  async function initApp() {
    const token = await getToken();
    if (!token) return;

    const deviceId = await DeviceInfo.getUniqueId();
    const appVersion = DeviceInfo.getVersion();
    const deviceModel = DeviceInfo.getModel();

    try {
      await registerDevice({ clerkToken: token, deviceId, appVersion, deviceModel });
    } catch (err) {
      console.warn('[SeedhaPe] Device registration failed:', err);
    }

    // Start notification listener
    startNotificationListener((n) => {
      console.log('[SeedhaPe] Payment detected:', n.upiApp, '₹', n.amount / 100);
    });
  }

  function startHeartbeat() {
    // Send heartbeat every 60 seconds
    heartbeatRef.current = setInterval(async () => {
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) return;
      await sendHeartbeat({ deviceId }).catch(() => {});
    }, 60_000);

    // Initial heartbeat
    AsyncStorage.getItem('deviceId').then((deviceId) => {
      if (deviceId) sendHeartbeat({ deviceId }).catch(() => {});
    });
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f3f4f6' },
          tabBarActiveTintColor: '#16a34a',
          tabBarInactiveTintColor: '#9ca3af',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
          }}
        />
        <Tab.Screen
          name="Disputes"
          component={DisputesScreen}
          options={{
            title: 'Disputes',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚠️</Text>,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AppTabs />
    </ClerkProvider>
  );
}
