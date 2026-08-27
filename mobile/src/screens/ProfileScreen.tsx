import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  } from 'react-native';

import type {
  BottomTabScreenProps,
  } from '@react-navigation/bottom-tabs';

import type {
  CompositeScreenProps,
  } from '@react-navigation/native';

import type {
  NativeStackScreenProps,
  } from '@react-navigation/native-stack';

import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  LogOut,
  Palette,
  Pencil,
  Settings,
  X,
  } from 'lucide-react-native';

import LinearGradient from 'react-native-linear-gradient';

import {
  useSafeAreaInsets,
  } from 'react-native-safe-area-context';

import {
  signOut,
  } from '@react-native-firebase/auth';

import {
  Avatar,
  } from '../components/Avatar';

import {
  NativePressable,
  } from '../components/NativePressable';

import {
  auth,
  EliseoUser,
  listenToUserProfile,
  updateUserProfile,
  updateUserBanner,
  } from '../services/firebase';

import {
  pickSingleImage,
  updateProfileAvatar,
  } from '../services/media';

import {
  uploadAvatar,
  uploadCommunityImage,
} from '../services/storage';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

import {
  unregisterPushForUser,
} from '../services/push';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import type {
  MainTabParamList,
  RootStackParamList,
} from '../types/navigation';

type Props =
  CompositeScreenProps<
    BottomTabScreenProps<
      MainTabParamList,
      'Profile'
    >,
    NativeStackScreenProps<
      RootStackParamList
    >
  >;

const rows = [
  {
    id: 'appearance',
    label: 'Aparência',
    Icon: Palette,
    route: 'Appearance' as const,
  },

  {
    id: 'notifications',
    label: 'Notificações',
    Icon: Bell,
    route: 'Notifications' as const,
  },

  {
    id: 'settings',
    label: 'Configurações',
    Icon: Settings,
    route: 'Settings' as const,
  },
];

