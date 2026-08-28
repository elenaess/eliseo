import React from 'react';
import {StyleSheet, View} from 'react-native';

export type EliseoStatus = 'online' | 'busy' | 'offline';

export function normalizeEliseoStatus(value: unknown): EliseoStatus {
  return value === 'online' || value === 'busy' || value === 'offline'
    ? value
    : 'offline';
}

export function statusColor(status: EliseoStatus) {
  if (status === 'online') return '#4A9FFF';
  if (status === 'busy') return '#F2B94B';
  return '#7E8796';
}

export function StatusDot({
  status,
  size = 16,
  borderColor = '#FFFFFF',
}: {
  status: EliseoStatus;
  size?: number;
  borderColor?: string;
}) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          backgroundColor: statusColor(status),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
  },
});
