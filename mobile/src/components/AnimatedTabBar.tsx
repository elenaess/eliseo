import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {
  Folder,
  Home,
  MessageCircle,
  UserRound,
  Users,
} from 'lucide-react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  colors,
  radii,
} from '../theme';
import {
  NativePressable,
} from './NativePressable';
import {
  useAppAppearance,
} from '../context/AppAppearanceContext';
import type {
  AppPalette,
} from '../context/AppAppearanceContext';

const icons = {
  Feed: Home,
  Communities: Users,
  Messages: MessageCircle,
  Drive: Folder,
  Profile: UserRound,
} as const;

const labels = {
  Feed: 'Feed',
  Communities: 'Comunidades',
  Messages: 'Mensagens',
  Drive: 'Pastas',
  Profile: 'Perfil',
} as const;

function TabItem({
  routeName,
  focused,
  onPress,
  palette,
}: {
  routeName:
    keyof typeof icons;
  focused: boolean;
  onPress: () => void;
  palette: AppPalette;
}) {
  const Icon =
    icons[routeName];

  return (
    <NativePressable
      haptic
      onPress={onPress}
      style={styles.item}
    >
      <View
        style={
          styles.itemInner
        }
      >
        <View
          style={[
            styles.iconWrap,
            focused &&
              styles.iconWrapFocused,
          ]}
        >
          <Icon
            size={21}
            strokeWidth={
              focused
                ? 2.4
                : 2
            }
            color={
              focused
                ? colors.blue
                : palette.muted
            }
          />
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color:
                palette.faint,
            },
            focused && {
              color:
                palette.textSoft,
            },
          ]}
        >
          {labels[routeName]}
        </Text>
      </View>
    </NativePressable>
  );
}

type Props =
  BottomTabBarProps & {
    onSwitchTab?: (
      navigate: () => void,
    ) => void;
  };

export function AnimatedTabBar({
  state,
  navigation,
  onSwitchTab,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const {
    palette,
  } = useAppAppearance();

  return (
    <View
      style={[
        styles.root,
        {
          paddingBottom:
            Math.max(
              insets.bottom,
              8,
            ),
          backgroundColor:
            palette.bg,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor:
              palette.panel,
            borderColor:
              palette.border,
          },
        ]}
      >
        {state.routes.map(
          (
            route,
            index,
          ) => {
            const focused =
              state.index ===
              index;

            const routeName =
              route.name as keyof typeof icons;

            if (
              !icons[
                routeName
              ]
            ) {
              return null;
            }

            return (
              <TabItem
                key={
                  route.key
                }
                routeName={
                  routeName
                }
                focused={
                  focused
                }
                palette={
                  palette
                }
                onPress={() => {
                  const event =
                    navigation.emit(
                      {
                        type:
                          'tabPress',
                        target:
                          route.key,
                        canPreventDefault:
                          true,
                      },
                    );

                  if (
                    !focused &&
                    !event.defaultPrevented
                  ) {
                    const navigate =
                      () => {
                        navigation.navigate(
                          route.name,
                          route.params,
                        );
                      };

                    if (
                      onSwitchTab
                    ) {
                      onSwitchTab(
                        navigate,
                      );
                    } else {
                      navigate();
                    }
                  }
                }}
              />
            );
          },
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    root: {
      paddingHorizontal:
        10,
      paddingTop: 6,
    },

    bar: {
      minHeight: 68,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius: 20,
      paddingHorizontal: 4,
      paddingVertical: 5,
      shadowColor:
        colors.black,
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      elevation: 16,
    },

    item: {
      flex: 1,
      minWidth: 0,
      height: 58,
    },

    itemInner: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 3,
    },

    iconWrap: {
      width: 36,
      height: 30,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderRadius:
        radii.pill,
    },

    iconWrapFocused: {
      backgroundColor:
        'rgba(66,169,255,0.11)',
    },

    label: {
      fontSize: 9,
      fontWeight:
        '650',
    },
  });
