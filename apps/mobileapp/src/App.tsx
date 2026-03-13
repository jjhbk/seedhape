import React, { useEffect, useRef, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './screens/HomeScreen.js';
import TransactionsScreen from './screens/TransactionsScreen.js';
import DisputesScreen from './screens/DisputesScreen.js';
import SettingsScreen from './screens/SettingsScreen.js';
import ApiKeyScreen from './screens/ApiKeyScreen.js';
import { startNotificationListener } from './services/notification-bridge.js';
import { getApiKey, registerDevice, sendHeartbeat } from './services/api.js';

const Tab = createBottomTabNavigator();

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getApiKey().then((key) => {
      setApiKey(key);
      setChecking(false);
    });
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    initApp(apiKey);
    startHeartbeat();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [apiKey]);

  async function initApp(key: string) {
    const deviceId = await DeviceInfo.getUniqueId();
    const appVersion = DeviceInfo.getVersion();
    const deviceModel = DeviceInfo.getModel();

    try {
      await registerDevice({ apiKey: key, deviceId, appVersion, deviceModel });
    } catch (err) {
      console.warn('[SeedhaPe] Device registration failed:', err);
    }

    startNotificationListener((n) => {
      console.log('[SeedhaPe] Payment detected:', n.upiApp, '₹', n.amount / 100);
    });
  }

  function startHeartbeat() {
    heartbeatRef.current = setInterval(async () => {
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) return;
      sendHeartbeat({ deviceId }).catch(() => {});
    }, 60_000);
    AsyncStorage.getItem('deviceId').then((deviceId) => {
      if (deviceId) sendHeartbeat({ deviceId }).catch(() => {});
    });
  }

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  if (!apiKey) {
    return <ApiKeyScreen onSuccess={(key) => setApiKey(key)} />;
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
          options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }}
        >
          {() => <HomeScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Transactions"
          options={{ title: 'Transactions', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }}
        >
          {() => <TransactionsScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Disputes"
          options={{ title: 'Disputes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚠️</Text> }}
        >
          {() => <DisputesScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text> }}
        >
          {() => <SettingsScreen apiKey={apiKey} onSignOut={() => setApiKey(null)} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
