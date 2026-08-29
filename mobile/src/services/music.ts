// ELISEO_PATCH2_SPOTIFY_PKCE
import 'react-native-get-random-values';
import {Linking, NativeModules} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {sha256} from 'js-sha256';
import {doc, serverTimestamp, updateDoc} from '@react-native-firebase/firestore';

import {auth, db, listenToUserProfile} from './firebase';
import {SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI} from '../config/spotify';

export type MusicProvider = 'spotify' | 'youtube_music' | 'qobuz' | null;
export type MusicActivity = {
  title: string;
  artist: string;
  artworkUrl?: string;
  durationMs: number;
  positionMs: number;
  provider: Exclude<MusicProvider, null>;
  isPlaying: boolean;
  updatedAt?: any;
};

type SpotifyToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const TOKEN_SERVICE = 'eliseo.spotify.oauth';
const PKCE_VERIFIER_KEY = 'eliseo.spotify.pkce.verifier';
const PKCE_STATE_KEY = 'eliseo.spotify.pkce.state';
let syncStop: null | (() => void) = null;

function base64Url(bytes: number[]) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63];
    out += chars[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[triple & 63] : '=';
  }
  return out.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function randomVerifier(byteLength = 48) {
  const bytes = new Uint8Array(byteLength);
  (globalThis as any).crypto.getRandomValues(bytes);
  return base64Url(Array.from(bytes));
}

function millis(value: any) {
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function isRecentMusicActivity(activity?: MusicActivity | null, maxAgeMs = 120000) {
  if (!activity?.title || !activity.provider) return false;
  const updated = millis(activity.updatedAt);
  return updated > 0 && Date.now() - updated <= maxAgeMs;
}

export async function setMusicProvider(uid: string, provider: MusicProvider) {
  await updateDoc(doc(db, 'users', uid), {
    musicProvider: provider,
    musicActivity: null,
    updatedAt: serverTimestamp(),
  });
}

export async function publishMusicActivity(uid: string, activity: Omit<MusicActivity, 'updatedAt'> | null) {
  await updateDoc(doc(db, 'users', uid), {
    musicActivity: activity ? {...activity, updatedAt: serverTimestamp()} : null,
  });
}

async function saveSpotifyToken(token: SpotifyToken) {
  await Keychain.setGenericPassword('spotify', JSON.stringify(token), {service: TOKEN_SERVICE});
}

async function readSpotifyToken(): Promise<SpotifyToken | null> {
  const credentials = await Keychain.getGenericPassword({service: TOKEN_SERVICE});
  if (!credentials) return null;
  try { return JSON.parse(credentials.password) as SpotifyToken; } catch { return null; }
}

export async function disconnectSpotify() {
  await Keychain.resetGenericPassword({service: TOKEN_SERVICE});
}

export function spotifyConfigured() {
  return /^[a-zA-Z0-9]{20,}$/.test(SPOTIFY_CLIENT_ID);
}

export async function beginSpotifyAuthorization() {
  if (!spotifyConfigured()) throw new Error('O Client ID do Spotify ainda não foi configurado no Elíseo.');
  const verifier = randomVerifier();
  const state = randomVerifier(18);
  const challenge = base64Url(sha256.array(verifier));
  await Promise.all([
    AsyncStorage.setItem(PKCE_VERIFIER_KEY, verifier),
    AsyncStorage.setItem(PKCE_STATE_KEY, state),
  ]);
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: 'user-read-currently-playing user-read-playback-state',
  });
  await Linking.openURL(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

export async function handleSpotifyCallback(url: string) {
  if (!url.startsWith(SPOTIFY_REDIRECT_URI)) return false;
  const query = url.split('?')[1] || '';
  const params = new URLSearchParams(query);
  const code = params.get('code');
  const returnedState = params.get('state');
  const [verifier, expectedState] = await Promise.all([
    AsyncStorage.getItem(PKCE_VERIFIER_KEY),
    AsyncStorage.getItem(PKCE_STATE_KEY),
  ]);
  if (!code || !verifier || !returnedState || returnedState !== expectedState) {
    throw new Error('Retorno de autenticação do Spotify inválido.');
  }
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_verifier: verifier,
  });
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: body.toString(),
  });
  if (!response.ok) throw new Error('O Spotify recusou a troca do código de autenticação.');
  const json = await response.json();
  await saveSpotifyToken({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 - 30000,
  });
  await Promise.all([
    AsyncStorage.removeItem(PKCE_VERIFIER_KEY),
    AsyncStorage.removeItem(PKCE_STATE_KEY),
  ]);
  return true;
}

