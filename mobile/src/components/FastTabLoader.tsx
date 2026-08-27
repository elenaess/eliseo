import React, {
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  colors,
} from '../theme';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

type Props = {
  visible: boolean;
};

const TAB_BAR_BASE_HEIGHT = 74;

export function FastTabLoader({
  visible,
}: Props) {
  const {
    palette,
  } = useAppAppearance();

  const insets =
    useSafeAreaInsets();

  const rotation =
    useRef(
      new Animated.Value(0),
    ).current;

  useEffect(() => {
    if (!visible) {
      rotation.stopAnimation();
      rotation.setValue(0);
      return;
    }

    const loop =
      Animated.loop(
        Animated.timing(
          rotation,
          {
            toValue: 1,
            duration: 140,
            easing:
              Easing.linear,
            useNativeDriver:
              true,
          },
        ),
      );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [
    rotation,
    visible,
  ]);

  if (!visible) {
    return null;
  }

  const rotate =
    rotation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  const tabBarHeight =
    TAB_BAR_BASE_HEIGHT +
    Math.max(
      insets.bottom,
      8,
    );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          bottom:
            tabBarHeight,
          backgroundColor:
            palette.bg,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            transform: [
              {rotate},
            ],
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            styles.dotTop,
          ]}
        />

        <View
          style={[
            styles.dot,
            styles.dotRight,
          ]}
        />

        <View
          style={[
            styles.dot,
            styles.dotLeft,
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      position:
        'absolute',

      top: 0,
      left: 0,
      right: 0,

      alignItems:
        'center',

      justifyContent:
        'center',

      zIndex: 20,

      elevation: 20,
    },

    spinner: {
      width: 34,
      height: 34,
    },

    dot: {
      position:
        'absolute',

      width: 7,
      height: 7,

      borderRadius: 999,

      backgroundColor:
        colors.blue,
    },

    dotTop: {
      top: 0,
      left: 13.5,
    },

    dotRight: {
      right: 1,
      bottom: 5,
      opacity: 0.78,
    },

    dotLeft: {
      left: 1,
      bottom: 5,
      opacity: 0.5,
    },
  });
