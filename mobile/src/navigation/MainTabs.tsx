import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
} from 'react-native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import type {
  MainTabParamList,
} from '../types/navigation';

import {
  AnimatedTabBar,
} from '../components/AnimatedTabBar';

import {
  FastTabLoader,
} from '../components/FastTabLoader';






import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

const Tab =
  createBottomTabNavigator<MainTabParamList>();

const TAB_FLASH_MS = 105;

export function MainTabs() {
  const {
    palette,
  } = useAppAppearance();

  const [
    switchingTab,
    setSwitchingTab,
  ] = useState(false);

  const timerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  useEffect(() => {
    return () => {
      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current,
        );
      }
    };
  }, []);

  const switchTab =
    useCallback(
      (
        navigate:
          () => void,
      ) => {
        if (
          timerRef.current
        ) {
          clearTimeout(
            timerRef.current,
          );
        }

        setSwitchingTab(true);

        // A navegação acontece imediatamente.
        // O loader apenas cobre a troca por ~0,1 s,
        // dando a sensação de resposta instantânea.
        navigate();

        timerRef.current =
          setTimeout(
            () => {
              setSwitchingTab(
                false,
              );

              timerRef.current =
                null;
            },
            TAB_FLASH_MS,
          );
      },
      [],
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          palette.bg,
      }}
    >
      <Tab.Navigator
        initialRouteName="Feed"
        tabBar={props => (
          <AnimatedTabBar
            {...props}
            onSwitchTab={
              switchTab
            }
          />
        )}
        screenOptions={{
          headerShown: false,
          lazy: true,
          sceneStyle: {
            backgroundColor:
              palette.bg,
          },
        }}
      >
        <Tab.Screen
          name="Feed"
          getComponent={() => require('../screens/FeedScreen').FeedScreen}
        />

        <Tab.Screen
          name="Communities"
          getComponent={() => require('../screens/CommunitiesScreen').CommunitiesScreen}
        />

        <Tab.Screen
          name="Messages"
          getComponent={() => require('../screens/MessagesScreen').MessagesScreen}
        />

        <Tab.Screen
          name="Drive"
          getComponent={() => require('../screens/DriveScreen').DriveScreen}
        />

        <Tab.Screen
          name="Profile"
          getComponent={() => require('../screens/ProfileScreen').ProfileScreen}
        />
      </Tab.Navigator>

      <FastTabLoader
        visible={switchingTab}
      />
    </View>
  );
}
