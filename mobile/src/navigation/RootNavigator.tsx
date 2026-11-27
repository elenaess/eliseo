import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  getAuth,
  onIdTokenChanged,
} from '@react-native-firebase/auth';

import {colors} from '../theme';
import type {RootStackParamList} from '../types/navigation';

import {
  AppAppearanceProvider,
  useAppAppearance,
} from '../context/AppAppearanceContext';


const Stack = createNativeStackNavigator<RootStackParamList>();
const auth = getAuth();

type NavigatorContentProps = {
  signedIn: boolean;
  needsVerification: boolean;
};

function NavigatorContent({
  signedIn,
  needsVerification,
}: NavigatorContentProps) {
  const {palette} = useAppAppearance();

  const navigationTheme = useMemo(
    () => ({
      ...DarkTheme,
      dark: palette.bg.toUpperCase() !== '#FFFFFF',
      colors: {
        ...DarkTheme.colors,
        background: palette.bg,
        card: palette.panel,
        text: palette.text,
        primary: colors.blue,
        border: palette.border,
        notification: colors.blue,
      },
    }),
    [palette],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {backgroundColor: palette.bg},
        }}
      >
        {!signedIn ? (
          <>
            <Stack.Screen
              name="Login"
              getComponent={() => require('../screens/LoginScreen').LoginScreen}
              options={{animation: 'fade'}}
            />
            <Stack.Screen
              name="PasswordReset"
              getComponent={() => require('../screens/PasswordResetScreen').PasswordResetScreen}
              options={{animation: 'slide_from_bottom'}}
            />
          </>
        ) : needsVerification ? (
          <Stack.Screen
            name="VerifyEmail"
            getComponent={() => require('../screens/VerifyEmailScreen').VerifyEmailScreen}
            options={{animation: 'fade', gestureEnabled: false}}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              getComponent={() => require('./MainTabs').MainTabs}
              options={{animation: 'fade', gestureEnabled: false}}
            />
            <Stack.Screen name="Server" getComponent={() => require('../screens/ServerScreen').ServerScreen}/>
            <Stack.Screen name="Chat" getComponent={() => require('../screens/ChatScreen').ChatScreen}/>
            <Stack.Screen
              name="Call"
              getComponent={() => require('../screens/CallScreen').CallScreen}
              options={{animation: 'fade_from_bottom'}}
            />
            <Stack.Screen name="Finance" getComponent={() => require('../screens/FinanceScreen').FinanceScreen}/>
            <Stack.Screen name="Appearance" getComponent={() => require('../screens/AppearanceScreen').AppearanceScreen}/>
            <Stack.Screen name="Notifications" getComponent={() => require('../screens/NotificationsScreen').NotificationsScreen}/>
            <Stack.Screen name="Settings" getComponent={() => require('../screens/SettingsScreen').SettingsScreen}/>
            <Stack.Screen name="Integrations" getComponent={() => require('../screens/IntegrationsScreen').IntegrationsScreen}/>
            <Stack.Screen
              name="PasswordReset"
              getComponent={() => require('../screens/PasswordResetScreen').PasswordResetScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name="BookReader"
              getComponent={() => require('../screens/BookReaderScreen').BookReaderScreen}
              options={{animation: 'slide_from_right'}}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function RootNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    let active = true;
    let serviceTimer: ReturnType<typeof setTimeout> | undefined;
    let stopOptionalServices = () => {};
    const unsubscribe = onIdTokenChanged(auth, user => {
      if (serviceTimer) clearTimeout(serviceTimer);
      stopOptionalServices();
      stopOptionalServices = () => {};
      if (!user) {
        setSignedIn(false);
        setNeedsVerification(false);
        setInitializing(false);
        return;
      }

      const googleVerified = user.providerData.some(
        provider => provider.providerId === 'google.com',
      );
      const verified = user.emailVerified || googleVerified;

      setSignedIn(true);
      setNeedsVerification(!verified);

      setInitializing(false);
      if (verified) {
        serviceTimer = setTimeout(() => {
          if (!active || auth.currentUser?.uid !== user.uid) return;
          const stops: Array<() => void> = [];
          stopOptionalServices = () => {
            for (const stop of stops) {
              try { stop(); } catch (error) { console.warn('[Psiu] service cleanup', error); }
            }
          };
          try {
            const push = require('../services/push');
            stops.push(push.stopPushListeners);
            Promise.resolve(push.startPushForUser(user.uid)).catch(error => console.warn('[Psiu] push', error));
          } catch (error) { console.warn('[Psiu] push unavailable', error); }
          try {
            const music = require('../services/music');
            stops.push(music.stopMusicPresenceSync);
            music.startMusicPresenceSync(user.uid);
          } catch (error) { console.warn('[Psiu] music unavailable', error); }
        }, 500);
      }
    });

    return () => {
      active = false;
      if (serviceTimer) clearTimeout(serviceTimer);
      stopOptionalServices();
      unsubscribe();
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.blue}/>
      </View>
    );
  }

  return (
    <AppAppearanceProvider>
      <NavigatorContent
        signedIn={signedIn}
        needsVerification={needsVerification}
      />
    </AppAppearanceProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
