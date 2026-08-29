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

import {startPushForUser, stopPushListeners} from '../services/push';
import {startMusicPresenceSync, stopMusicPresenceSync} from '../services/music';
import {colors} from '../theme';
import type {RootStackParamList} from '../types/navigation';

import {
  AppAppearanceProvider,
  useAppAppearance,
} from '../context/AppAppearanceContext';

import {AppearanceScreen} from '../screens/AppearanceScreen';
import {BookReaderScreen} from '../screens/BookReaderScreen';
import {CallScreen} from '../screens/CallScreen';
import {ChatScreen} from '../screens/ChatScreen';
import {FinanceScreen} from '../screens/FinanceScreen';
import {IntegrationsScreen} from '../screens/IntegrationsScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {PasswordResetScreen} from '../screens/PasswordResetScreen';
import {ServerScreen} from '../screens/ServerScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {VerifyEmailScreen} from '../screens/VerifyEmailScreen';
import {MainTabs} from './MainTabs';

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
              component={LoginScreen}
              options={{animation: 'fade'}}
            />
            <Stack.Screen
              name="PasswordReset"
              component={PasswordResetScreen}
              options={{animation: 'slide_from_bottom'}}
            />
          </>
        ) : needsVerification ? (
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmailScreen}
            options={{animation: 'fade', gestureEnabled: false}}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{animation: 'fade', gestureEnabled: false}}
            />
            <Stack.Screen name="Server" component={ServerScreen}/>
            <Stack.Screen name="Chat" component={ChatScreen}/>
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{animation: 'fade_from_bottom'}}
            />
            <Stack.Screen name="Finance" component={FinanceScreen}/>
            <Stack.Screen name="Appearance" component={AppearanceScreen}/>
            <Stack.Screen name="Notifications" component={NotificationsScreen}/>
            <Stack.Screen name="Settings" component={SettingsScreen}/>
            <Stack.Screen name="Integrations" component={IntegrationsScreen}/>
            <Stack.Screen
              name="PasswordReset"
              component={PasswordResetScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name="BookReader"
              component={BookReaderScreen}
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
    const unsubscribe = onIdTokenChanged(auth, user => {
      if (!user) {
        stopMusicPresenceSync();
        stopPushListeners();
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

      if (verified) {
        void startPushForUser(user.uid);
        startMusicPresenceSync(user.uid);
      } else {
        stopMusicPresenceSync();
        stopPushListeners();
      }

      setInitializing(false);
    });

    return unsubscribe;
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
