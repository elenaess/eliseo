import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
} from 'react-native';

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function LogoMark({
  size = 46,
  style,
}: Props) {
  return (
    <Image
      source={require('../assets/eliseo.png')}
      resizeMode="contain"
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}