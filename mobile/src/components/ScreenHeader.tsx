import React, {ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, spacing} from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.side}>{left}</View>

      <View style={styles.center}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  side: {
    width: 54,
    minHeight: 44,
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '750',
    letterSpacing: -0.25,
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
});
