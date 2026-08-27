import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  ArrowLeft,
  Moon,
  Sun,
} from 'lucide-react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import type {
  RootStackParamList,
} from '../types/navigation';

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Appearance'
  >;

export function AppearanceScreen({
  navigation,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const {
    isWhite,
    loading,
    palette,
    setBackground,
  } = useAppAppearance();

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  async function toggleWhite(
    enabled: boolean,
  ) {
    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await setBackground(
        enabled
          ? 'white'
          : 'default',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível alterar a aparência.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={[
        styles.root,
        {
          backgroundColor:
            palette.bg,
        },
      ]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop:
            insets.top + 10,
          paddingBottom:
            Math.max(
              insets.bottom + 24,
              32,
            ),
        },
      ]}
      showsVerticalScrollIndicator={
        false
      }
    >
      <View
        style={styles.header}
      >
        <NativePressable
          haptic
          onPress={() =>
            navigation.goBack()
          }
          style={styles.back}
        >
          <View
            style={[
              styles.backInner,
              {
                backgroundColor:
                  palette.panel2,
              },
            ]}
          >
            <ArrowLeft
              size={20}
              color={
                palette.textSoft
              }
            />
          </View>
        </NativePressable>

        <View
          style={styles.headerText}
        >
          <Text
            style={[
              styles.title,
              {
                color:
                  palette.text,
              },
            ]}
          >
            Aparência
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  palette.muted,
              },
            ]}
          >
            Personalize o fundo do Elíseo.
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.preview,
          {
            backgroundColor:
              isWhite
                ? '#FFFFFF'
                : colors.bg,
            borderColor:
              isWhite
                ? 'rgba(15,23,42,0.10)'
                : 'rgba(255,255,255,0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.previewTop,
            {
              backgroundColor:
                isWhite
                  ? '#F7F8FA'
                  : colors.panel,
            },
          ]}
        >
          {isWhite ? (
            <Sun
              size={22}
              color={colors.blue}
            />
          ) : (
            <Moon
              size={22}
              color={colors.blue}
            />
          )}

          <Text
            style={[
              styles.previewTitle,
              {
                color:
                  isWhite
                    ? '#111827'
                    : colors.text,
              },
            ]}
          >
            {isWhite
              ? 'Fundo branco'
              : 'Fundo padrão'}
          </Text>
        </View>

        <View
          style={styles.previewBody}
        >
          <View
            style={[
              styles.previewLine,
              {
                backgroundColor:
                  isWhite
                    ? '#E8EBEF'
                    : colors.panel2,
              },
            ]}
          />

          <View
            style={[
              styles.previewLine,
              styles.previewLineShort,
              {
                backgroundColor:
                  isWhite
                    ? '#EEF1F4'
                    : colors.panel2,
              },
            ]}
          />
        </View>
      </View>

      <Text
        style={[
          styles.section,
          {
            color:
              palette.muted,
          },
        ]}
      >
        FUNDO
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor:
              palette.panel,
          },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                palette.panel2,
            },
          ]}
        >
          <Sun
            size={20}
            color={colors.blue}
          />
        </View>

        <View
          style={styles.settingText}
        >
          <Text
            style={[
              styles.settingTitle,
              {
                color:
                  palette.textSoft,
              },
            ]}
          >
            Fundo branco
          </Text>

          <Text
            style={[
              styles.settingDescription,
              {
                color:
                  palette.faint,
              },
            ]}
          >
            Troca o fundo padrão escuro do app por branco.
          </Text>
        </View>

        {loading || saving ? (
          <ActivityIndicator
            size="small"
            color={colors.blue}
          />
        ) : (
          <Switch
            value={isWhite}
            onValueChange={
              toggleWhite
            }
            trackColor={{
              false:
                palette.panel3,
              true:
                'rgba(66,169,255,0.42)',
            }}
            thumbColor={
              isWhite
                ? colors.blue
                : palette.muted
            }
          />
        )}
      </View>

      {!!error && (
        <Text
          style={styles.error}
        >
          {error}
        </Text>
      )}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
    },

    content: {
      paddingHorizontal:
        spacing.md,
    },

    header: {
      minHeight: 70,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    back: {
      width: 42,
      height: 42,
    },

    backInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 10,
    },

    preview: {
      minHeight: 168,
      marginTop: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderRadius: radii.xl,
    },

    previewTop: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
    },

    previewTitle: {
      fontSize: 14,
      fontWeight: '700',
    },

    previewBody: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 18,
      gap: 10,
    },

    previewLine: {
      height: 14,
      borderRadius: 7,
    },

    previewLineShort: {
      width: '68%',
    },

    section: {
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 4,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
    },

    card: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderRadius: radii.md,
    },

    iconBox: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
    },

    settingText: {
      flex: 1,
      marginHorizontal: 12,
    },

    settingTitle: {
      fontSize: 13,
      fontWeight: '700',
    },

    settingDescription: {
      marginTop: 4,
      fontSize: 9,
      lineHeight: 13,
    },

    error: {
      marginTop: 10,
      paddingHorizontal: 4,
      color: '#FF7085',
      fontSize: 10,
    },
  });
