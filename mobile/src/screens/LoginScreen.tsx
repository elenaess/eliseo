import React, {
  useState,
} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  } from 'lucide-react-native';

import Animated,
  {
  FadeIn,
  FadeInDown,
  } from 'react-native-reanimated';

import {
  useSafeAreaInsets,
  } from 'react-native-safe-area-context';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';

import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';

import {LogoMark} from '../components/LogoMark';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  auth,
  ensureUserProfile,
} from '../services/firebase';

import {
  colors,
  radii,
  spacing,
} from '../theme';

GoogleSignin.configure({
  webClientId: '205610214409-vkrq5fom050gku61rckthdhi3v2k3v5d.apps.googleusercontent.com',
});

export function LoginScreen() {
  const insets =
    useSafeAreaInsets();

  const [
    register,
    setRegister,
  ] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  function translateError(
    code: string,
  ) {
    if (
      code.includes(
        'invalid-email',
      )
    ) {
      return 'Digite um e-mail válido.';
    }

    if (
      code.includes(
        'email-already-in-use',
      )
    ) {
      return 'Esse e-mail já possui uma conta.';
    }

    if (
      code.includes(
        'weak-password',
      )
    ) {
      return 'Use uma senha com pelo menos 6 caracteres.';
    }

    if (
      code.includes(
        'invalid-credential',
      ) ||
      code.includes(
        'wrong-password',
      ) ||
      code.includes(
        'user-not-found',
      )
    ) {
      return 'E-mail ou senha incorretos.';
    }

    if (
      code.includes(
        'too-many-requests',
      )
    ) {
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    }

    if (
      code.includes(
        'network-request-failed',
      )
    ) {
      return 'Não foi possível conectar. Verifique sua internet.';
    }

    return register
      ? 'Não foi possível criar sua conta.'
      : 'Não foi possível entrar no Elíseo.';
  }

  async function submit() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        'Preencha o e-mail e a senha.',
      );

      return;
    }

    try {
      setLoading(true);

      setError('');

      if (register) {
        const credential =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password,
          );

        await ensureUserProfile(
          credential.user.uid,
          credential.user.email ??
            cleanEmail,
        );
      } else {
        const credential =
          await signInWithEmailAndPassword(
            auth,
            cleanEmail,
            password,
          );

        await ensureUserProfile(
          credential.user.uid,
          credential.user.email ??
            cleanEmail,
        );
      }

      /*
       * NÃO precisa navegar.
       *
       * RootNavigator detecta
       * automaticamente o login
       * através do Firebase Auth.
       */
    } catch (caught) {
      const firebaseError =
        caught as {
          code?: string;
        };

      setError(
        translateError(
          firebaseError.code ??
            '',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    try {
      setLoading(true);
      setError('');

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog:
          true,
      });

      const result =
        await GoogleSignin.signIn();

      const idToken =
        (result as any)?.data
          ?.idToken ??
        (result as any)?.idToken ??
        null;

      if (!idToken) {
        throw new Error(
          'O Google não retornou o token de autenticação.',
        );
      }

      const googleCredential =
        GoogleAuthProvider
          .credential(
            idToken,
          );

      const credential =
        await signInWithCredential(
          auth,
          googleCredential,
        );

      await ensureUserProfile(
        credential.user.uid,
        credential.user.email ??
          '',
      );
    } catch (caught) {
      const code =
        (caught as {
          code?: string;
        })?.code ?? '';

      if (
        code.includes(
          'SIGN_IN_CANCELLED',
        ) ||
        code.includes(
          '12501',
        )
      ) {
        return;
      }

      if (
        code.includes(
          'DEVELOPER_ERROR',
        ) ||
        code === '10'
      ) {
        setError(
          'Login Google não configurado para este APK. Verifique o SHA-1 no Firebase.',
        );

        return;
      }

      setError(
        caught instanceof Error &&
        caught.message
          ? caught.message
          : 'Não foi possível entrar com Google.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[
        '#07101B',
        '#0A1424',
        '#08111D',
      ]}
      start={{
        x: 0,
        y: 0,
      }}
      end={{
        x: 1,
        y: 1,
      }}
      style={styles.root}
    >
      <View
        style={
          styles.glowOne
        }
      />

      <View
        style={
          styles.glowTwo
        }
      />

      <KeyboardAvoidingView
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
        style={[
          styles.keyboard,
          {
            paddingTop:
              insets.top,

            paddingBottom:
              insets.bottom,
          },
        ]}
      >
        <Animated.View
          entering={
            FadeIn.duration(
              160,
            )
          }
          style={styles.brand}
        >
          <LogoMark
            size={82}
          />

          <Text
            style={
              styles.brandName
            }
          >
            Elíseo
          </Text>

          <Text
            style={
              styles.brandTag
            }
          >
            Se integre ao espaço.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown
            .duration(180)
            .delay(30)}
          style={styles.form}
        >
          <Text
            style={
              styles.label
            }
          >
            E-mail
          </Text>

          <View
            style={
              styles.inputWrap
            }
          >
            <Mail
              size={20}
              color={
                colors.muted
              }
            />

            <TextInput
              value={email}
              onChangeText={
                setEmail
              }
              style={
                styles.input
              }
              placeholder="Digite seu e-mail"
              placeholderTextColor={
                colors.faint
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={
                false
              }
              autoComplete="email"
              editable={
                !loading
              }
              onSubmitEditing={
                submit
              }
            />
          </View>

          <Text
            style={[
              styles.label,
              styles.passwordLabel,
            ]}
          >
            Senha
          </Text>

          <View
            style={
              styles.inputWrap
            }
          >
            <LockKeyhole
              size={20}
              color={
                colors.muted
              }
            />

            <TextInput
              value={
                password
              }
              onChangeText={
                setPassword
              }
              style={
                styles.input
              }
              placeholder="Digite sua senha"
              placeholderTextColor={
                colors.faint
              }
              secureTextEntry={
                !showPassword
              }
              autoCapitalize="none"
              autoCorrect={
                false
              }
              editable={
                !loading
              }
              onSubmitEditing={
                submit
              }
            />

            <NativePressable
              disabled={
                loading
              }
              onPress={() =>
                setShowPassword(
                  value =>
                    !value,
                )
              }
              style={
                styles.eye
              }
            >
              <View
                style={
                  styles.eyeInner
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={19}
                    color={
                      colors.muted
                    }
                  />
                ) : (
                  <Eye
                    size={19}
                    color={
                      colors.muted
                    }
                  />
                )}
              </View>
            </NativePressable>
          </View>

          {!!error && (
            <Text
              style={
                styles.error
              }
            >
              {error}
            </Text>
          )}

          <NativePressable
            haptic
            disabled={
              loading
            }
            onPress={
              submit
            }
            style={
              styles.primaryButton
            }
          >
            <LinearGradient
              colors={[
                '#4B83FF',
                '#714EFF',
              ]}
              start={{
                x: 0,
                y: 0.5,
              }}
              end={{
                x: 1,
                y: 0.5,
              }}
              style={
                styles.primaryInner
              }
            >
              <Text
                style={
                  styles.primaryText
                }
              >
                {loading
                  ? 'Aguarde...'
                  : register
                    ? 'Criar conta'
                    : 'Entrar'}
              </Text>
            </LinearGradient>
          </NativePressable>

          <Text
            style={styles.or}
          >
            ou continue com
          </Text>

          <View
            style={
              styles.socialRow
            }
          >
            <NativePressable
              haptic
              disabled={
                loading
              }
              onPress={() => {
                void googleLogin();
              }}
              style={
                styles.social
              }
            >
              {/* ELISEO_GOOGLE_BADGE_V2 */}
              <View style={styles.googleLogoBadge}>
                <Image
                  source={require('../assets/google-g.png')}
                  resizeMode="contain"
                  style={styles.googleLogoMark}
                />
              </View>
            </NativePressable>
          </View>

          <NativePressable
            disabled={
              loading
            }
            onPress={() => {
              setRegister(
                value =>
                  !value,
              );

              setError('');
            }}
            style={
              styles.switch
            }
          >
            <View
              style={
                styles.switchInner
              }
            >
              <Text
                style={
                  styles.switchText
                }
              >
                {register
                  ? 'Já possui uma conta? Entrar'
                  : 'Ainda não possui conta? Criar conta'}
              </Text>
            </View>
          </NativePressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
      overflow: 'hidden',
    },

    keyboard: {
      flex: 1,

      justifyContent:
        'center',

      paddingHorizontal:
        26,
    },

    glowOne: {
      position:
        'absolute',

      width: 320,
      height: 320,

      left: -190,
      top: 80,

      borderRadius:
        160,

      backgroundColor:
        'rgba(45,119,255,0.16)',
    },

    glowTwo: {
      position:
        'absolute',

      width: 360,
      height: 360,

      right: -210,
      bottom: 30,

      borderRadius:
        180,

      backgroundColor:
        'rgba(101,75,255,0.13)',
    },

    brand: {
      alignItems:
        'center',

      marginBottom:
        32,
    },

    brandName: {
      marginTop: 6,

      color:
        colors.text,

      fontSize: 35,

      fontWeight:
        '300',

      letterSpacing:
        -0.8,
    },

    brandTag: {
      marginTop: 4,

      color:
        colors.muted,

      fontSize: 13,
    },

    form: {
      width:
        '100%',

      maxWidth:
        470,

      alignSelf:
        'center',
    },

    label: {
      marginBottom:
        8,

      color:
        colors.textSoft,

      fontSize:
        12,

      fontWeight:
        '600',
    },

    passwordLabel: {
      marginTop:
        spacing.lg,
    },

    inputWrap: {
      height: 54,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 12,

      paddingLeft:
        16,

      backgroundColor:
        'rgba(16,25,39,0.92)',

      borderRadius:
        radii.md,
    },

    input: {
      flex: 1,

      color:
        colors.text,

      fontSize:
        15,

      paddingVertical:
        0,
    },

    eye: {
      width: 50,
      height: 54,
    },

    eyeInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    error: {
      marginTop:
        12,

      color:
        '#FF8798',

      fontSize:
        11,

      lineHeight:
        16,
    },

    primaryButton: {
      height: 54,

      marginTop:
        22,

      borderRadius:
        radii.md,

      overflow:
        'hidden',
    },

    primaryInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        radii.md,
    },

    primaryText: {
      color:
        colors.white,

      fontSize:
        15,

      fontWeight:
        '700',
    },

    or: {
      marginVertical:
        18,

      color:
        colors.faint,

      textAlign:
        'center',

      fontSize:
        11,
    },

    socialRow: {
      flexDirection:
        'row',

      justifyContent:
        'center',

      gap: 14,
    },

    social: {
      width: 54,
      height: 54,
    },

    socialInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius:
        16,
    },

    google: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F2F4F8',

      borderRadius:
        16,
    },

    googleText: {
      color:
        '#4285F4',

      fontSize:
        22,

      fontWeight:
        '900',
    },

    githubText: {
      color:
        colors.text,

      fontSize:
        16,

      fontWeight:
        '700',
    },

    switch: {
      height: 42,

      marginTop:
        14,
    },

    switchInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    switchText: {
      color:
        colors.muted,

      fontSize:
        11,
    },

    googleLogoBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(11,18,28,0.24)',
    },

    googleLogoMark: {
      width: 25,
      height: 25,
    },
});