async function spotifyAccessToken() {
  let token = await readSpotifyToken();
  if (!token) return null;
  if (token.expiresAt > Date.now()) return token.accessToken;
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: token.refreshToken,
  });
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: body.toString(),
  });
  if (!response.ok) return null;
  const json = await response.json();
  token = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || token.refreshToken,
    expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 - 30000,
  };
  await saveSpotifyToken(token);
  return token.accessToken;
}

export async function getSpotifyNowPlaying(): Promise<Omit<MusicActivity, 'updatedAt'> | null> {
  const token = await spotifyAccessToken();
  if (!token) return null;
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {headers: {Authorization: `Bearer ${token}`}});
  if (response.status === 204) return null;
  if (!response.ok) return null;
  const json = await response.json();
  const item = json?.item;
  if (!item?.name) return null;
  return {
    title: item.name,
    artist: Array.isArray(item.artists) ? item.artists.map((a: any) => a?.name).filter(Boolean).join(', ') : '',
    artworkUrl: item.album?.images?.[0]?.url || '',
    durationMs: Number(item.duration_ms || 0),
    positionMs: Number(json.progress_ms || 0),
    provider: 'spotify',
    isPlaying: !!json.is_playing,
  };
}

const mediaModule = NativeModules.EliseoMediaSession;
export function hasLocalMusicAccess(): Promise<boolean> {
  return mediaModule?.hasAccess ? mediaModule.hasAccess() : Promise.resolve(false);
}
export function openLocalMusicAccessSettings(): Promise<void> {
  return mediaModule?.openAccessSettings ? mediaModule.openAccessSettings() : Promise.resolve();
}
export async function getLocalNowPlaying(provider: 'youtube_music'|'qobuz'): Promise<Omit<MusicActivity, 'updatedAt'> | null> {
  if (!mediaModule?.getNowPlaying) return null;
  const data = await mediaModule.getNowPlaying(provider);
  if (!data?.title) return null;
  return {
    title: String(data.title),
    artist: String(data.artist || ''),
    artworkUrl: data.artworkUrl ? String(data.artworkUrl) : '',
    durationMs: Number(data.durationMs || 0),
    positionMs: Number(data.positionMs || 0),
    provider,
    isPlaying: !!data.isPlaying,
  };
}

export function stopMusicPresenceSync() {
  syncStop?.();
  syncStop = null;
}

export function startMusicPresenceSync(uid: string) {
  stopMusicPresenceSync();
  let provider: MusicProvider = null;
  let disposed = false;
  let lastSignature = '';
  const stopProfile = listenToUserProfile(uid, profile => {
    provider = profile?.musicProvider ?? null;
  });

  async function tick() {
    if (disposed || !provider) return;
    try {
      const activity = provider === 'spotify'
        ? await getSpotifyNowPlaying()
        : await getLocalNowPlaying(provider);
      const signature = activity ? JSON.stringify([activity.provider, activity.title, activity.artist, Math.floor(activity.positionMs / 10000), activity.isPlaying]) : 'none';
      if (signature !== lastSignature) {
        lastSignature = signature;
        await publishMusicActivity(uid, activity);
      }
    } catch {
      // Atividade social não pode derrubar o app.
    }
  }

  const interval = setInterval(() => void tick(), 10000);
  void tick();
  syncStop = () => {
    disposed = true;
    clearInterval(interval);
    stopProfile();
  };
  return syncStop;
}
