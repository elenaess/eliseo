import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AtSign,
  Check,
  GraduationCap,
  School,
  X,
} from 'lucide-react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

import {
  NativePressable,
} from './NativePressable';

import {
  auth,
  listenToUserProfile,
  updateAcademicProfile,
} from '../services/firebase';

import {
  findInstitutionForEmail,
} from '../data/institutionalDomains';

import {
  colors,
  radii,
  spacing,
} from '../theme';

export function AcademicAccountRows() {
  const {
    palette,
  } = useAppAppearance();

  const insets =
    useSafeAreaInsets();

  const uid =
    auth.currentUser?.uid ??
    '';

  const [course, setCourse] =
    useState('');

  const [institutionEmail, setInstitutionEmail] =
    useState('');

  const [institutionTag, setInstitutionTag] =
    useState('');

  const [courseOpen, setCourseOpen] =
    useState(false);

  const [institutionOpen, setInstitutionOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!uid) {
      return;
    }

    return listenToUserProfile(
      uid,
      profile => {
        if (!profile) {
          return;
        }

        setCourse(
          profile.course ??
            '',
        );

        setInstitutionEmail(
          profile.institutionalEmail ??
            '',
        );

        setInstitutionTag(
          profile.institutionTag ??
            '',
        );
      },
    );
  }, [uid]);

  async function saveCourse() {
    if (!uid || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateAcademicProfile(
        uid,
        {
          course:
            course
              .trim()
              .slice(0, 80),
        },
      );

      setCourseOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar o curso.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveInstitution() {
    if (!uid || saving) {
      return;
    }

    const match =
      findInstitutionForEmail(
        institutionEmail,
      );

    if (!match) {
      setError(
        'Esse domínio ainda não está na lista institucional do Elíseo.',
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      const cleanEmail =
        institutionEmail
          .trim()
          .toLowerCase();

      await updateAcademicProfile(
        uid,
        {
          institutionalEmail:
            cleanEmail,
          institutionDomain:
            match.domain,
          institutionName:
            match.institutionName,
          institutionTag:
            match.tag,
        },
      );

      setInstitutionTag(
        match.tag,
      );

      setInstitutionOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar a tag institucional.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <View
        style={[
          styles.divider,
          {
            backgroundColor:
              palette.border,
          },
        ]}
      />

      <NativePressable
        haptic
        onPress={() => {
          setError('');
          setInstitutionOpen(true);
        }}
        style={styles.row}
      >
        <View style={styles.rowInner}>
          <View
            style={[
              styles.icon,
              {
                backgroundColor:
                  palette.panel2,
              },
            ]}
          >
            <School
              size={19}
              color={colors.blue}
            />
          </View>

          <View style={styles.rowText}>
            <Text
              style={[
                styles.title,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              Tag institucional
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.description,
                {
                  color:
                    palette.muted,
                },
              ]}
            >
              {institutionTag ||
                'Adicionar e-mail institucional'}
            </Text>
          </View>

          <AtSign
            size={18}
            color={palette.faint}
          />
        </View>
      </NativePressable>

      <View
        style={[
          styles.divider,
          {
            backgroundColor:
              palette.border,
          },
        ]}
      />

      <NativePressable
        haptic
        onPress={() => {
          setError('');
          setCourseOpen(true);
        }}
        style={styles.row}
      >
        <View style={styles.rowInner}>
          <View
            style={[
              styles.icon,
              {
                backgroundColor:
                  palette.panel2,
              },
            ]}
          >
            <GraduationCap
              size={19}
              color={colors.blue}
            />
          </View>

          <View style={styles.rowText}>
            <Text
              style={[
                styles.title,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              Curso
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.description,
                {
                  color:
                    palette.muted,
                },
              ]}
            >
              {course ||
                'Adicionar curso'}
            </Text>
          </View>
        </View>
      </NativePressable>

      <Modal
        transparent
        animationType="fade"
        visible={institutionOpen}
        onRequestClose={() =>
          setInstitutionOpen(false)
        }
      >
        <View
          style={[
            styles.modalBackdrop,
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
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  palette.panel,
                borderColor:
                  palette.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Tag institucional
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        palette.muted,
                    },
                  ]}
                >
                  Nesta fase, o Elíseo valida apenas o domínio da planilha.
                </Text>
              </View>

              <NativePressable
                haptic
                onPress={() =>
                  setInstitutionOpen(false)
                }
                style={styles.close}
              >
                <View
                  style={[
                    styles.closeInner,
                    {
                      backgroundColor:
                        palette.panel2,
                    },
                  ]}
                >
                  <X
                    size={18}
                    color={palette.textSoft}
                  />
                </View>
              </NativePressable>
            </View>

            <TextInput
              value={institutionEmail}
              onChangeText={setInstitutionEmail}
              editable={!saving}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="voce@universidade.br"
              placeholderTextColor={palette.faint}
              style={[
                styles.input,
                {
                  color:
                    palette.text,
                  backgroundColor:
                    palette.panel2,
                  borderColor:
                    palette.border,
                },
              ]}
            />

            {!!error && (
              <Text style={styles.error}>
                {error}
              </Text>
            )}

            <NativePressable
              haptic
              disabled={saving}
              onPress={() => {
                void saveInstitution();
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
                      Salvar tag
                    </Text>
                  </>
                )}
              </View>
            </NativePressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={courseOpen}
        onRequestClose={() =>
          setCourseOpen(false)
        }
      >
        <View
          style={[
            styles.modalBackdrop,
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
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  palette.panel,
                borderColor:
                  palette.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Curso
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        palette.muted,
                    },
                  ]}
                >
                  Escreva como quer que o curso apareça no perfil.
                </Text>
              </View>

              <NativePressable
                haptic
                onPress={() =>
                  setCourseOpen(false)
                }
                style={styles.close}
              >
                <View
                  style={[
                    styles.closeInner,
                    {
                      backgroundColor:
                        palette.panel2,
                    },
                  ]}
                >
                  <X
                    size={18}
                    color={palette.textSoft}
                  />
                </View>
              </NativePressable>
            </View>

            <TextInput
              value={course}
              onChangeText={value =>
                setCourse(
                  value.slice(0, 80),
                )
              }
              editable={!saving}
              autoCapitalize="words"
              placeholder="Ex.: Química"
              placeholderTextColor={palette.faint}
              style={[
                styles.input,
                {
                  color:
                    palette.text,
                  backgroundColor:
                    palette.panel2,
                  borderColor:
                    palette.border,
                },
              ]}
            />

            <Text
              style={[
                styles.counter,
                {
                  color:
                    palette.faint,
                },
              ]}
            >
              {course.length}/80
            </Text>

            {!!error && (
              <Text style={styles.error}>
                {error}
              </Text>
            )}

            <NativePressable
              haptic
              disabled={saving}
              onPress={() => {
                void saveCourse();
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
                      Salvar curso
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
    divider: {
      height:
        StyleSheet.hairlineWidth,
      marginLeft: 58,
    },

    row: {
      width: '100%',
    },

    rowInner: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal:
        spacing.md,
      paddingVertical: 10,
      gap: 12,
    },

    icon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },

    title: {
      fontSize: 13,
      fontWeight: '700',
    },

    description: {
      fontSize: 11,
      lineHeight: 15,
    },

    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 18,
      backgroundColor:
        'rgba(0,0,0,0.66)',
    },

    modalCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius: 24,
      padding: 18,
      gap: 14,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    modalTitleWrap: {
      flex: 1,
      gap: 4,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
    },

    modalSubtitle: {
      fontSize: 11,
      lineHeight: 16,
    },

    close: {
      width: 36,
      height: 36,
    },

    closeInner: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    input: {
      minHeight: 48,
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius:
        radii.md,
      paddingHorizontal: 14,
      fontSize: 13,
    },

    counter: {
      marginTop: -8,
      textAlign: 'right',
      fontSize: 10,
    },

    save: {
      minHeight: 48,
    },

    saveInner: {
      minHeight: 48,
      borderRadius:
        radii.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
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
