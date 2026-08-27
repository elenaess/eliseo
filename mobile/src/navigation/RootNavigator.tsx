import React, {useEffect, useMemo, useState} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  getAuth,
  onAuthStateChanged,
} from '@react-native-firebase/auth';

import {
  startPushForUser,
  stopPushListeners,
} from '../services/push';

import {colors} from '../theme';

import type {
  RootStackParamList,
} from '../types/navigation';

// APARÊNCIA
import {
  AppAppearanceProvider,
  useAppAppearance,
} from '../context/AppAppearanceContext';

// TELAS
import {AppearanceScreen} from '../screens/AppearanceScreen';
import {CallScreen} from '../screens/CallScreen';
import {ChatScreen} from '../screens/ChatScreen';
import {FinanceScreen} from '../screens/FinanceScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {ServerScreen} from '../screens/ServerScreen';
import {SettingsScreen} from '../screens/SettingsScreen';

import {MainTabs} from './MainTabs';

const Stack =
  createNativeStackNavigator<RootStackParamList>();

const auth = getAuth();

type NavigatorContentProps = {
  signedIn: boolean;
};

function NavigatorContent({
  signedIn,
}: NavigatorContentProps) {
  const {
    palette,
  } = useAppAppearance();

  const navigationTheme =
    useMemo(
      () => ({
        ...DarkTheme,

        dark: !(
          palette.bg.toUpperCase() ===
          '#FFFFFF'
        ),

        colors: {
          ...DarkTheme.colors,

          background:
            palette.bg,

          card:
            palette.panel,

          text:
            palette.text,

          primary:
            colors.blue,

          border:
            palette.border,

          notification:
            colors.blue,
        },
      }),
      [palette],
    );

  return (
    <NavigationContainer
      theme={navigationTheme}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,

          animation:
            'slide_from_right',

          contentStyle: {
            backgroundColor:
              palette.bg,
          },
        }}
      >
        {!signedIn ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              animation: 'fade',
            }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{
                animation: 'fade',
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="Server"
              component={ServerScreen}
            />

            <Stack.Screen
              name="Chat"
              component={ChatScreen}
            />

            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{
                animation:
                  'fade_from_bottom',
              }}
            />

            <Stack.Screen
              name="Finance"
              component={FinanceScreen}
            />

            {/* APARÊNCIA */}
            <Stack.Screen
              name="Appearance"
              component={AppearanceScreen}
            />

            {/* NOTIFICAÇÕES */}
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />

            {/* CONFIGURAÇÕES */}
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function RootNavigator() {
  const [
    initializing,
    setInitializing,
  ] = useState(true);

  const [
    signedIn,
    setSignedIn,
  ] = useState(false);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        user => {
          /* ELISEO_PUSH_AUTH */
          if (user) {
            void startPushForUser(
              user.uid,
            );
          } else {
            stopPushListeners();
          }

          setSignedIn(
            !!user,
          );

          setInitializing(
            false,
          );
        },
      );

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View
        style={styles.loading}
      >
        <ActivityIndicator
          size="small"
          color={colors.blue}
        />
      </View>
    );
  }

  return (
    <AppAppearanceProvider>
      <NavigatorContent
        signedIn={signedIn}
      />
    </AppAppearanceProvider>
  );
}

const styles =
  StyleSheet.create({
    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.bg,
    },
  });