export function ProfileScreen({
  navigation,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const {
    palette,
    isWhite,
  } = useAppAppearance();

  const [
    profile,
    setProfile,
  ] =
    useState<
      EliseoUser | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    username,
    setUsername,
  ] =
    useState('');

  const [
    bio,
    setBio,
  ] =
    useState('');

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    selectedAvatar,
    setSelectedAvatar,
  ] =
    useState<
      Awaited<
        ReturnType<
          typeof pickSingleImage
        >
      >
    >(null);

  const [
    selectedBanner,
    setSelectedBanner,
  ] =
    useState<
      Awaited<
        ReturnType<
          typeof pickSingleImage
        >
      >
    >(null);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe =
      listenToUserProfile(
        user.uid,
        incomingProfile => {
          setProfile(
            incomingProfile,
          );

          if (
            incomingProfile
          ) {
            setUsername(
              incomingProfile.username,
            );

            setBio(
              incomingProfile.bio ??
                '',
            );
          }

          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  async function chooseAvatar() {
    if (saving) {
      return;
    }

    try {
      setError('');

      const image =
        await pickSingleImage();

      if (image) {
        setSelectedAvatar(
          image,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível escolher a foto.',
      );
    }
  }

  async function chooseBanner() {
    if (saving) {
      return;
    }

    try {
      setError('');
      const image =
        await pickSingleImage();

      if (image) {
        setSelectedBanner(image);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível escolher o banner.',
      );
    }
  }

  async function save() {
    const user =
      auth.currentUser;

    if (!user) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateUserProfile(
        user.uid,
        username,
        bio,
      );

      if (selectedAvatar) {
        const uploaded =
          await uploadAvatar(
            user.uid,
            selectedAvatar,
          );

        await updateProfileAvatar(
          user.uid,
          uploaded.url,
        );
      }

      if (selectedBanner) {
        const uploadedBanner =
          await uploadCommunityImage(
            user.uid,
            selectedBanner,
          );

        await updateUserBanner(
          user.uid,
          uploadedBanner.url,
        );
      }

      setSelectedAvatar(null);
      setSelectedBanner(null);
      setEditing(false);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar o perfil.';

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setUsername(
      profile?.username ??
        '',
    );

    setBio(
      profile?.bio ??
        '',
    );

    setSelectedAvatar(null);
    setSelectedBanner(null);
    setError('');
    setEditing(false);
  }

  async function logout() {
    const user =
      auth.currentUser;

    if (user) {
      await unregisterPushForUser(
        user.uid,
      );
    }

    await signOut(auth);
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loading,
          {
            backgroundColor:
              palette.bg,
          },
        ]}
      >
        <ActivityIndicator
          size="small"
          color={
            colors.blue
          }
        />
      </View>
    );
  }

  const displayName =
    profile?.username ||
    auth.currentUser?.email
      ?.split('@')[0] ||
    'Usuário';

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
            insets.top + 14,
        },
      ]}
      showsVerticalScrollIndicator={
        false
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.titleRow
        }
      >
        <Text
          style={[
            styles.title,
            isWhite && {
              color:
                palette.text,
            },
          ]}
        >
          Perfil
        </Text>

        {!editing ? (
          <NativePressable
            haptic
            onPress={() => {
              setError('');
              setEditing(true);
            }}
            style={
              styles.edit
            }
          >
            <View
              style={
                styles.editInner
              }
            >
              <Pencil
                size={18}
                color={
                  colors.textSoft
                }
              />
            </View>
          </NativePressable>
        ) : (
          <View
            style={
              styles.editActions
            }
          >
            <NativePressable
              haptic
              onPress={
                cancelEditing
              }
              style={
                styles.edit
              }
            >
              <View
                style={
                  styles.editInner
                }
              >
                <X
                  size={19}
                  color={
                    colors.muted
                  }
                />
              </View>
            </NativePressable>

            <NativePressable
              haptic
              disabled={
                saving
              }
              onPress={save}
              style={
                styles.edit
              }
            >
              <View
                style={[
                  styles.editInner,
                  styles.saveButton,
                ]}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.white
                    }
                  />
                ) : (
                  <Check
                    size={19}
                    color={
                      colors.white
                    }
                  />
                )}
              </View>
            </NativePressable>
          </View>
        )}
      </View>

      <LinearGradient
        colors={[
          '#1E5EBD',
          '#6551C8',
          '#24334C',
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={
          styles.profileCard
        }
      >
        {/* ELISEO_PROFILE_BANNER */}
        {!!(selectedBanner?.uri || profile?.banner) && (
          <>
            <Image
              source={{
                uri:
                  selectedBanner?.uri ||
                  profile?.banner ||
                  '',
              }}
              resizeMode="cover"
              style={styles.profileBannerImage}
            />
            <View
              pointerEvents="none"
              style={styles.profileBannerShade}
            />
          </>
        )}

        {editing && (
          <NativePressable
            haptic
            disabled={saving}
            onPress={() => {
              void chooseBanner();
            }}
            style={styles.bannerEdit}
          >
            <View style={styles.bannerEditInner}>
              <Camera size={15} color={colors.white} />
              <Text style={styles.bannerEditText}>Banner</Text>
            </View>
          </NativePressable>
        )}
        <View
          style={
            styles.avatarWrap
          }
        >
          <Avatar
            name={
              displayName
            }
            uri={
              selectedAvatar?.uri ||
              profile?.avatar
            }
            accent={
              colors.blue2
            }
            size={82}
          />

          {editing && (
            <NativePressable
              haptic
              disabled={
                saving
              }
              onPress={() => {
                void chooseAvatar();
              }}
              style={
                styles.avatarEdit
              }
            >
              <View
                style={
                  styles.avatarEditInner
                }
              >
                <Camera
                  size={17}
                  color={
                    colors.white
                  }
                />
              </View>
            </NativePressable>
          )}
        </View>

        {!editing ? (
          <>
            <Text
              style={
                styles.name
              }
            >
              {displayName}
            </Text>

            <Text
              style={
                styles.handle
              }
            >
              @{displayName}
            </Text>

            <Text
              style={
                styles.bio
              }
            >
              {profile?.bio ||
                'Personalize sua bio no Elíseo.'}
            </Text>

            {!!(profile?.course || profile?.institutionTag) && (
              <View style={styles.academicIdentity}>
                {!!profile?.course && (
                  <Text style={styles.courseText}>
                    {profile.course}
                    {!!profile?.institutionTag && ' — '}
                  </Text>
                )}
                {!!profile?.institutionTag && (
                  <View style={styles.institutionBadge}>
                    <Text style={styles.institutionBadgeText}>
                      {profile.institutionTag}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View
            style={
              styles.editor
            }
          >
            <Text
              style={
                styles.editorLabel
              }
            >
              Nome de usuário
            </Text>

            <View
              style={
                styles.inputWrap
              }
            >
              <Text
                style={
                  styles.at
                }
              >
                @
              </Text>

              <TextInput
                value={
                  username
                }
                onChangeText={
                  setUsername
                }
                style={
                  styles.input
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                placeholder="usuario"
                placeholderTextColor={
                  colors.faint
                }
                editable={
                  !saving
                }
                maxLength={
                  30
                }
              />
            </View>

            <Text
              style={[
                styles.editorLabel,
                styles.bioLabel,
              ]}
            >
              Bio
            </Text>

            <TextInput
              value={bio}
              onChangeText={
                setBio
              }
              style={[
                styles.inputWrap,
                styles.bioInput,
              ]}
              placeholder="Conte um pouco sobre você..."
              placeholderTextColor={
                colors.faint
              }
              multiline
              editable={
                !saving
              }
              maxLength={
                120
              }
            />

            <Text
              style={
                styles.bioCount
              }
            >
              {bio.length}/120
            </Text>
          </View>
        )}
      </LinearGradient>

      {!!error && (
        <Text
          style={
            styles.error
          }
        >
          {error}
        </Text>
      )}

      <Text
        style={[
          styles.section,
          isWhite && {
            color:
              palette.muted,
          },
        ]}
      >
        Conta
      </Text>

      <NativePressable
        haptic
        onPress={() =>
          navigation.navigate(
            'Finance',
          )
        }
        style={
          styles.row
        }
      >
        <View
          style={
            styles.rowInner
          }
        >
          <View
            style={
              styles.rowIcon
            }
          >
            <CreditCard
              size={20}
              color={
                colors.blue
              }
            />
          </View>

          <Text
            style={
              styles.rowLabel
            }
          >
            PIX e pagamentos
          </Text>

          <ChevronRight
            size={19}
            color={
              colors.faint
            }
          />
        </View>
      </NativePressable>

      <Text
        style={[
          styles.section,
          isWhite && {
            color:
              palette.muted,
          },
        ]}
      >
        Aplicativo
      </Text>

      {rows.map(
        ({
          id,
          label,
          Icon,
          route,
        }) => (
          <NativePressable
            key={id}
            haptic
            onPress={() =>
              navigation.navigate(
                route,
              )
            }
            style={
              styles.row
            }
          >
            <View
              style={
                styles.rowInner
              }
            >
              <View
                style={
                  styles.rowIcon
                }
              >
                <Icon
                  size={20}
                  color={
                    colors.textSoft
                  }
                />
              </View>

              <Text
                style={
                  styles.rowLabel
                }
              >
                {label}
              </Text>

              <ChevronRight
                size={19}
                color={
                  colors.faint
                }
              />
            </View>
          </NativePressable>
        ),
      )}

      <NativePressable
        haptic
        onPress={() =>
          signOut(auth)
        }
        style={[
          styles.row,
          styles.logout,
        ]}
      >
        <View
          style={
            styles.rowInner
          }
        >
          <View
            style={[
              styles.rowIcon,
              styles.logoutIcon,
            ]}
          >
            <LogOut
              size={20}
              color={
                colors.red
              }
            />
          </View>

          <Text
            style={[
              styles.rowLabel,
              styles.logoutLabel,
            ]}
          >
            Sair da conta
          </Text>
        </View>
      </NativePressable>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,

      backgroundColor:
        colors.bg,
    },

    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.bg,
    },

    content: {
      paddingHorizontal:
        spacing.md,

      paddingBottom:
        28,
    },

    titleRow: {
      minHeight: 54,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        4,
    },

    title: {
      color:
        colors.text,

      fontSize:
        22,

      fontWeight:
        '700',

      letterSpacing:
        -0.5,
    },

    editActions: {
      marginLeft:
        'auto',

      flexDirection:
        'row',

      gap: 7,
    },

    edit: {
      width: 42,
      height: 42,

      marginLeft:
        'auto',
    },

    editInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius:
        14,
    },

    saveButton: {
      backgroundColor:
        colors.blue2,
    },

    profileCard: {
      overflow: 'hidden',
      minHeight: 250,

      marginTop: 8,

      padding: 22,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        radii.xl,
    },

    avatarWrap: {
      position: 'relative',
    },

    avatarEdit: {
      position: 'absolute',

      right: -4,
      bottom: -4,

      width: 34,
      height: 34,
    },

    avatarEditInner: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        colors.blue2,

      borderWidth: 3,
      borderColor:
        '#304A7A',

      borderRadius: 12,
    },

    name: {
      marginTop:
        14,

      color:
        colors.white,

      fontSize:
        25,

      fontWeight:
        '800',
    },

    handle: {
      marginTop: 2,

      color:
        'rgba(255,255,255,0.7)',

      fontSize:
        11,
    },

    bio: {
      maxWidth:
        260,

      marginTop:
        12,

      color:
        'rgba(255,255,255,0.85)',

      fontSize:
        12,

      lineHeight:
        17,

      textAlign:
        'center',
    },

    editor: {
      width:
        '100%',

      marginTop:
        18,
    },

    editorLabel: {
      marginBottom:
        6,

      color:
        'rgba(255,255,255,0.72)',

      fontSize:
        10,

      fontWeight:
        '700',
    },

    bioLabel: {
      marginTop:
        12,
    },

    inputWrap: {
      minHeight:
        44,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        12,

      backgroundColor:
        'rgba(4,11,22,0.42)',

      borderRadius:
        13,
    },

    at: {
      color:
        'rgba(255,255,255,0.55)',

      fontSize:
        14,
    },

    input: {
      flex: 1,

      color:
        colors.white,

      fontSize:
        13,

      paddingVertical:
        0,
    },

    bioInput: {
      minHeight:
        82,

      color:
        colors.white,

      fontSize:
        12,

      lineHeight:
        17,

      paddingTop:
        11,

      paddingBottom:
        11,

      textAlignVertical:
        'top',
    },

    bioCount: {
      marginTop:
        5,

      alignSelf:
        'flex-end',

      color:
        'rgba(255,255,255,0.45)',

      fontSize:
        9,
    },

    error: {
      marginTop:
        10,

      paddingHorizontal:
        4,

      color:
        '#FF8A9A',

      fontSize:
        11,
    },

    section: {
      marginTop:
        22,

      marginBottom:
        8,

      paddingHorizontal:
        4,

      color:
        colors.muted,

      fontSize:
        10,

      fontWeight:
        '700',

      textTransform:
        'uppercase',

      letterSpacing:
        0.8,
    },

    row: {
      minHeight:
        60,

      marginBottom:
        6,
    },

    rowInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        10,

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.md,
    },

    rowIcon: {
      width: 38,
      height: 38,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius:
        12,
    },

    rowLabel: {
      flex: 1,

      marginLeft:
        11,

      color:
        colors.textSoft,

      fontSize:
        13,

      fontWeight:
        '600',
    },

    logout: {
      marginTop:
        12,
    },

    logoutIcon: {
      backgroundColor:
        'rgba(239,62,88,0.09)',
    },

    logoutLabel: {
      color:
        colors.red,
    },
  
    profileBannerImage: {
      ...StyleSheet.absoluteFill,
      width: undefined,
      height: undefined,
      zIndex: 0,
    },

    profileBannerShade: {
      ...StyleSheet.absoluteFill,
      zIndex: 1,
      backgroundColor: 'rgba(5,10,18,0.34)',
    },

    bannerEdit: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 4,
    },

    bannerEditInner: {
      minHeight: 34,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 17,
      backgroundColor: 'rgba(5,10,18,0.70)',
    },

    bannerEditText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '800',
    },

    academicIdentity: {
      marginTop: 11,
      minHeight: 28,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      zIndex: 2,
    },

    courseText: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 12,
      fontWeight: '700',
    },

    institutionBadge: {
      minHeight: 26,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.20)',
    },

    institutionBadgeText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '800',
    },
});