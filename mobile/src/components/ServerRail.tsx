import React from 'react';

import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Plus,
} from 'lucide-react-native';

import {
  NativePressable,
} from './NativePressable';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import type {
  EliseoServer,
} from '../services/firebase';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

type Props = {
  servers: EliseoServer[];

  onOpenServer?: (
    serverId: string,
  ) => void;

  onCreateServer?: () => void;
};

function getAccent(
  serverId: string,
) {
  const accents = [
    '#536DFE',
    '#7C5CFC',
    '#3F8CFF',
    '#8B5CF6',
    '#5B7FFF',
    '#667EEA',
  ];

  let total = 0;

  for (
    let index = 0;
    index < serverId.length;
    index++
  ) {
    total +=
      serverId.charCodeAt(
        index,
      );
  }

  return accents[
    total %
      accents.length
  ];
}

export function ServerRail({
  servers,
  onOpenServer,
  onCreateServer,
}: Props) {
  const {palette} =
    useAppAppearance();

  return (
    <FlatList
      horizontal
      style={styles.rail}
      data={servers}
      keyExtractor={
        item => item.id
      }
      showsHorizontalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.content
      }
      renderItem={({
        item,
      }) => (
        <NativePressable
          haptic
          onPress={() =>
            onOpenServer?.(
              item.id,
            )
          }
          style={
            styles.serverButton
          }
        >
          <View
            style={[
              styles.server,
              {
                backgroundColor:
                  getAccent(
                    item.id,
                  ),
              },
            ]}
          >
            {!!item.photo ? (
              <Image
                source={{
                  uri:
                    item.photo,
                }}
                style={
                  styles.image
                }
                resizeMode="cover"
              />
            ) : (
              <Text
                style={
                  styles.initial
                }
              >
                {item.name
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </View>
        </NativePressable>
      )}
      ListFooterComponent={
        <NativePressable
          haptic
          onPress={
            onCreateServer
          }
          style={
            styles.serverButton
          }
        >
          <View
            style={[
              styles.server,
              styles.add,
              {
                backgroundColor:
                  palette.panel2,
              },
            ]}
          >
            <Plus
              size={23}
              color={
                colors.blue
              }
            />
          </View>
        </NativePressable>
      }
    />
  );
}

const styles =
  StyleSheet.create({
    rail: {
      flexGrow: 0,
    },

    content: {
      gap:
        spacing.sm,

      paddingHorizontal:
        spacing.md,

      paddingTop: 6,
      paddingBottom: 6,
    },

    serverButton: {
      width: 52,
      height: 52,
    },

    server: {
      flex: 1,

      overflow:
        'hidden',

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    add: {
      backgroundColor:
        colors.panel2,
    },

    image: {
      width: '100%',
      height: '100%',
    },

    initial: {
      color:
        colors.white,

      fontSize: 18,

      fontWeight:
        '800',
    },
  });