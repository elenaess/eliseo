import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  onAuthStateChanged,
} from '@react-native-firebase/auth';

import {
  auth,
} from '../services/firebase';

import {
  AppBackground,
  listenToAppPreferences,
  setAppBackground,
} from '../services/preferences';

import {
  colors,
} from '../theme';

export type AppPalette = {
  bg: string;
  panel: string;
  panel2: string;
  panel3: string;
  text: string;
  textSoft: string;
  muted: string;
  faint: string;
  border: string;
};

type AppAppearanceContextValue = {
  background: AppBackground;
  backgroundColor: string;
  isWhite: boolean;
  loading: boolean;
  palette: AppPalette;
  setBackground: (
    background: AppBackground,
  ) => Promise<void>;
};

const darkPalette: AppPalette = {
  bg: colors.bg,
  panel: colors.panel,
  panel2: colors.panel2,
  panel3: colors.panel3,
  text: colors.text,
  textSoft: colors.textSoft,
  muted: colors.muted,
  faint: colors.faint,
  border: 'rgba(255,255,255,0.05)',
};

const whitePalette: AppPalette = {
  bg: '#FFFFFF',
  panel: '#F7F8FA',
  panel2: '#EEF1F5',
  panel3: '#E7EBF0',
  text: '#111827',
  textSoft: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  border: 'rgba(15,23,42,0.08)',
};

const AppAppearanceContext =
  createContext<
    AppAppearanceContextValue | null
  >(null);

export function AppAppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    background,
    setBackgroundState,
  ] =
    useState<AppBackground>(
      'default',
    );

  const [loading, setLoading] =
    useState(true);

  const [uid, setUid] =
    useState(
      auth.currentUser?.uid ??
        '',
    );

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      user => {
        setUid(
          user?.uid ?? '',
        );
      },
    );
  }, []);

  useEffect(() => {
    if (!uid) {
      setBackgroundState(
        'default',
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    return listenToAppPreferences(
      uid,
      preferences => {
        setBackgroundState(
          preferences.background,
        );
        setLoading(false);
      },
    );
  }, [uid]);

  const isWhite =
    background === 'white';

  const palette =
    useMemo(
      () =>
        isWhite
          ? whitePalette
          : darkPalette,
      [isWhite],
    );

  async function setBackground(
    nextBackground: AppBackground,
  ) {
    if (!uid) {
      return;
    }

    // Atualização otimista para o app mudar na hora.
    setBackgroundState(
      nextBackground,
    );

    try {
      await setAppBackground(
        uid,
        nextBackground,
      );
    } catch (error) {
      // A escuta do Firestore restaura o valor salvo caso a gravação falhe.
      throw error;
    }
  }

  const value =
    useMemo<
      AppAppearanceContextValue
    >(
      () => ({
        background,
        backgroundColor:
          palette.bg,
        isWhite,
        loading,
        palette,
        setBackground,
      }),
      [
        background,
        isWhite,
        loading,
        palette,
      ],
    );

  return (
    <AppAppearanceContext.Provider
      value={value}
    >
      {children}
    </AppAppearanceContext.Provider>
  );
}

export function useAppAppearance() {
  const context =
    useContext(
      AppAppearanceContext,
    );

  if (!context) {
    throw new Error(
      'useAppAppearance precisa estar dentro de AppAppearanceProvider.',
    );
  }

  return context;
}
