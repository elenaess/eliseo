import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {signOut} from '@react-native-firebase/auth';
import {MailCheck} from 'lucide-react-native';

import {LogoMark} from '../components/LogoMark';
import {NativePressable} from '../components/NativePressable';
import {auth, ensureUserProfile} from '../services/firebase';
import {
  confirmVerificationOtp,
  requestVerificationOtp,
} from '../services/authOtp';
import {colors, radii} from '../theme';

export function VerifyEmailScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);

  const email = auth.currentUser?.email ?? '';

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(value => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    if (sending || cooldown > 0) return;
    try {
      setSending(true);
      setError('');
      const result = await requestVerificationOtp();
      if (result.alreadyVerified) {
        await auth.currentUser?.reload();
        await auth.currentUser?.getIdToken(true);
        return;
      }
      setCooldown(Number(result.retryAfter || 60));
      setMessage('Código enviado. Confira sua caixa de entrada.');
    } catch (caught) {
      const retryAfter = Number((caught as any)?.retryAfter || 0);
      if (retryAfter > 0) setCooldown(retryAfter);
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar o código.');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    void sendCode();
  }, []);

  async function confirm() {
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6 || loading) {
      if (clean.length !== 6) setError('Digite os 6 dígitos do código.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await confirmVerificationOtp(clean);
      const user = auth.currentUser;
      await user?.reload();
      await user?.getIdToken(true);
      const refreshed = auth.currentUser;
      if (refreshed?.emailVerified) {
        await ensureUserProfile(
          refreshed.uid,
          refreshed.email ?? email,
        );
      }
      setMessage('E-mail confirmado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Código inválido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LogoMark size={72}/>
      <View style={styles.icon}>
        <MailCheck size={28} color={colors.blue}/>
      </View>
      <Text style={styles.title}>Confirme seu e-mail</Text>
      <Text style={styles.description}>
        Enviamos um código de 6 dígitos para {email || 'seu e-mail'}.
      </Text>

      <TextInput
        value={code}
        onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={colors.faint}
        style={styles.code}
        editable={!loading}
        onSubmitEditing={() => void confirm()}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!message && !error && <Text style={styles.message}>{message}</Text>}

      <NativePressable haptic disabled={loading} onPress={() => void confirm()} style={styles.primary}>
        <View style={styles.primaryInner}>
          {loading ? <ActivityIndicator size="small" color="#fff"/> : <Text style={styles.primaryText}>Confirmar código</Text>}
        </View>
      </NativePressable>

      <NativePressable
        disabled={sending || cooldown > 0}
        onPress={() => void sendCode()}
        style={styles.secondary}
      >
        <View style={styles.secondaryInner}>
          <Text style={styles.secondaryText}>
            {sending
              ? 'Enviando…'
              : cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : 'Reenviar código'}
          </Text>
        </View>
      </NativePressable>

      <NativePressable onPress={() => void signOut(auth)} style={styles.logout}>
        <View style={styles.secondaryInner}>
          <Text style={styles.logoutText}>Sair desta conta</Text>
        </View>
      </NativePressable>
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
  icon: {
    width: 54,
    height: 54,
    marginTop: 22,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
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
  error: {marginTop: 12, color: colors.red, fontSize: 11, textAlign: 'center'},
  message: {marginTop: 12, color: colors.textSoft, fontSize: 11, textAlign: 'center'},
  primary: {width: '100%', maxWidth: 360, height: 52, marginTop: 20},
  primaryInner: {
    flex: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
  },
  primaryText: {color: '#fff', fontSize: 14, fontWeight: '800'},
  secondary: {width: '100%', maxWidth: 360, height: 44, marginTop: 8},
  secondaryInner: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: colors.textSoft, fontSize: 11, fontWeight: '700'},
  logout: {width: '100%', maxWidth: 360, height: 42, marginTop: 4},
  logoutText: {color: colors.faint, fontSize: 10},
});
