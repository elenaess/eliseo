import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { listenToExtendedProfile } from "./profileService";

export type MusicProvider = "spotify" | "youtube_music" | "qobuz" | null;

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

const SPOTIFY_CLIENT_ID = "6297e947a38343acbe1913be52df2d21";
const TOKEN_KEY = "eliseo.spotify.web.token";
const VERIFIER_KEY = "eliseo.spotify.web.pkce.verifier";
const STATE_KEY = "eliseo.spotify.web.pkce.state";
let syncStop: null | (() => void) = null;

function redirectUri() {
  const base = `${window.location.origin}${window.location.pathname}`;
  return base.endsWith("/") ? base : `${base}/`;
}

function randomVerifier(byteLength = 48) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function readToken(): SpotifyToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as SpotifyToken) : null;
  } catch {
    return null;
  }
}

function saveToken(token: SpotifyToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export async function setMusicProvider(uid: string, provider: MusicProvider) {
  await updateDoc(doc(db, "users", uid), {
    musicProvider: provider,
    musicActivity: null,
    updatedAt: serverTimestamp(),
  });
}

export async function publishMusicActivity(
  uid: string,
  activity: Omit<MusicActivity, "updatedAt"> | null,
) {
  await updateDoc(doc(db, "users", uid), {
    musicActivity: activity ? {...activity, updatedAt: serverTimestamp()} : null,
  });
}

export async function beginSpotifyAuthorization() {
  const verifier = randomVerifier();
  const state = randomVerifier(18);
  const challenge = await codeChallenge(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: "user-read-currently-playing user-read-playback-state",
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

export async function handleSpotifyCallbackFromLocation(uid: string) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const returnedState = params.get("state");
  const verifier = localStorage.getItem(VERIFIER_KEY);
  const expectedState = localStorage.getItem(STATE_KEY);
  if (!code && !params.get("error")) return false;
  if (!code || !verifier || !returnedState || returnedState !== expectedState) {
    throw new Error("Retorno de autenticação do Spotify inválido.");
  }
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error("O Spotify recusou a troca do código de autenticação. Confira a Redirect URI no painel do Spotify.");
  }
  const json = await response.json();
  saveToken({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 - 30000,
  });
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  await setMusicProvider(uid, "spotify");
  const clean = new URL(window.location.href);
  clean.searchParams.delete("code");
  clean.searchParams.delete("state");
  clean.searchParams.delete("error");
  window.history.replaceState({}, "", clean.toString());
  return true;
}

async function spotifyAccessToken() {
  let token = readToken();
  if (!token) return null;
  if (token.expiresAt > Date.now()) return token.accessToken;
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: body.toString(),
  });
  if (!response.ok) return null;
  const json = await response.json();
  token = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || token.refreshToken,
    expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 - 30000,
  };
  saveToken(token);
  return token.accessToken;
}

export async function getSpotifyNowPlaying(): Promise<Omit<MusicActivity, "updatedAt"> | null> {
  const token = await spotifyAccessToken();
  if (!token) return null;
  let response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {Authorization: `Bearer ${token}`},
  });
  if (response.status === 204) {
    response = await fetch("https://api.spotify.com/v1/me/player", {
      headers: {Authorization: `Bearer ${token}`},
    });
  }
  if (response.status === 204 || !response.ok) return null;
  const json = await response.json();
  const item = json?.item;
  if (!item?.name) return null;
  return {
    title: item.name,
    artist: Array.isArray(item.artists)
      ? item.artists.map((artist: any) => artist?.name).filter(Boolean).join(", ")
      : "",
    artworkUrl: item.album?.images?.[0]?.url || "",
    durationMs: Number(item.duration_ms || 0),
    positionMs: Number(json.progress_ms || 0),
    provider: "spotify",
    isPlaying: !!json.is_playing,
  };
}

export async function disconnectSpotify(uid: string) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  await setMusicProvider(uid, null);
}

export function spotifyWebConnected() {
  return !!readToken();
}

export function spotifyRedirectUri() {
  return redirectUri();
}

export function stopWebMusicPresenceSync() {
  syncStop?.();
  syncStop = null;
}

export function startWebMusicPresenceSync(uid: string) {
  stopWebMusicPresenceSync();
  let provider: MusicProvider = null;
  let disposed = false;
  let lastSignature = "";
  const stopProfile = listenToExtendedProfile(uid, (profile) => {
    provider = profile?.musicProvider ?? null;
  });

  async function tick() {
    if (disposed || provider !== "spotify") return;
    try {
      const activity = await getSpotifyNowPlaying();
      const signature = activity
        ? JSON.stringify([
            activity.provider,
            activity.title,
            activity.artist,
            Math.floor(activity.positionMs / 10000),
            activity.isPlaying,
          ])
        : "none";
      if (signature === lastSignature) return;
      lastSignature = signature;
      await publishMusicActivity(uid, activity);
    } catch {
      // Presence is best-effort and must never break the desktop app.
    }
  }

  const interval = window.setInterval(() => void tick(), 10000);
  void tick();
  syncStop = () => {
    disposed = true;
    window.clearInterval(interval);
    stopProfile();
  };
  return syncStop;
}
