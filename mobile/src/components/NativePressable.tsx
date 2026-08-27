import React, {useCallback} from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {motion} from '../theme';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  haptic?: boolean;
};

const hapticOptions = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

export function NativePressable({
  style,
  pressedScale = 0.98,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const pressIn: NonNullable<PressableProps['onPressIn']> = useCallback(
    event => {
      scale.value = withSpring(pressedScale, motion.spring);
      if (haptic) {
        ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
      }
      onPressIn?.(event);
    },
    [haptic, onPressIn, pressedScale, scale],
  );

  const pressOut: NonNullable<PressableProps['onPressOut']> = useCallback(
    event => {
      scale.value = withSpring(1, motion.spring);
      onPressOut?.(event);
    },
    [onPressOut, scale],
  );

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        {...rest}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={{flex: 1}}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
