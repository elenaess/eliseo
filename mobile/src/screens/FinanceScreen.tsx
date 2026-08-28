import React, {useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Copy,
  KeyRound,
  QrCode,
  WalletCards,
} from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {NativePressable} from '../components/NativePressable';
import {ScreenHeader} from '../components/ScreenHeader';
import {colors, radii, spacing} from '../theme';
import type {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Finance'>;

export function FinanceScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(true);
  const [pixKey, setPixKey] = useState('');

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <ScreenHeader
        title="PIX"
        subtitle="Pagamentos no Elíseo"
        left={
          <NativePressable
            haptic
            onPress={() => navigation.goBack()}
            style={styles.headerAction}
          >
            <View style={styles.headerActionInner}>
              <ArrowLeft size={22} color={colors.textSoft} />
            </View>
          </NativePressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <WalletCards size={30} color={colors.blue} />
          </View>
          <Text style={styles.heroTitle}>Pagamentos PIX</Text>
          <Text style={styles.heroText}>
            Salve sua chave para receber cobranças e pagamentos pelo chat.
          </Text>
        </View>

        <View style={styles.setting}>
          <View style={styles.settingIcon}>
            <QrCode size={21} color={colors.cyan} />
          </View>

          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Receber pagamentos</Text>
            <Text style={styles.settingSubtitle}>
              Permite gerar cobranças dentro do Elíseo.
            </Text>
          </View>

          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{
              false: colors.panel3,
              true: 'rgba(66,169,255,0.5)',
            }}
            thumbColor={enabled ? colors.blue : colors.muted}
          />
        </View>

        <View style={styles.inputCard}>
          <View style={styles.inputTitleRow}>
            <KeyRound size={19} color={colors.blue} />
            <Text style={styles.inputTitle}>Sua chave PIX</Text>
          </View>

          <TextInput
            value={pixKey}
            onChangeText={setPixKey}
            placeholder="E-mail, CPF, telefone ou chave aleatória"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />

          <NativePressable haptic style={styles.save}>
            <View style={styles.saveInner}>
              <Text style={styles.saveText}>Salvar chave</Text>
            </View>
          </NativePressable>
        </View>

        <View style={styles.infoCard}>
          <Copy size={19} color={colors.muted} />
          <Text style={styles.infoText}>
            Os cartões de cobrar/pagar do app web serão ligados aqui na etapa
            de integração com Firestore e o gerador PIX existente.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerAction: {
    width: 44,
    height: 44,
  },
  headerActionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel2,
    borderRadius: 14,
  },
  content: {
    padding: spacing.md,
    gap: 9,
  },
  hero: {
    minHeight: 190,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: radii.xl,
  },
  heroIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66,169,255,0.09)',
    borderRadius: 20,
  },
  heroTitle: {
    marginTop: 13,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  heroText: {
    maxWidth: 290,
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  setting: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
  },
  settingIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel2,
    borderRadius: 13,
  },
  settingText: {
    flex: 1,
    marginLeft: 11,
  },
  settingTitle: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  settingSubtitle: {
    marginTop: 3,
    color: colors.faint,
    fontSize: 9,
  },
  inputCard: {
    padding: 15,
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
  },
  inputTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputTitle: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    height: 50,
    marginTop: 13,
    paddingHorizontal: 13,
    color: colors.text,
    backgroundColor: colors.panel2,
    borderRadius: 14,
    fontSize: 12,
  },
  save: {
    height: 46,
    marginTop: 10,
  },
  saveInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue2,
    borderRadius: 14,
  },
  saveText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
  },
  infoText: {
    flex: 1,
    color: colors.faint,
    fontSize: 10,
    lineHeight: 15,
  },
});
