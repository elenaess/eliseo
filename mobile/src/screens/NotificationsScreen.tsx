import React, {
  useEffect,
  useMemo,
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
  Bell,
  BellOff,
  CheckCheck,
  Hash,
  MessageCircle,
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
  auth,
} from '../services/firebase';

import {
  EliseoNotificationItem,
  listenToNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications';

import {
  AppPreferences,
  DEFAULT_APP_PREFERENCES,
  listenToAppPreferences,
  setDmNotificationsEnabled,
  setNotificationsEnabled,
  setServerNotificationsEnabled,
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
    'Notifications'
  >;

function formatNotificationTime(
  timestamp: any,
) {
  const date =
    timestamp?.toDate?.();

  if (!date) {
    return 'agora';
  }

  const now = new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return date.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }

  return date.toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'short',
    },
  );
}

export function NotificationsScreen({
  navigation,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const {
    palette,
  } = useAppAppearance();

  const uid =
    auth.currentUser?.uid ?? '';

  const [preferences, setPreferences] =
    useState<AppPreferences>(
      DEFAULT_APP_PREFERENCES,
    );

  const [items, setItems] =
    useState<
      EliseoNotificationItem[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    return listenToAppPreferences(
      uid,
      incoming => {
        setPreferences(incoming);
      },
    );
  }, [uid]);

  useEffect(() => {
    if (
      !uid ||
      !preferences.notifications.enabled
    ) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    return listenToNotificationFeed(
      uid,
      incoming => {
        setItems(incoming);
        setLoading(false);
      },
    );
  }, [
    uid,
    preferences.notifications.enabled,
  ]);

  const visibleItems =
    useMemo(
      () =>
        items.filter(item => {
          if (
            item.kind === 'dm'
          ) {
            return preferences
              .notifications.dms;
          }

          return preferences
            .notifications.servers;
        }),
      [items, preferences],
    );

  const totalUnread =
    useMemo(
      () =>
        visibleItems.reduce(
          (sum, item) =>
            sum +
            Math.max(
              1,
              item.unreadCount,
            ),
          0,
        ),
      [visibleItems],
    );

  async function changeMaster(
    enabled: boolean,
  ) {
    if (!uid || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await setNotificationsEnabled(
        uid,
        enabled,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar as notificações.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeDms(
    enabled: boolean,
  ) {
    if (!uid || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await setDmNotificationsEnabled(
        uid,
        enabled,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar as DMs.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeServers(
    enabled: boolean,
  ) {
    if (!uid || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await setServerNotificationsEnabled(
        uid,
        enabled,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar os servidores.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function openNotification(
    item: EliseoNotificationItem,
  ) {
    if (!uid) {
      return;
    }

    try {
      await markNotificationRead(
        uid,
        item,
      );
    } catch {
      // A navegação continua mesmo se a marcação de leitura falhar.
    }

    if (item.kind === 'dm') {
      navigation.navigate(
        'Chat',
        {
          conversationId:
            item.conversationId,
          name:
            item.chatName,
          otherUid:
            item.otherUid,
        },
      );
      return;
    }

    navigation.navigate(
      'Chat',
      {
        conversationId:
          item.conversationId,
        name:
          item.chatName,
        serverId:
          item.serverId,
        channelId:
          item.channelId,
      },
    );
  }

  async function markEverything() {
    if (
      !uid ||
      saving ||
      visibleItems.length === 0
    ) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await markAllNotificationsRead(
        uid,
        visibleItems,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível marcar tudo como lido.',
      );
    } finally {
      setSaving(false);
    }
  }

  const notificationsEnabled =
    preferences.notifications.enabled;

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
              insets.bottom + 26,
              34,
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
            Notificações
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
            DMs e mensagens novas dos seus servidores.
          </Text>
        </View>

        {notificationsEnabled &&
          totalUnread > 0 && (
          <View
            style={styles.badge}
          >
            <Text
              style={styles.badgeText}
            >
              {totalUnread > 99
                ? '99+'
                : totalUnread}
            </Text>
          </View>
        )}
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
        CONTROLE
      </Text>

      <View
        style={[
          styles.settingsCard,
          {
            backgroundColor:
              palette.panel,
          },
        ]}
      >
        <SettingRow
          palette={palette}
          title="Notificações"
          description="Ativa ou desativa toda a central de notificações."
          icon={
            notificationsEnabled
              ? 'bell'
              : 'off'
          }
          value={
            notificationsEnabled
          }
          disabled={saving}
          onChange={changeMaster}
        />

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                palette.border,
            },
          ]}
        />

        <SettingRow
          palette={palette}
          title="Mensagens diretas"
          description="Mostra novas DMs nesta tela."
          icon="dm"
          value={
            preferences.notifications.dms
          }
          disabled={
            saving ||
            !notificationsEnabled
          }
          onChange={changeDms}
        />

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                palette.border,
            },
          ]}
        />

        <SettingRow
          palette={palette}
          title="Servidores"
          description="Mostra mensagens novas dos canais de servidores."
          icon="server"
          value={
            preferences.notifications.servers
          }
          disabled={
            saving ||
            !notificationsEnabled
          }
          onChange={changeServers}
        />
      </View>

      {!!error && (
        <Text
          style={styles.error}
        >
          {error}
        </Text>
      )}

      <View
        style={styles.notificationsHeading}
      >
        <Text
          style={[
            styles.section,
            styles.sectionNoBottom,
            {
              color:
                palette.muted,
            },
          ]}
        >
          RECENTES
        </Text>

        {notificationsEnabled &&
          visibleItems.length > 0 && (
          <NativePressable
            haptic
            disabled={saving}
            onPress={() => {
              void markEverything();
            }}
            style={styles.markAll}
          >
            <View
              style={[
                styles.markAllInner,
                {
                  backgroundColor:
                    palette.panel2,
                },
              ]}
            >
              <CheckCheck
                size={15}
                color={colors.blue}
              />

              <Text
                style={styles.markAllText}
              >
                Marcar como lidas
              </Text>
            </View>
          </NativePressable>
        )}
      </View>

      {!notificationsEnabled ? (
        <EmptyState
          palette={palette}
          icon="off"
          title="Notificações desativadas"
          description="Ative a opção acima para voltar a receber DMs e novidades dos servidores nesta tela."
        />
      ) : loading ? (
        <View
          style={styles.loading}
        >
          <ActivityIndicator
            size="small"
            color={colors.blue}
          />
        </View>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          palette={palette}
          icon="bell"
          title="Tudo em dia"
          description="Quando chegar uma nova DM ou mensagem de servidor, ela aparece aqui."
        />
      ) : (
        <View
          style={styles.notificationList}
        >
          {visibleItems.map(
            item => (
              <NativePressable
                key={item.id}
                haptic
                onPress={() => {
                  void openNotification(
                    item,
                  );
                }}
                style={
                  styles.notificationPressable
                }
              >
                <View
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor:
                        palette.panel,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      {
                        backgroundColor:
                          palette.panel2,
                      },
                    ]}
                  >
                    {item.kind ===
                    'dm' ? (
                      <MessageCircle
                        size={20}
                        color={colors.blue}
                      />
                    ) : (
                      <Hash
                        size={20}
                        color={colors.blue}
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.notificationText
                    }
                  >
                    <View
                      style={styles.notificationTitleRow}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.notificationTitle,
                          {
                            color:
                              palette.textSoft,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>

                      <Text
                        style={[
                          styles.notificationTime,
                          {
                            color:
                              palette.faint,
                          },
                        ]}
                      >
                        {formatNotificationTime(
                          item.createdAt,
                        )}
                      </Text>
                    </View>

                    {item.kind ===
                      'server' && (
                      <Text
                        style={styles.channelName}
                      >
                        {item.chatName}
                      </Text>
                    )}

                    <Text
                      numberOfLines={2}
                      style={[
                        styles.notificationBody,
                        {
                          color:
                            palette.muted,
                        },
                      ]}
                    >
                      {item.body}
                    </Text>
                  </View>

                  {item.unreadCount > 1 && (
                    <View
                      style={styles.countBubble}
                    >
                      <Text
                        style={styles.countText}
                      >
                        {item.unreadCount > 99
                          ? '99+'
                          : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </NativePressable>
            ),
          )}
        </View>
      )}
    </ScrollView>
  );
}

type MiniPalette =
  ReturnType<
    typeof useAppAppearance
  >['palette'];

function SettingRow({
  palette,
  title,
  description,
  icon,
  value,
  disabled,
  onChange,
}: {
  palette: MiniPalette;
  title: string;
  description: string;
  icon:
    | 'bell'
    | 'off'
    | 'dm'
    | 'server';
  value: boolean;
  disabled?: boolean;
  onChange: (
    enabled: boolean,
  ) => void;
}) {
  return (
    <View
      style={styles.settingRow}
    >
      <View
        style={[
          styles.settingIcon,
          {
            backgroundColor:
              palette.panel2,
          },
        ]}
      >
        {icon === 'off' ? (
          <BellOff
            size={19}
            color={palette.muted}
          />
        ) : icon === 'dm' ? (
          <MessageCircle
            size={19}
            color={colors.blue}
          />
        ) : icon === 'server' ? (
          <Hash
            size={19}
            color={colors.blue}
          />
        ) : (
          <Bell
            size={19}
            color={colors.blue}
          />
        )}
      </View>

      <View
        style={styles.settingText}
      >
        <Text
          style={[
            styles.settingTitle,
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
            styles.settingDescription,
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

function EmptyState({
  palette,
  icon,
  title,
  description,
}: {
  palette: MiniPalette;
  icon: 'bell' | 'off';
  title: string;
  description: string;
}) {
  return (
    <View
      style={styles.empty}
    >
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor:
              palette.panel2,
          },
        ]}
      >
        {icon === 'off' ? (
          <BellOff
            size={28}
            color={palette.muted}
          />
        ) : (
          <Bell
            size={28}
            color={colors.blue}
          />
        )}
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color:
              palette.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.emptyText,
          {
            color:
              palette.faint,
          },
        ]}
      >
        {description}
      </Text>
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

    badge: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.blue2,
      borderRadius: 14,
    },

    badgeText: {
      color: colors.white,
      fontSize: 9,
      fontWeight: '800',
    },

    section: {
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 4,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
    },

    sectionNoBottom: {
      marginBottom: 0,
    },

    settingsCard: {
      overflow: 'hidden',
      borderRadius: radii.md,
    },

    settingRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },

    settingIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },

    settingText: {
      flex: 1,
      marginHorizontal: 11,
    },

    settingTitle: {
      fontSize: 12,
      fontWeight: '700',
    },

    settingDescription: {
      marginTop: 4,
      fontSize: 9,
      lineHeight: 13,
    },

    divider: {
      height: 1,
      marginLeft: 63,
    },

    error: {
      marginTop: 9,
      paddingHorizontal: 4,
      color: '#FF7085',
      fontSize: 10,
    },

    notificationsHeading: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    markAll: {
      height: 34,
    },

    markAllInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 11,
    },

    markAllText: {
      color: colors.blue,
      fontSize: 9,
      fontWeight: '700',
    },

    loading: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },

    notificationList: {
      gap: 7,
    },

    notificationPressable: {
      minHeight: 78,
    },

    notificationCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
      borderRadius: radii.md,
    },

    notificationIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
    },

    notificationText: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
    },

    notificationTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    notificationTitle: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
    },

    notificationTime: {
      fontSize: 8,
    },

    channelName: {
      marginTop: 2,
      color: colors.blue,
      fontSize: 8,
      fontWeight: '700',
    },

    notificationBody: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 14,
    },

    countBubble: {
      minWidth: 24,
      height: 24,
      marginLeft: 8,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.blue2,
      borderRadius: 12,
    },

    countText: {
      color: colors.white,
      fontSize: 8,
      fontWeight: '800',
    },

    empty: {
      minHeight: 230,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 62,
      height: 62,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },

    emptyTitle: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '700',
    },

    emptyText: {
      maxWidth: 280,
      marginTop: 5,
      fontSize: 10,
      lineHeight: 15,
      textAlign: 'center',
    },
  });
