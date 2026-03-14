import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DeviceInfo from 'react-native-device-info';

import HomeScreen from './screens/HomeScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import DisputesScreen from './screens/DisputesScreen';
import SettingsScreen from './screens/SettingsScreen';
import ApiKeyScreen from './screens/ApiKeyScreen';
import SeedhaPeMark from './components/SeedhaPeMark';
import { startNotificationListener } from './services/notification-bridge';
import { ensureBackgroundSyncRunning, getApiKey, registerDevice } from './services/api';

const Tab = createBottomTabNavigator();

function TabGlyph({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tabGlyph, { borderColor: color }]}>
      <Text style={[styles.tabGlyphText, { color }]}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getApiKey().then((key) => {
      setApiKey(key);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    ensureAndroidNotificationPermission();
    ensureBackgroundSyncRunning();
    initApp(apiKey);
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

  async function ensureAndroidNotificationPermission() {
    if (Platform.OS !== 'android') return;
    if (Number(Platform.Version) < 33) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <SeedhaPeMark />
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
          tabBarStyle: {
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: 12,
            height: 64,
            borderRadius: 18,
            borderTopWidth: 1,
            borderTopColor: '#dcfce7',
            backgroundColor: '#ffffff',
            shadowColor: '#052e16',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
          tabBarActiveTintColor: '#16a34a',
          tabBarInactiveTintColor: '#9ca3af',
        }}
      >
        <Tab.Screen
          name="Home"
          options={{ title: 'Home', tabBarIcon: ({ color }) => <TabGlyph label="H" color={color} /> }}
        >
          {() => <HomeScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Transactions"
          options={{ title: 'Transactions', tabBarIcon: ({ color }) => <TabGlyph label="T" color={color} /> }}
        >
          {() => <TransactionsScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Disputes"
          options={{ title: 'Disputes', tabBarIcon: ({ color }) => <TabGlyph label="D" color={color} /> }}
        >
          {() => <DisputesScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabGlyph label="S" color={color} /> }}
        >
          {() => <SettingsScreen apiKey={apiKey} onSignOut={() => setApiKey(null)} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabGlyph: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    backgroundColor: '#fff',
  },
  tabGlyphText: { fontSize: 10, fontWeight: '800' },
});
