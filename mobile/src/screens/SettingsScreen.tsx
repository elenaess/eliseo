import React, {
  useEffect,
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
  AtSign,
  ChevronRight,
  Gauge,
  Globe2,
  KeyRound,
  Radio,
} from 'lucide-react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  AcademicAccountRows,
} from '../components/AcademicAccountRows';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

import {
  auth,
} from '../services/firebase';

import {
  AppPreferences,
  DEFAULT_APP_PREFERENCES,
  listenToAppPreferences,
  setDataSaver,
  setShowOnlineStatus,
} from '../services/preferences';

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
    'Settings'
  >;

export function SettingsScreen({
  navigation,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const {
    palette,
  } = useAppAppearance();

  const uid =
    auth.currentUser?.uid ?? '';

  const email =
    auth.currentUser?.email ??
    '';

  const [preferences, setPreferences] =
    useState<AppPreferences>(
      DEFAULT_APP_PREFERENCES,
    );

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!uid) {
      return;
    }

    return listenToAppPreferences(
      uid,
      setPreferences,
    );
  }, [uid]);

  async function changeOnlineStatus(
    enabled: boolean,
  ) {
    if (!uid || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await setShowOnlineStatus(
        uid,
        enabled,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar a configuração.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeDataSaver(
    enabled: boolean,
  ) {
    if (!uid || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await setDataSaver(
        uid,
        enabled,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar a configuração.',
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
              insets.bottom + 28,
              36,
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
            Configurações
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
            Preferências gerais da sua conta e do aplicativo.
          </Text>
        </View>
      </View>

      <SectionLabel
        color={palette.muted}
      >
        CONTA
      </SectionLabel>

      <View
        style={[
          styles.group,
          {
            backgroundColor:
              palette.panel,
          },
        ]}
      >
        <InfoRow
          palette={palette}
          icon="email"
          title="E-mail"
          value={
            email ||
            'Sem e-mail disponível'
          }
        />

        <Divider
          color={palette.border}
        />

        <ActionRow
          palette={palette}
          icon="password"
          title="Alterar senha"
          description="Confirme um código enviado ao seu e-mail."
          disabled={saving || !email}
          onPress={() => {
            navigation.navigate(
              'PasswordReset',
              {authenticated: true},
            );
          }}
        />

        <AcademicAccountRows />
      </View>

      <SectionLabel
        color={palette.muted}
      >
        PRIVACIDADE E PRESENÇA
      </SectionLabel>

      <View
        style={[
          styles.group,
          {
            backgroundColor:
              palette.panel,
          },
        ]}
      >
        <SwitchRow
          palette={palette}
          icon="status"
          title="Mostrar status online"
          description="Permite que o app use essa preferência para exibir sua presença."
          value={
            preferences.settings.showOnlineStatus
          }
          disabled={saving}
          onChange={
            changeOnlineStatus
          }
        />
      </View>

      <SectionLabel
        color={palette.muted}
      >
        APLICATIVO
      </SectionLabel>

      <View
        style={[
          styles.group,
          {
            backgroundColor:
              palette.panel,
          },
        ]}
      >
        <InfoRow
          palette={palette}
          icon="language"
          title="Idioma"
          value="Português (Brasil)"
        />

        <Divider
          color={palette.border}
        />

        <SwitchRow
          palette={palette}
          icon="data"
          title="Economia de dados"
          description="Preferência para reduzir carregamentos automáticos de mídia."
          value={
            preferences.settings.dataSaver
          }
          disabled={saving}
          onChange={changeDataSaver}
        />
      </View>

      {saving && (
        <View
          style={styles.savingRow}
        >
          <ActivityIndicator
            size="small"
            color={colors.blue}
          />

          <Text
            style={[
              styles.savingText,
              {
                color:
                  palette.muted,
              },
            ]}
          >
            Salvando…
          </Text>
        </View>
      )}

      {!!message && (
        <Text
          style={styles.success}
        >
          {message}
        </Text>
      )}

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

type MiniPalette =
  ReturnType<
    typeof useAppAppearance
  >['palette'];

function SectionLabel({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Text
      style={[
        styles.section,
        {color},
      ]}
    >
      {children}
    </Text>
  );
}

function Divider({
  color,
}: {
  color: string;
}) {
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: color,
        },
      ]}
    />
  );
}

function iconFor(
  icon:
    | 'email'
    | 'password'
    | 'status'
    | 'language'
    | 'data',
  color: string,
) {
  if (icon === 'email') {
    return (
      <AtSign
        size={19}
        color={color}
      />
    );
  }

  if (icon === 'password') {
    return (
      <KeyRound
        size={19}
        color={color}
      />
    );
  }

  if (icon === 'status') {
    return (
      <Radio
        size={19}
        color={color}
      />
    );
  }

  if (icon === 'language') {
    return (
      <Globe2
        size={19}
        color={color}
      />
    );
  }

  return (
    <Gauge
      size={19}
      color={color}
    />
  );
}

function RowIcon({
  palette,
  icon,
}: {
  palette: MiniPalette;
  icon:
    | 'email'
    | 'password'
    | 'status'
    | 'language'
    | 'data';
}) {
  return (
    <View
      style={[
        styles.rowIcon,
        {
          backgroundColor:
            palette.panel2,
        },
      ]}
    >
      {iconFor(
        icon,
        colors.blue,
      )}
    </View>
  );
}

function InfoRow({
  palette,
  icon,
  title,
  value,
}: {
  palette: MiniPalette;
  icon: 'email' | 'language';
  title: string;
  value: string;
}) {
  return (
    <View
      style={styles.row}
    >
      <RowIcon
        palette={palette}
        icon={icon}
      />

      <View
        style={styles.rowText}
      >
        <Text
          style={[
            styles.rowTitle,
            {
              color:
                palette.textSoft,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.rowValue,
            {
              color:
                palette.faint,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionRow({
  palette,
  icon,
  title,
  description,
  disabled,
  onPress,
}: {
  palette: MiniPalette;
  icon: 'password';
  title: string;
  description: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <NativePressable
      haptic
      disabled={disabled}
      onPress={onPress}
      style={styles.actionPressable}
    >
      <View
        style={styles.row}
      >
        <RowIcon
          palette={palette}
          icon={icon}
        />

        <View
          style={styles.rowText}
        >
          <Text
            style={[
              styles.rowTitle,
              {
                color:
                  disabled
                    ? palette.faint
                    : palette.textSoft,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.rowValue,
              {
                color:
                  palette.faint,
              },
            ]}
          >
            {description}
          </Text>
        </View>

        <ChevronRight
          size={18}
          color={palette.faint}
        />
      </View>
    </NativePressable>
  );
}

function SwitchRow({
  palette,
  icon,
  title,
  description,
  value,
  disabled,
  onChange,
}: {
  palette: MiniPalette;
  icon: 'status' | 'data';
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <View
      style={styles.row}
    >
      <RowIcon
        palette={palette}
        icon={icon}
      />

      <View
        style={styles.rowText}
      >
        <Text
          style={[
            styles.rowTitle,
            {
              color:
                disabled
                  ? palette.faint
                  : palette.textSoft,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.rowValue,
            {
              color:
                palette.faint,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{
          false: palette.panel3,
          true:
            'rgba(66,169,255,0.42)',
        }}
        thumbColor={
          value
            ? colors.blue
            : palette.muted
        }
      />
    </View>
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
      minHeight: 72,
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
      minWidth: 0,
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

    section: {
      marginTop: 22,
      marginBottom: 8,
      paddingHorizontal: 4,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
    },

    group: {
      overflow: 'hidden',
      borderRadius: radii.md,
    },

    actionPressable: {
      minHeight: 72,
    },

    row: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
    },

    rowIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },

    rowText: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 11,
    },

    rowTitle: {
      fontSize: 12,
      fontWeight: '700',
    },

    rowValue: {
      marginTop: 4,
      fontSize: 9,
      lineHeight: 13,
    },

    divider: {
      height: 1,
      marginLeft: 62,
    },

    savingRow: {
      marginTop: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 4,
    },

    savingText: {
      fontSize: 9,
    },

    success: {
      marginTop: 12,
      paddingHorizontal: 4,
      color: '#58C997',
      fontSize: 10,
      lineHeight: 14,
    },

    error: {
      marginTop: 12,
      paddingHorizontal: 4,
      color: '#FF7085',
      fontSize: 10,
      lineHeight: 14,
    },
  });
