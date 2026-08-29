import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {signOut} from '@react-native-firebase/auth';
import {ArrowLeft, KeyRound, Mail} from 'lucide-react-native';

import {NativePressable} from '../components/NativePressable';
import {auth} from '../services/firebase';
import {
  requestPasswordOtp,
  resetPasswordWithOtp,
  verifyPasswordOtp,
} from '../services/authOtp';
import {colors, radii} from '../theme';
import type {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordReset'>;
type Stage = 'email' | 'code' | 'password' | 'done';

export function PasswordResetScreen({navigation, route}: Props) {
  const authenticated = route.params?.authenticated === true;
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState(authenticated ? auth.currentUser?.email ?? '' : '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function requestCode() {
    const cleanEmail = (authenticated ? auth.currentUser?.email : email)?.trim().toLowerCase() ?? '';
    if (!cleanEmail || loading || cooldown > 0) {
      if (!cleanEmail) setError('Digite seu e-mail.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await requestPasswordOtp(cleanEmail, authenticated);
      setEmail(cleanEmail);
      setCooldown(Number(result.retryAfter || 60));
      setStage('code');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6 || loading) {
      if (clean.length !== 6) setError('Digite os 6 dígitos.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await verifyPasswordOtp(email, clean, authenticated);
      setResetToken(result.resetToken);
      setEmail(result.email || email);
      setStage('password');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Código inválido.');
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    if (loading) return;
    if (password.length < 10) {
      setError('Use uma senha com pelo menos 10 caracteres.');
      return;
    }
    if (password !== passwordAgain) {
      setError('As senhas não coincidem.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await resetPasswordWithOtp(email, resetToken, password);
      if (auth.currentUser) {
        await signOut(auth);
      }
      setStage('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  }

  const action =
    stage === 'email'
      ? requestCode
      : stage === 'code'
        ? verifyCode
        : stage === 'password'
          ? savePassword
          : () => navigation.replace('Login');

  return (
    <View style={styles.root}>
      <NativePressable haptic onPress={() => navigation.goBack()} style={styles.back}>
        <View style={styles.backInner}><ArrowLeft size={20} color={colors.textSoft}/></View>
      </NativePressable>

      <View style={styles.icon}><KeyRound size={27} color={colors.blue}/></View>
      <Text style={styles.title}>
        {stage === 'done' ? 'Senha alterada' : 'Alterar senha'}
      </Text>
      <Text style={styles.description}>
        {stage === 'done'
          ? 'Sua senha foi atualizada. Entre novamente no Elíseo.'
          : stage === 'code'
            ? `Digite o código enviado para ${email}.`
            : stage === 'password'
              ? 'Escolha uma nova senha com pelo menos 10 caracteres.'
              : 'Vamos confirmar o acesso ao seu e-mail antes de alterar a senha.'}
      </Text>

      {stage === 'email' && (
        <View style={styles.inputWrap}>
          <Mail size={18} color={colors.muted}/>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!authenticated && !loading}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="seu@email.com"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
      )}

      {stage === 'code' && (
        <TextInput
          value={code}
          onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="000000"
          placeholderTextColor={colors.faint}
          style={styles.code}
          maxLength={6}
        />
      )}

      {stage === 'password' && (
        <>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Nova senha"
            placeholderTextColor={colors.faint}
            style={styles.password}
          />
          <TextInput
            value={passwordAgain}
            onChangeText={setPasswordAgain}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Repita a nova senha"
            placeholderTextColor={colors.faint}
            style={styles.password}
          />
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <NativePressable haptic disabled={loading} onPress={() => void action()} style={styles.primary}>
        <View style={styles.primaryInner}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff"/>
          ) : (
            <Text style={styles.primaryText}>
              {stage === 'email'
                ? 'Enviar código'
                : stage === 'code'
                  ? 'Confirmar código'
                  : stage === 'password'
                    ? 'Salvar nova senha'
                    : 'Voltar para o login'}
            </Text>
          )}
        </View>
      </NativePressable>

      {stage === 'code' && (
        <NativePressable
          disabled={loading || cooldown > 0}
          onPress={() => void requestCode()}
          style={styles.resend}
        >
          <View style={styles.backInner}>
            <Text style={styles.resendText}>
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
            </Text>
          </View>
        </NativePressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  back: {position: 'absolute', top: 44, left: 16, width: 44, height: 44},
  backInner: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  icon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.panel2,
  },
  title: {marginTop: 16, color: colors.text, fontSize: 24, fontWeight: '800'},
  description: {
    maxWidth: 360,
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  inputWrap: {
    width: '100%',
    maxWidth: 360,
    height: 54,
    marginTop: 24,
    paddingHorizontal: 14,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.panel2,
  },
  input: {flex: 1, color: colors.text, fontSize: 14},
  code: {
    width: 220,
    height: 62,
    marginTop: 24,
    borderRadius: radii.lg,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  password: {
    width: '100%',
    maxWidth: 360,
    height: 54,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontSize: 14,
  },
  error: {marginTop: 12, color: colors.red, fontSize: 11, textAlign: 'center'},
  primary: {width: '100%', maxWidth: 360, height: 52, marginTop: 20},
  primaryInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.blue,
  },
  primaryText: {color: '#fff', fontSize: 14, fontWeight: '800'},
  resend: {width: '100%', maxWidth: 360, height: 42, marginTop: 4},
  resendText: {color: colors.textSoft, fontSize: 11, fontWeight: '700'},
});
