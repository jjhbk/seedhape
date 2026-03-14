import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DeviceInfo from 'react-native-device-info';

import HomeScreen from './screens/HomeScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import DisputesScreen from './screens/DisputesScreen';
import SettingsScreen from './screens/SettingsScreen';
import ApiKeyScreen from './screens/ApiKeyScreen';
import { startNotificationListener } from './services/notification-bridge';
import { ensureBackgroundSyncRunning, getApiKey, registerDevice } from './services/api';
import { C } from './theme';

const Tab = createBottomTabNavigator();

export type LastNotification = {
  amount: number;
  senderName?: string;
  upiApp?: string;
  receivedAt: string;
};

// ─── Tab Icons ───────────────────────────────────────────────────────────────

function HouseIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 9,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
      }} />
      <View style={{ width: 15, height: 11, backgroundColor: color, borderRadius: 1, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <View style={{ width: 6, height: 7, backgroundColor: C.bg, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      </View>
    </View>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <View style={{ gap: 4, paddingVertical: 1 }}>
      <View style={{ height: 2.5, width: 20, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ height: 2.5, width: 14, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ height: 2.5, width: 18, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 21, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 18, height: 19,
        borderTopLeftRadius: 8, borderTopRightRadius: 8,
        borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
        backgroundColor: color, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: C.bg, fontSize: 11, fontWeight: '900', lineHeight: 13 }}>!</Text>
      </View>
    </View>
  );
}

function SlidersIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, gap: 4, paddingVertical: 1 }}>
      {[{ dot: 6 }, { dot: 14 }, { dot: 10 }].map(({ dot }, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', height: 2.5 }}>
          <View style={{ flex: 1, height: 2.5, backgroundColor: color, borderRadius: 2 }} />
          <View style={{ position: 'absolute', left: dot - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: C.bg, borderWidth: 2, borderColor: color }} />
        </View>
      ))}
    </View>
  );
}

// ─── Navigation theme ────────────────────────────────────────────────────────
const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg },
};

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [lastNotification, setLastNotification] = useState<LastNotification | null>(null);

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
      setLastNotification({
        amount: n.amount,
        senderName: n.senderName,
        upiApp: n.upiApp,
        receivedAt: n.receivedAt,
      });
    });
  }

  async function ensureAndroidNotificationPermission() {
    if (Platform.OS !== 'android') return;
    if (Number(Platform.Version) < 33) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  if (checking) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashMark}>
          <View style={styles.splashLeafLeft} />
          <View style={styles.splashLeafRight} />
          <View style={styles.splashStem} />
        </View>
        <Text style={styles.splashWord}>seedhape</Text>
        <ActivityIndicator color={C.green} size="small" style={{ marginTop: 32 }} />
      </View>
    );
  }

  if (!apiKey) {
    return <ApiKeyScreen onSuccess={(key) => setApiKey(key)} />;
  }

  return (
    <NavigationContainer theme={NavTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: C.green,
          tabBarInactiveTintColor: C.textMuted,
        }}
      >
        <Tab.Screen
          name="Home"
          options={{ title: 'Home', tabBarIcon: ({ color }) => <HouseIcon color={color} /> }}
        >
          {() => <HomeScreen apiKey={apiKey} lastNotification={lastNotification} />}
        </Tab.Screen>
        <Tab.Screen
          name="Transactions"
          options={{ title: 'Payments', tabBarIcon: ({ color }) => <ListIcon color={color} /> }}
        >
          {() => <TransactionsScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Disputes"
          options={{ title: 'Disputes', tabBarIcon: ({ color }) => <ShieldIcon color={color} /> }}
        >
          {() => <DisputesScreen apiKey={apiKey} />}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <SlidersIcon color={color} /> }}
        >
          {() => <SettingsScreen apiKey={apiKey} onSignOut={() => setApiKey(null)} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashMark: {
    width: 64,
    height: 64,
    backgroundColor: C.greenSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLeafLeft: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 14,
    height: 14,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: C.green,
    transform: [{ rotate: '-30deg' }],
  },
  splashLeafRight: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 14,
    height: 14,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: C.greenBright,
    transform: [{ rotate: '30deg' }],
  },
  splashStem: {
    position: 'absolute',
    bottom: 10,
    width: 3,
    height: 20,
    backgroundColor: C.green,
    borderRadius: 2,
  },
  splashWord: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    height: 62,
    borderRadius: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 10,
    marginTop: 2,
  },
});
