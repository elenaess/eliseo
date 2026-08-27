import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Camera,
  Check,
  Image as ImageIcon,
  MoreHorizontal,
  X,
} from 'lucide-react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  NativePressable,
} from './NativePressable';

import {
  auth,
  EliseoServer,
  updateServerSettings,
} from '../services/firebase';

import {
  pickSingleImage,
} from '../services/media';

import {
  uploadCommunityImage,
} from '../services/storage';

import {
  colors,
  radii,
  spacing,
} from '../theme';

export function ServerSettingsEditor({
  server,
}: {
  server: EliseoServer;
}) {
  const insets =
    useSafeAreaInsets();

  const uid =
    auth.currentUser?.uid ??
    '';

  const owner =
    !!uid &&
    server.ownerId === uid;

  const [open, setOpen] =
    useState(false);

  const [name, setName] =
    useState(
      server.name,
    );

  const [photo, setPhoto] =
    useState<
      Awaited<
        ReturnType<
          typeof pickSingleImage
        >
      >
    >(null);

  const [banner, setBanner] =
    useState<
      Awaited<
        ReturnType<
          typeof pickSingleImage
        >
      >
    >(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    setName(
      server.name,
    );
  }, [server.name]);

  if (!owner) {
    return null;
  }

  async function choosePhoto() {
    if (saving) {
      return;
    }

    try {
      setError('');
      const image =
        await pickSingleImage();

      if (image) {
        setPhoto(image);
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
        setBanner(image);
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
    if (!uid || saving) {
      return;
    }

    const cleanName =
      name.trim();

    if (
      cleanName.length < 2 ||
      cleanName.length > 40
    ) {
      setError(
        'O nome precisa ter entre 2 e 40 caracteres.',
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      let photoUrl =
        server.photo ??
        '';

      let bannerUrl =
        server.banner ??
        '';

      if (photo) {
        const uploaded =
          await uploadCommunityImage(
            uid,
            photo,
          );

        photoUrl =
          uploaded.url;
      }

      if (banner) {
        const uploaded =
          await uploadCommunityImage(
            uid,
            banner,
          );

        bannerUrl =
          uploaded.url;
      }

      await updateServerSettings(
        server.id,
        uid,
        {
          name:
            cleanName,
          photo:
            photoUrl,
          banner:
            bannerUrl,
        },
      );

      setPhoto(null);
      setBanner(null);
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar o servidor.',
      );
    } finally {
      setSaving(false);
    }
  }

  const photoPreview =
    photo?.uri ||
    server.photo ||
    '';

  const bannerPreview =
    banner?.uri ||
    server.banner ||
    '';

  return (
    <>
      <NativePressable
        haptic
        onPress={() => {
          setError('');
          setOpen(true);
        }}
        style={styles.trigger}
      >
        <View style={styles.triggerInner}>
          <MoreHorizontal
            size={22}
            color={colors.textSoft}
          />
        </View>
      </NativePressable>

      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={() =>
          setOpen(false)
        }
      >
        <View
          style={[
            styles.backdrop,
            {
              paddingTop:
                insets.top + 20,
              paddingBottom:
                Math.max(
                  insets.bottom + 20,
                  28,
                ),
            },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  Editar servidor
                </Text>

                <Text style={styles.subtitle}>
                  Só o dono pode alterar nome, foto e banner.
                </Text>
              </View>

              <NativePressable
                haptic
                onPress={() =>
                  setOpen(false)
                }
                style={styles.close}
              >
                <View style={styles.closeInner}>
                  <X
                    size={18}
                    color={colors.textSoft}
                  />
                </View>
              </NativePressable>
            </View>

            <Text style={styles.label}>
              Nome
            </Text>

            <TextInput
              value={name}
              onChangeText={value =>
                setName(
                  value.slice(0, 40),
                )
              }
              editable={!saving}
              placeholder="Nome do servidor"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />

            <View style={styles.mediaRow}>
              <NativePressable
                haptic
                disabled={saving}
                onPress={() => {
                  void choosePhoto();
                }}
                style={styles.mediaButton}
              >
                <View style={styles.mediaInner}>
                  <View style={styles.photoPreview}>
                    {photoPreview ? (
                      <Image
                        source={{
                          uri:
                            photoPreview,
                        }}
                        resizeMode="cover"
                        style={styles.previewImage}
                      />
                    ) : (
                      <Camera
                        size={24}
                        color={colors.blue}
                      />
                    )}
                  </View>

                  <Text style={styles.mediaTitle}>
                    Foto
                  </Text>

                  <Text style={styles.mediaHint}>
                    Toque para trocar
                  </Text>
                </View>
              </NativePressable>

              <NativePressable
                haptic
                disabled={saving}
                onPress={() => {
                  void chooseBanner();
                }}
                style={styles.mediaButton}
              >
                <View style={styles.mediaInner}>
                  <View style={styles.bannerPreview}>
                    {bannerPreview ? (
                      <Image
                        source={{
                          uri:
                            bannerPreview,
                        }}
                        resizeMode="cover"
                        style={styles.previewImage}
                      />
                    ) : (
                      <ImageIcon
                        size={24}
                        color={colors.blue}
                      />
                    )}
                  </View>

                  <Text style={styles.mediaTitle}>
                    Banner
                  </Text>

                  <Text style={styles.mediaHint}>
                    Toque para trocar
                  </Text>
                </View>
              </NativePressable>
            </View>

            {!!error && (
              <Text style={styles.error}>
                {error}
              </Text>
            )}

            <NativePressable
              haptic
              disabled={saving}
              onPress={() => {
                void save();
              }}
              style={styles.save}
            >
              <View style={styles.saveInner}>
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />
                ) : (
                  <>
                    <Check
                      size={18}
                      color={colors.white}
                    />
                    <Text style={styles.saveText}>
                      Salvar alterações
                    </Text>
                  </>
                )}
              </View>
            </NativePressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    trigger: {
      width: 44,
      height: 44,
    },

    triggerInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor:
        colors.panel2,
    },

    backdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 18,
      backgroundColor:
        'rgba(0,0,0,0.70)',
    },

    card: {
      padding: 18,
      gap: 12,
      borderRadius: 24,
      borderWidth:
        StyleSheet.hairlineWidth,
      borderColor:
        'rgba(255,255,255,0.08)',
      backgroundColor:
        colors.panel,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    headerText: {
      flex: 1,
      gap: 4,
    },

    title: {
      color:
        colors.text,
      fontSize: 18,
      fontWeight: '800',
    },

    subtitle: {
      color:
        colors.muted,
      fontSize: 11,
      lineHeight: 15,
    },

    close: {
      width: 36,
      height: 36,
    },

    closeInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor:
        colors.panel2,
    },

    label: {
      marginTop: 4,
      color:
        colors.textSoft,
      fontSize: 11,
      fontWeight: '700',
    },

    input: {
      minHeight: 48,
      borderRadius:
        radii.md,
      borderWidth:
        StyleSheet.hairlineWidth,
      borderColor:
        'rgba(255,255,255,0.08)',
      paddingHorizontal: 14,
      backgroundColor:
        colors.panel2,
      color:
        colors.text,
      fontSize: 13,
    },

    mediaRow: {
      flexDirection: 'row',
      gap: 10,
    },

    mediaButton: {
      flex: 1,
    },

    mediaInner: {
      minHeight: 142,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.panel2,
    },

    photoPreview: {
      width: 58,
      height: 58,
      overflow: 'hidden',
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.panel3,
    },

    bannerPreview: {
      width: '100%',
      height: 58,
      overflow: 'hidden',
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.panel3,
    },

    previewImage: {
      ...StyleSheet.absoluteFill,
      width: undefined,
      height: undefined,
    },

    mediaTitle: {
      marginTop: 2,
      color:
        colors.textSoft,
      fontSize: 12,
      fontWeight: '800',
    },

    mediaHint: {
      color:
        colors.faint,
      fontSize: 9,
    },

    save: {
      minHeight: 48,
      marginTop: 2,
    },

    saveInner: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.blue,
    },

    saveText: {
      color:
        colors.white,
      fontSize: 13,
      fontWeight: '800',
    },

    error: {
      color:
        colors.red,
      fontSize: 11,
      lineHeight: 15,
    },
  });
