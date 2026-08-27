import React from 'react';

import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
} from '../theme';

type Props = {
  name: string;
  size?: number;
  accent?: string;
  uri?: string;
};

export function Avatar({
  name,
  size = 46,
  accent = colors.purple,
  uri,
}: Props) {
  const initial =
    name
      .trim()
      .charAt(0)
      .toUpperCase() || 'E';

  if (uri) {
    return (
      <Image
        source={{
          uri,
        }}
        style={{
          width: size,
          height: size,
          borderRadius:
            size / 2,
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,

          borderRadius:
            size / 2,

          backgroundColor:
            accent,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize:
              Math.max(
                14,
                size * 0.38,
              ),
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    avatar: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    text: {
      color:
        colors.white,

      fontWeight:
        '800',
    },
  });