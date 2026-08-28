import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  Hand,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Cast,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react-native';

import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  MediaStream,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';

import {
  addDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  Avatar,
} from '../components/Avatar';

import {
  LogoMark,
} from '../components/LogoMark';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  auth,
  getUserById,
} from '../services/firebase';

import {
  getCallCandidatesRef,
  getCallRoomRef,
  getCallSignalRef,
  joinCallParticipant,
  leaveCallParticipant,
  listenToCallParticipants,
  makeCallPairId,
  makeCallSessionId,
  makeChannelCallRoomId,
  makeDmCallRoomId,
  openCallRoom,
  touchCallParticipant,
  updateCallParticipant,
} from '../services/calls';

import type {
  EliseoCallDescriptor,
  EliseoCallParticipant,
} from '../services/calls';

import {
  notifyDmCallJoin,
} from '../services/push';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import type {
  RootStackParamList,
} from '../types/navigation';

/* =========================================================
   TYPES
   ========================================================= */

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Call'
  >;

type CallRouteParams = {
  title?: string;
  roomId?: string;

  contextType?:
    | 'dm'
    | 'server';

  conversationId?: string;

  serverId?: string;

  channelId?: string;

  startWithVideo?: boolean;
};

type CandidateData = {
  candidate: string;

  sdpMid?:
    | string
    | null;

  sdpMLineIndex?:
    | number
    | null;
};

type PeerBundle = {
  pc:
    RTCPeerConnection;

  remoteUid:
    string;

  remoteSessionId:
    string;

  audioSender:
    any |
    null;

  videoSender:
    any |
    null;

  stopSignal:
    () => void;

  stopCandidates:
    () => void;

  processedCandidates:
    Set<string>;

  queuedCandidates:
    CandidateData[];
};

type ScreenPeerBundle = {
  pc:
    RTCPeerConnection;

  remoteUid:
    string;

  remoteSessionId:
    string;

  sender:
    any |
    null;

  stopSignal:
    () => void;

  stopCandidates:
    () => void;

  processedCandidates:
    Set<string>;

  queuedCandidates:
    CandidateData[];
};

type AudioEnergyState = {
  energy: number;
  duration: number;
};

/* =========================================================
   CONFIG
   ========================================================= */

const ICE_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ],
  },
];

const VOICE_THRESHOLD =
  0.025;

const SPEAKING_HOLD_MS =
  420;

const REMOTE_AUDIO_GAIN =
  4;

const AUDIO_CONSTRAINTS: any = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/* =========================================================
   HELPERS
   ========================================================= */

function serializeDescription(
  description: any,
) {
  return {
    type:
      description.type,

    sdp:
      description.sdp ??
      '',
  };
}

function serializeCandidate(
  candidate: any,
) {
  return {
    candidate:
      candidate.candidate,

    sdpMid:
      candidate.sdpMid ??
      null,

    sdpMLineIndex:
      candidate.sdpMLineIndex ??
      null,

    usernameFragment:
      candidate.usernameFragment ??
      null,
  };
}

function formatDuration(
  totalSeconds: number,
) {
  const safe =
    Math.max(
      0,
      Math.floor(
        totalSeconds,
      ),
    );

  const hours =
    Math.floor(
      safe /
        3600,
    );

  const minutes =
    Math.floor(
      (
        safe %
        3600
      ) /
        60,
    );

  const seconds =
    safe %
    60;

  if (
    hours >
    0
  ) {
    return [
      hours,
      minutes,
      seconds,
    ]
      .map(
        value =>
          String(
            value,
          ).padStart(
            2,
            '0',
          ),
      )
      .join(':');
  }

  return [
    minutes,
    seconds,
  ]
    .map(
      value =>
        String(
          value,
        ).padStart(
          2,
          '0',
        ),
    )
    .join(':');
}

function getAccent(
  uid: string,
) {
  const accents = [
    '#4D7CFF',
    '#7357FF',
    '#42A9FF',
    '#8B5CF6',
    '#667EEA',
    '#536DFE',
  ];

  let total =
    0;

  for (
    let index = 0;
    index <
    uid.length;
    index++
  ) {
    total +=
      uid.charCodeAt(
        index,
      );
  }

  return accents[
    total %
      accents.length
  ];
}

function sameSpeakingMap(
  left:
    Record<
      string,
      boolean
    >,

  right:
    Record<
      string,
      boolean
    >,
) {
  const leftKeys =
    Object.keys(
      left,
    );

  const rightKeys =
    Object.keys(
      right,
    );

  if (
    leftKeys.length !==
    rightKeys.length
  ) {
    return false;
  }

  return leftKeys.every(
    key =>
      left[key] ===
      right[key],
  );
}

function readAudioLevel(
  report: any,

  cacheKey:
    string,

  cache:
    Map<
      string,
      AudioEnergyState
    >,
) {
  const direct =
    Number(
      report.audioLevel,
    );

  if (
    Number.isFinite(
      direct,
    ) &&
    direct >=
      0
  ) {
    return direct;
  }

  const energy =
    Number(
      report.totalAudioEnergy,
    );

  const duration =
    Number(
      report.totalSamplesDuration,
    );

  if (
    !Number.isFinite(
      energy,
    ) ||
    !Number.isFinite(
      duration,
    )
  ) {
    return 0;
  }

  const previous =
    cache.get(
      cacheKey,
    );

  cache.set(
    cacheKey,
    {
      energy,
      duration,
    },
  );

  if (
    !previous
  ) {
    return 0;
  }

  const deltaEnergy =
    energy -
    previous.energy;

  const deltaDuration =
    duration -
    previous.duration;

  if (
    deltaEnergy <=
      0 ||
    deltaDuration <=
      0
  ) {
    return 0;
  }

  return Math.sqrt(
    deltaEnergy /
      deltaDuration,
  );
}

/* =========================================================
   ANDROID PERMISSIONS
   ========================================================= */

async function requestMicrophonePermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission =
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;

  const alreadyGranted =
    await PermissionsAndroid.check(
      permission,
    );

  if (alreadyGranted) {
    return true;
  }

  const result =
    await PermissionsAndroid.request(
      permission,
      {
        title: 'Permissão de microfone',
        message:
          'O Elíseo precisa acessar o microfone para participar das chamadas.',
        buttonPositive: 'Permitir',
        buttonNegative: 'Agora não',
      },
    );

  return (
    result ===
    PermissionsAndroid.RESULTS.GRANTED
  );
}

async function requestCameraPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission =
    PermissionsAndroid.PERMISSIONS.CAMERA;

  const alreadyGranted =
    await PermissionsAndroid.check(
      permission,
    );

  if (alreadyGranted) {
    return true;
  }

  const result =
    await PermissionsAndroid.request(
      permission,
      {
        title: 'Permissão de câmera',
        message:
          'O Elíseo precisa acessar a câmera para participar de chamadas com vídeo.',
        buttonPositive: 'Permitir',
        buttonNegative: 'Agora não',
      },
    );

  return (
    result ===
    PermissionsAndroid.RESULTS.GRANTED
  );
}

/* =========================================================
   CONTROL
   ========================================================= */

function Control({
  label,
  active,
  danger,
  onPress,
  children,
}: {
  label: string;

  active?: boolean;

  danger?: boolean;

  onPress?:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <NativePressable
      haptic
      onPress={
        onPress
      }
      style={
        styles.control
      }
    >
      <View
        style={
          styles.controlInner
        }
      >
        <View
          style={[
            styles.controlIcon,

            active &&
              styles.controlIconActive,

            danger &&
              styles.controlIconDanger,
          ]}
        >
          {children}
        </View>

        <Text
          numberOfLines={
            2
          }
          style={[
            styles.controlLabel,

            danger &&
              styles.controlLabelDanger,
          ]}
        >
          {label}
        </Text>
      </View>
    </NativePressable>
  );
}

/* =========================================================
   CALL SCREEN
   ========================================================= */

export function CallScreen({
  navigation,
  route,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const routeParams =
    (
      route.params ??
      {}
    ) as CallRouteParams;

  const currentUid =
    auth.currentUser
      ?.uid ??
    '';

  const fallbackRoomIdRef =
    useRef(
      `temporary-${
        currentUid ||
        'guest'
      }-${makeCallSessionId()}`,
    );

  const call =
    useMemo<
      EliseoCallDescriptor
    >(
      () => {
        let roomId =
          routeParams.roomId;

        if (
          !roomId &&
          routeParams
            .conversationId
        ) {
          roomId =
            makeDmCallRoomId(
              routeParams
                .conversationId,
            );
        }

        if (
          !roomId &&
          routeParams
            .serverId &&
          routeParams
            .channelId
        ) {
          roomId =
            makeChannelCallRoomId(
              routeParams
                .serverId,

              routeParams
                .channelId,
            );
        }

        return {
          roomId:
            roomId ??
            fallbackRoomIdRef
              .current,

          contextType:
            routeParams
              .contextType ??
            (
              routeParams
                .conversationId
                ? 'dm'
                : 'server'
            ),

          conversationId:
            routeParams
              .conversationId,

          serverId:
            routeParams
              .serverId,

          channelId:
            routeParams
              .channelId,

          title:
            routeParams
              .title ??
            'Chamada do Elíseo',

          startWithVideo:
            routeParams
              .startWithVideo ??
            true,
        };
      },
      [
        routeParams
          .roomId,

        routeParams
          .contextType,

        routeParams
          .conversationId,

        routeParams
          .serverId,

        routeParams
          .channelId,

        routeParams
          .title,

        routeParams
          .startWithVideo,
      ],
    );

  /* =======================================================
     STATE
     ======================================================= */

  const [
    participants,
    setParticipants,
  ] =
    useState<
      EliseoCallParticipant[]
    >([]);

  const [
    remoteStreams,
    setRemoteStreams,
  ] =
    useState<
      Record<
        string,
        MediaStream
      >
    >({});

  const [
    localStream,
    setLocalStream,
  ] =
    useState<
      MediaStream |
      null
    >(null);

  const [
    remoteScreenStreams,
    setRemoteScreenStreams,
  ] =
    useState<
      Record<
        string,
        MediaStream
      >
    >({});

  const [
    localScreenStream,
    setLocalScreenStream,
  ] =
    useState<
      MediaStream |
      null
    >(null);

  const [
    screenSharing,
    setScreenSharing,
  ] =
    useState(false);

  const [
    camera,
    setCamera,
  ] =
    useState(
      call.startWithVideo ??
        false,
    );

  const [
    speaker,
    setSpeaker,
  ] =
    useState(true);

  const [
    mic,
    setMic,
  ] =
    useState(true);

  const [
    hand,
    setHand,
  ] =
    useState(false);

  const [
    speakingByUid,
    setSpeakingByUid,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});

  const [
    createdAtMs,
    setCreatedAtMs,
  ] =
    useState(
      Date.now(),
    );

  const [
    nowMs,
    setNowMs,
  ] =
    useState(
      Date.now(),
    );

  const [
    connecting,
    setConnecting,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  /* =======================================================
     REFS
     ======================================================= */

  const localStreamRef =
    useRef<
      MediaStream |
      null
    >(null);

  const peersRef =
    useRef<
      Map<
        string,
        PeerBundle
      >
    >(
      new Map(),
    );

  const localScreenStreamRef =
    useRef<
      MediaStream |
      null
    >(null);

  const screenPeersRef =
    useRef<
      Map<
        string,
        ScreenPeerBundle
      >
    >(
      new Map(),
    );

  const stoppingScreenRef =
    useRef(false);

  const participantsRef =
    useRef<
      EliseoCallParticipant[]
    >([]);

  const sessionIdRef =
    useRef('');

  const leavingRef =
    useRef(false);

  const speakerRef =
    useRef(true);

  const speakingUntilRef =
    useRef<
      Map<
        string,
        number
      >
    >(
      new Map(),
    );

  const audioEnergyRef =
    useRef<
      Map<
        string,
        AudioEnergyState
      >
    >(
      new Map(),
    );

  useEffect(() => {
    participantsRef.current =
      participants;
  }, [
    participants,
  ]);

  /* =======================================================
     CLOCK
     ======================================================= */

  useEffect(() => {
    const timer =
      setInterval(
        () => {
          setNowMs(
            Date.now(),
          );
        },
        1000,
      );

    return () => {
      clearInterval(
        timer,
      );
    };
  }, []);

  /* =======================================================
     CLOSE PEER
     ======================================================= */

  const closePeer =
    useCallback(
      (
        remoteUid:
          string,
      ) => {
        const bundle =
          peersRef.current.get(
            remoteUid,
          );

        if (
          !bundle
        ) {
          return;
        }

        bundle
          .stopSignal();

        bundle
          .stopCandidates();

        try {
          bundle.pc.ontrack =
            null;

          bundle.pc.onicecandidate =
            null;

          bundle.pc.close();
        } catch {
          // ignore
        }

        peersRef.current.delete(
          remoteUid,
        );

        speakingUntilRef
          .current
          .delete(
            remoteUid,
          );

        setRemoteStreams(
          current => {
            if (
              !current[
                remoteUid
              ]
            ) {
              return current;
            }

            const next = {
              ...current,
            };

            delete next[
              remoteUid
            ];

            return next;
          },
        );
      },
      [],
    );


  /* =======================================================
     SCREEN SHARE — MESH INDEPENDENTE
     ======================================================= */

  /*
   * ELISEO_SCREEN_MESH_V3
   *
   * Esta malha NÃO transporta microfone
   * nem câmera. Ela usa uma segunda
   * RTCPeerConnection por par, com
   * sinalização __screen.
   */

  const closeScreenPeer =
    useCallback(
      (
        remoteUid:
          string,
      ) => {
        const bundle =
          screenPeersRef
            .current
            .get(
              remoteUid,
            );

        if (!bundle) {
          return;
        }

        bundle.stopSignal();
        bundle.stopCandidates();

        try {
          bundle.pc.ontrack =
            null;

          bundle.pc.onicecandidate =
            null;

          bundle.pc.close();
        } catch {
          // ignore
        }

        screenPeersRef
          .current
          .delete(
            remoteUid,
          );

        setRemoteScreenStreams(
          current => {
            if (
              !current[
                remoteUid
              ]
            ) {
              return current;
            }

            const next = {
              ...current,
            };

            delete next[
              remoteUid
            ];

            return next;
          },
        );
      },
      [],
    );

  const ensureScreenPeer =
    useCallback(
      async (
        remote:
          EliseoCallParticipant,
      ) => {
        if (
          !currentUid ||
          !sessionIdRef.current ||
          remote.uid ===
            currentUid
        ) {
          return;
        }

        const existing =
          screenPeersRef
            .current
            .get(
              remote.uid,
            );

        if (
          existing &&
          existing
            .remoteSessionId ===
            remote.sessionId
        ) {
          return;
        }

        if (existing) {
          closeScreenPeer(
            remote.uid,
          );
        }

        const pc =
          new RTCPeerConnection(
            {
              iceServers:
                ICE_SERVERS,
            },
          );

        const initiator =
          currentUid.localeCompare(
            remote.uid,
          ) <
          0;

        const bundle:
          ScreenPeerBundle = {
          pc,

          remoteUid:
            remote.uid,

          remoteSessionId:
            remote.sessionId,

          sender:
            null,

          stopSignal:
            () => {},

          stopCandidates:
            () => {},

          processedCandidates:
            new Set(),

          queuedCandidates:
            [],
        };

        screenPeersRef
          .current
          .set(
            remote.uid,
            bundle,
          );

        const remoteScreenStream =
          new MediaStream();

        setRemoteScreenStreams(
          current => ({
            ...current,

            [remote.uid]:
              remoteScreenStream,
          }),
        );

        try {
          if (initiator) {
            const screenTransceiver =
              pc.addTransceiver(
                'video',
                {
                  direction:
                    'sendrecv',
                },
              );

            bundle.sender =
              screenTransceiver
                .sender;

            await bundle
              .sender
              .replaceTrack(
                localScreenStreamRef
                  .current
                  ?.getVideoTracks()[0] ??
                  null,
              );
          }

          pc.ontrack =
            (event: any) => {
              const track =
                event.track;

              if (
                !track ||
                track.kind !==
                  'video'
              ) {
                return;
              }

              const exists =
                remoteScreenStream
                  .getVideoTracks()
                  .some(
                    existingTrack =>
                      existingTrack.id ===
                      track.id,
                  );

              if (!exists) {
                remoteScreenStream
                  .addTrack(
                    track,
                  );
              }

              setRemoteScreenStreams(
                current => ({
                  ...current,

                  [remote.uid]:
                    remoteScreenStream,
                }),
              );
            };

          const basePairId =
            makeCallPairId(
              currentUid,

              sessionIdRef.current,

              remote.uid,

              remote.sessionId,
            );

          const pairId =
            `${basePairId}__screen`;

          const signalRef =
            getCallSignalRef(
              call.roomId,
              pairId,
            );

          const candidatesRef =
            getCallCandidatesRef(
              call.roomId,
              pairId,
            );

          async function flushScreenCandidates() {
            if (
              !pc.remoteDescription
            ) {
              return;
            }

            while (
              bundle
                .queuedCandidates
                .length >
              0
            ) {
              const candidate =
                bundle
                  .queuedCandidates
                  .shift();

              if (!candidate) {
                continue;
              }

              try {
                await pc
                  .addIceCandidate(
                    new RTCIceCandidate(
                      {
                        candidate:
                          candidate
                            .candidate,

                        sdpMid:
                          candidate
                            .sdpMid ??
                          null,

                        sdpMLineIndex:
                          candidate
                            .sdpMLineIndex ??
                          null,
                      },
                    ),
                  );
              } catch {
                // duplicado/antigo
              }
            }
          }

          bundle.stopSignal =
            onSnapshot(
              signalRef,

              async snapshot => {
                if (
                  !snapshot.exists() ||
                  pc.connectionState ===
                    'closed'
                ) {
                  return;
                }

                const data =
                  snapshot.data();

                try {
                  if (
                    !initiator &&
                    data?.offer &&
                    !pc
                      .remoteDescription
                  ) {
                    await pc
                      .setRemoteDescription(
                        data.offer,
                      );

                    const screenTransceiver =
                      pc
                        .getTransceivers()
                        .find(
                          transceiver =>
                            transceiver
                              .receiver
                              ?.track
                              ?.kind ===
                            'video',
                        );

                    if (
                      screenTransceiver
                    ) {
                      screenTransceiver.direction =
                        'sendrecv';

                      bundle.sender =
                        screenTransceiver
                          .sender;

                      await bundle
                        .sender
                        .replaceTrack(
                          localScreenStreamRef
                            .current
                            ?.getVideoTracks()[0] ??
                            null,
                        );
                    }

                    await flushScreenCandidates();

                    const answer =
                      await pc
                        .createAnswer();

                    await pc
                      .setLocalDescription(
                        answer,
                      );

                    await setDoc(
                      signalRef,

                      {
                        answer:
                          serializeDescription(
                            answer,
                          ),

                        answerFrom:
                          currentUid,

                        updatedAt:
                          serverTimestamp(),
                      },

                      {
                        merge: true,
                      },
                    );
                  }

                  if (
                    initiator &&
                    data?.answer &&
                    !pc
                      .remoteDescription
                  ) {
                    await pc
                      .setRemoteDescription(
                        data.answer,
                      );

                    await flushScreenCandidates();
                  }
                } catch (
                  caught
                ) {
                  console.warn(
                    'Falha na sinalização da tela:',
                    caught,
                  );
                }
              },
            );

          bundle.stopCandidates =
            onSnapshot(
              candidatesRef,

              snapshot => {
                snapshot
                  .docChanges()
                  .forEach(
                    change => {
                      if (
                        change.type !==
                          'added' ||
                        bundle
                          .processedCandidates
                          .has(
                            change
                              .doc.id,
                          )
                      ) {
                        return;
                      }

                      bundle
                        .processedCandidates
                        .add(
                          change
                            .doc.id,
                        );

                      const data =
                        change.doc.data();

                      if (
                        data?.from ===
                        currentUid
                      ) {
                        return;
                      }

                      const candidate =
                        data
                          ?.candidate as
                          CandidateData;

                      if (
                        !candidate
                          ?.candidate
                      ) {
                        return;
                      }

                      if (
                        pc.remoteDescription
                      ) {
                        pc.addIceCandidate(
                          new RTCIceCandidate(
                            {
                              candidate:
                                candidate
                                  .candidate,

                              sdpMid:
                                candidate
                                  .sdpMid ??
                                null,

                              sdpMLineIndex:
                                candidate
                                  .sdpMLineIndex ??
                                null,
                            },
                          ),
                        ).catch(
                          () => {},
                        );
                      } else {
                        bundle
                          .queuedCandidates
                          .push(
                            candidate,
                          );
                      }
                    },
                  );
              },
            );

          pc.onicecandidate =
            (event: any) => {
              if (
                !event.candidate
              ) {
                return;
              }

              addDoc(
                candidatesRef,

                {
                  from:
                    currentUid,

                  candidate:
                    serializeCandidate(
                      event.candidate,
                    ),

                  createdAt:
                    serverTimestamp(),
                },
              ).catch(
                caught => {
                  console.warn(
                    'Falha ao enviar ICE da tela:',
                    caught,
                  );
                },
              );
            };

          if (initiator) {
            const offer =
              await pc
                .createOffer();

            await pc
              .setLocalDescription(
                offer,
              );

            await setDoc(
              signalRef,

              {
                aUid:
                  currentUid,

                bUid:
                  remote.uid,

                media:
                  'screen',

                offer:
                  serializeDescription(
                    offer,
                  ),

                offerFrom:
                  currentUid,

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp(),
              },

              {
                merge: true,
              },
            );
          }
        } catch (
          caught
        ) {
          console.warn(
            'Falha ao criar peer de tela:',
            caught,
          );

          closeScreenPeer(
            remote.uid,
          );
        }
      },
      [
        call.roomId,
        closeScreenPeer,
        currentUid,
      ],
    );

  /* =======================================================
     ENSURE PEER
     ======================================================= */

  const ensurePeer =
    useCallback(
      async (
        remote:
          EliseoCallParticipant,
      ) => {
        if (
          !currentUid ||
          !sessionIdRef
            .current ||
          remote.uid ===
            currentUid
        ) {
          return;
        }

        const existing =
          peersRef.current.get(
            remote.uid,
          );

        if (
          existing &&
          existing
            .remoteSessionId ===
            remote.sessionId
        ) {
          return;
        }

        if (
          existing
        ) {
          closePeer(
            remote.uid,
          );
        }

        const pc =
          new RTCPeerConnection(
            {
              iceServers:
                ICE_SERVERS,
            },
          );

        /*
         * ELISEO_CALL_MESH_V2
         *
         * Em uma call multipessoa somente
         * o offerer cria os m-lines antes
         * da oferta.
         *
         * O answerer primeiro aplica a
         * oferta remota e reutiliza os
         * transceivers associados a ela.
         * Isso garante envio E recebimento
         * de audio/video em cada par do mesh.
         */
        const initiator =
          currentUid.localeCompare(
            remote.uid,
          ) <
          0;

        const bundle:
          PeerBundle = {
          pc,

          remoteUid:
            remote.uid,

          remoteSessionId:
            remote.sessionId,

          audioSender:
            null,

          videoSender:
            null,

          stopSignal:
            () => {},

          stopCandidates:
            () => {},

          processedCandidates:
            new Set(),

          queuedCandidates:
            [],
        };

        peersRef.current.set(
          remote.uid,
          bundle,
        );

        try {
          const stream =
            localStreamRef
              .current;

          const localAudio =
            stream
              ?.getAudioTracks()[0] ??
            null;

          const localVideo =
            stream
              ?.getVideoTracks()[0] ??
            null;

          if (
            initiator
          ) {
            const audioTransceiver =
              pc.addTransceiver(
                'audio',
                {
                  direction:
                    'sendrecv',
                },
              );

            const videoTransceiver =
              pc.addTransceiver(
                'video',
                {
                  direction:
                    'sendrecv',
                },
              );

            bundle.audioSender =
              audioTransceiver.sender;

            bundle.videoSender =
              videoTransceiver.sender;

            await bundle
              .audioSender
              .replaceTrack(
                localAudio,
              );

            await bundle
              .videoSender
              .replaceTrack(
                localVideo,
              );
          }

          const remoteStream =
            new MediaStream();

          setRemoteStreams(
            current => ({
              ...current,

              [remote.uid]:
                remoteStream,
            }),
          );

          /*
           * IMPORTANTE:
           * usamos ontrack em vez de
           * addEventListener para não
           * bater na tipagem do projeto.
           */
          pc.ontrack =
            (event: any) => {
              const track =
                event.track;

              if (
                !track
              ) {
                return;
              }

              const exists =
                remoteStream
                  .getTracks()
                  .some(
                    existingTrack =>
                      existingTrack.id ===
                      track.id,
                  );

              if (
                !exists
              ) {
                remoteStream.addTrack(
                  track,
                );
              }

              if (
                track.kind ===
                'audio'
              ) {
                track.enabled =
                  speakerRef.current;

                if (
                  speakerRef.current &&
                  typeof (track as any)
                    ._setVolume ===
                    'function'
                ) {
                  (track as any)
                    ._setVolume(
                      REMOTE_AUDIO_GAIN,
                    );
                }
              }

              setRemoteStreams(
                current => ({
                  ...current,

                  [remote.uid]:
                    remoteStream,
                }),
              );
            };

          const pairId =
            makeCallPairId(
              currentUid,

              sessionIdRef
                .current,

              remote.uid,

              remote.sessionId,
            );

          const signalRef =
            getCallSignalRef(
              call.roomId,
              pairId,
            );

          const candidatesRef =
            getCallCandidatesRef(
              call.roomId,
              pairId,
            );

          async function flushCandidates() {
            if (
              !pc.remoteDescription
            ) {
              return;
            }

            while (
              bundle
                .queuedCandidates
                .length >
              0
            ) {
              const candidate =
                bundle
                  .queuedCandidates
                  .shift();

              if (
                !candidate
              ) {
                continue;
              }

              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(
                    {
                      candidate:
                        candidate
                          .candidate,

                      sdpMid:
                        candidate
                          .sdpMid ??
                        null,

                      sdpMLineIndex:
                        candidate
                          .sdpMLineIndex ??
                        null,
                    },
                  ),
                );
              } catch {
                // candidate duplicado / antigo
              }
            }
          }

          bundle.stopSignal =
            onSnapshot(
              signalRef,

              async snapshot => {
                if (
                  !snapshot.exists() ||
                  pc.connectionState ===
                    'closed'
                ) {
                  return;
                }

                const data =
                  snapshot.data();

                try {
                  if (
                    !initiator &&
                    data?.offer &&
                    !pc
                      .remoteDescription
                  ) {
                    await pc
                      .setRemoteDescription(
                        data.offer,
                      );

                    /*
                     * Agora os transceivers
                     * pertencem aos m-lines
                     * efetivamente oferecidos.
                     * Anexamos mic/camera antes
                     * de createAnswer().
                     */
                    const remoteTransceivers =
                      pc.getTransceivers();

                    const audioTransceiver =
                      remoteTransceivers
                        .find(
                          transceiver =>
                            transceiver
                              .receiver
                              ?.track
                              ?.kind ===
                            'audio',
                        );

                    const videoTransceiver =
                      remoteTransceivers
                        .find(
                          transceiver =>
                            transceiver
                              .receiver
                              ?.track
                              ?.kind ===
                            'video',
                        );

                    if (
                      audioTransceiver
                    ) {
                      audioTransceiver.direction =
                        'sendrecv';

                      bundle.audioSender =
                        audioTransceiver.sender;

                      await bundle
                        .audioSender
                        .replaceTrack(
                          localStreamRef
                            .current
                            ?.getAudioTracks()[0] ??
                            null,
                        );
                    }

                    if (
                      videoTransceiver
                    ) {
                      videoTransceiver.direction =
                        'sendrecv';

                      bundle.videoSender =
                        videoTransceiver.sender;

                      await bundle
                        .videoSender
                        .replaceTrack(
                          localStreamRef
                            .current
                            ?.getVideoTracks()[0] ??
                            null,
                        );
                    }

                    await flushCandidates();

                    const answer =
                      await pc
                        .createAnswer();

                    await pc
                      .setLocalDescription(
                        answer,
                      );

                    await setDoc(
                      signalRef,

                      {
                        answer:
                          serializeDescription(
                            answer,
                          ),

                        answerFrom:
                          currentUid,

                        updatedAt:
                          serverTimestamp(),
                      },

                      {
                        merge:
                          true,
                      },
                    );
                  }

                  if (
                    initiator &&
                    data?.answer &&
                    !pc
                      .remoteDescription
                  ) {
                    await pc
                      .setRemoteDescription(
                        data.answer,
                      );

                    await flushCandidates();
                  }
                } catch (
                  caught
                ) {
                  console.warn(
                    'Falha na sinalização RTC:',
                    caught,
                  );
                }
              },
            );

          bundle.stopCandidates =
            onSnapshot(
              candidatesRef,

              snapshot => {
                snapshot
                  .docChanges()
                  .forEach(
                    change => {
                      if (
                        change.type !==
                          'added' ||
                        bundle
                          .processedCandidates
                          .has(
                            change
                              .doc.id,
                          )
                      ) {
                        return;
                      }

                      bundle
                        .processedCandidates
                        .add(
                          change
                            .doc.id,
                        );

                      const data =
                        change.doc.data();

                      if (
                        data?.from ===
                        currentUid
                      ) {
                        return;
                      }

                      const candidate =
                        data
                          ?.candidate as
                          CandidateData;

                      if (
                        !candidate
                          ?.candidate
                      ) {
                        return;
                      }

                      if (
                        pc.remoteDescription
                      ) {
                        pc.addIceCandidate(
                          new RTCIceCandidate(
                            {
                              candidate:
                                candidate
                                  .candidate,

                              sdpMid:
                                candidate
                                  .sdpMid ??
                                null,

                              sdpMLineIndex:
                                candidate
                                  .sdpMLineIndex ??
                                null,
                            },
                          ),
                        ).catch(
                          () => {},
                        );
                      } else {
                        bundle
                          .queuedCandidates
                          .push(
                            candidate,
                          );
                      }
                    },
                  );
              },
            );

          /*
           * Mesmo ajuste aqui:
           * onicecandidate, sem
           * addEventListener.
           */
          pc.onicecandidate =
            (event: any) => {
              if (
                !event.candidate
              ) {
                return;
              }

              addDoc(
                candidatesRef,

                {
                  from:
                    currentUid,

                  candidate:
                    serializeCandidate(
                      event.candidate,
                    ),

                  createdAt:
                    serverTimestamp(),
                },
              ).catch(
                caught => {
                  console.warn(
                    'Falha ao enviar ICE candidate:',
                    caught,
                  );
                },
              );
            };

          if (
            initiator
          ) {
            const offer =
              await pc
                .createOffer();

            await pc
              .setLocalDescription(
                offer,
              );

            await setDoc(
              signalRef,

              {
                aUid:
                  currentUid,

                bUid:
                  remote.uid,

                offer:
                  serializeDescription(
                    offer,
                  ),

                offerFrom:
                  currentUid,

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp(),
              },

              {
                merge:
                  true,
              },
            );
          }
        } catch (
          caught
        ) {
          console.warn(
            'Falha ao criar peer RTC:',
            caught,
          );

          closePeer(
            remote.uid,
          );
        }
      },
      [
        call.roomId,
        closePeer,
        currentUid,
      ],
    );

  /* =======================================================
     START CALL
     ======================================================= */

  useEffect(() => {
    const signedUser =
      auth.currentUser;

    if (
      !signedUser
    ) {
      setError(
        'Você precisa estar conectado para entrar na chamada.',
      );

      setConnecting(
        false,
      );

      return;
    }

    /*
     * Copiamos os valores aqui.
     * Assim o TypeScript não perde
     * o narrowing dentro da função
     * async start().
     */
    const userUid =
      signedUser.uid;

    const userDisplayName =
      signedUser.displayName ??
      '';

    const userEmail =
      signedUser.email ??
      '';

    const userPhotoURL =
      signedUser.photoURL ??
      '';

    const sessionId =
      makeCallSessionId();

    sessionIdRef.current =
      sessionId;

    leavingRef.current =
      false;

    let cancelled =
      false;

    let stopParticipants:
      (() => void) |
      null =
        null;

    let stopRoom:
      (() => void) |
      null =
        null;

    let heartbeat:
      ReturnType<
        typeof setInterval
      > |
      null =
        null;

    async function start() {
      setConnecting(
        true,
      );

      setError('');

      const stream =
        new MediaStream();

      let actualMic =
        false;

      let actualCamera =
        false;

      /* MICROFONE */

      try {
        const microphoneGranted =
          await requestMicrophonePermission();

        if (microphoneGranted) {
          const audioStream =
            await mediaDevices
              .getUserMedia({
                audio:
                  AUDIO_CONSTRAINTS,

                video:
                  false,
              });

          audioStream
            .getAudioTracks()
            .forEach(
              track => {
                stream.addTrack(
                  track,
                );
              },
            );

          actualMic =
            stream
              .getAudioTracks()
              .length >
            0;
        }
      } catch (
        caught
      ) {
        console.warn(
          'Microfone indisponível:',
          caught,
        );
      }

      /* CÂMERA */

      if (
        call.startWithVideo
      ) {
        try {
          const cameraGranted =
            await requestCameraPermission();

          if (cameraGranted) {
            const videoStream =
              await mediaDevices
                .getUserMedia({
                  audio:
                    false,

                  video: {
                    facingMode:
                      'user',
                  },
                });

            videoStream
              .getVideoTracks()
              .forEach(
                track => {
                  stream.addTrack(
                    track,
                  );
                },
              );

            actualCamera =
              stream
                .getVideoTracks()
                .length >
              0;
          }
        } catch (
          caught
        ) {
          console.warn(
            'Câmera indisponível:',
            caught,
          );
        }
      }

      if (
        cancelled
      ) {
        stream
          .getTracks()
          .forEach(
            track =>
              track.stop(),
          );

        return;
      }

      localStreamRef.current =
        stream;

      setLocalStream(
        stream,
      );

      setMic(
        actualMic,
      );

      setCamera(
        actualCamera,
      );

      try {
        const profile =
          await getUserById(
            userUid,
          );

        await openCallRoom(
          call,
          userUid,
        );

        await joinCallParticipant(
          {
            roomId:
              call.roomId,

            uid:
              userUid,

            sessionId,

            username:
              profile
                ?.username ||
              userDisplayName ||
              userEmail
                .split(
                  '@',
                )[0] ||
              'Usuário',

            avatar:
              profile
                ?.avatar ||
              userPhotoURL,

            micEnabled:
              actualMic,

            cameraEnabled:
              actualCamera,

            handRaised:
              false,
          },
        );

        /* ELISEO_PUSH_DM_CALL */
        if (
          call.contextType === 'dm' &&
          call.conversationId
        ) {
          void notifyDmCallJoin({
            conversationId:
              call.conversationId,
            roomId:
              call.roomId,
            sessionId,
          });
        }

        if (
          cancelled
        ) {
          return;
        }

        stopRoom =
          onSnapshot(
            getCallRoomRef(
              call.roomId,
            ),

            snapshot => {
              const createdAt =
                snapshot
                  .data()
                  ?.createdAt;

              if (
                createdAt
                  ?.toMillis
              ) {
                setCreatedAtMs(
                  createdAt
                    .toMillis(),
                );
              }
            },
          );

        stopParticipants =
          listenToCallParticipants(
            call.roomId,

            incoming => {
              setParticipants(
                incoming,
              );

              const remoteByUid =
                new Map<
                  string,
                  EliseoCallParticipant
                >(
                  incoming
                    .filter(
                      participant =>
                        participant.uid !==
                        userUid,
                    )
                    .map(
                      participant => [
                        participant.uid,
                        participant,
                      ],
                    ),
                );

              for (
                const remote of
                remoteByUid.values()
              ) {
                void ensurePeer(
                  remote,
                );

                void ensureScreenPeer(
                  remote,
                );
              }

              Array.from(
                peersRef.current
                  .entries(),
              ).forEach(
                ([
                  remoteUid,
                  bundle,
                ]) => {
                  const remote =
                    remoteByUid.get(
                      remoteUid,
                    );

                  if (
                    !remote ||
                    remote.sessionId !==
                      bundle
                        .remoteSessionId
                  ) {
                    closePeer(
                      remoteUid,
                    );
                  }
                },
              );


              Array.from(
                screenPeersRef.current
                  .entries(),
              ).forEach(
                ([
                  remoteUid,
                  bundle,
                ]) => {
                  const remote =
                    remoteByUid.get(
                      remoteUid,
                    );

                  if (
                    !remote ||
                    remote.sessionId !==
                      bundle
                        .remoteSessionId
                  ) {
                    closeScreenPeer(
                      remoteUid,
                    );
                  }
                },
              );

            },
          );

        heartbeat =
          setInterval(
            () => {
              void touchCallParticipant(
                call.roomId,
                userUid,
              );
            },
            15_000,
          );

        setConnecting(
          false,
        );
      } catch (
        caught
      ) {
        setConnecting(
          false,
        );

        setError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível entrar na chamada.',
        );
      }
    }

    void start();

    return () => {
      cancelled =
        true;

      stopParticipants?.();

      stopRoom?.();

      if (
        heartbeat
      ) {
        clearInterval(
          heartbeat,
        );
      }

      Array.from(
        peersRef.current
          .keys(),
      ).forEach(
        closePeer,
      );

      Array.from(
        screenPeersRef.current
          .keys(),
      ).forEach(
        closeScreenPeer,
      );

      localScreenStreamRef
        .current
        ?.getTracks()
        .forEach(
          track => {
            try {
              track.stop();
            } catch {
              // ignore
            }
          },
        );

      localScreenStreamRef.current =
        null;

      localStreamRef
        .current
        ?.getTracks()
        .forEach(
          track => {
            try {
              track.stop();
            } catch {
              // ignore
            }
          },
        );

      localStreamRef.current =
        null;

      void leaveCallParticipant(
        {
          roomId:
            call.roomId,

          uid:
            userUid,

          sessionId,
        },
      );
    };
  }, [
    call,
    closePeer,
    closeScreenPeer,
    ensurePeer,
    ensureScreenPeer,
  ]);

  /* =======================================================
     VOICE DETECTION
     ======================================================= */

  useEffect(() => {
    let busy =
      false;

    const timer =
      setInterval(
        async () => {
          if (
            busy
          ) {
            return;
          }

          busy =
            true;

          try {
            const now =
              Date.now();

            let localLevel =
              0;

            for (
              const [
                remoteUid,
                bundle,
              ] of
              peersRef.current
                .entries()
            ) {
              try {
                const stats =
                  await bundle.pc
                    .getStats();

                let remoteLevel =
                  0;

                for (
                  const [
                    reportId,
                    report,
                  ] of
                  stats.entries()
                ) {
                  const kind =
                    report.kind ??
                    report.mediaType;

                  if (
                    kind !==
                    'audio'
                  ) {
                    continue;
                  }

                  if (
                    report.type ===
                    'inbound-rtp'
                  ) {
                    remoteLevel =
                      Math.max(
                        remoteLevel,

                        readAudioLevel(
                          report,

                          `remote:${remoteUid}:${reportId}`,

                          audioEnergyRef
                            .current,
                        ),
                      );
                  }

                  if (
                    report.type ===
                    'media-source'
                  ) {
                    localLevel =
                      Math.max(
                        localLevel,

                        readAudioLevel(
                          report,

                          `local:${reportId}`,

                          audioEnergyRef
                            .current,
                        ),
                      );
                  }
                }

                const remoteParticipant =
                  participantsRef
                    .current
                    .find(
                      participant =>
                        participant.uid ===
                        remoteUid,
                    );

                if (
                  remoteParticipant
                    ?.micEnabled &&
                  remoteLevel >
                    VOICE_THRESHOLD
                ) {
                  speakingUntilRef
                    .current
                    .set(
                      remoteUid,

                      now +
                        SPEAKING_HOLD_MS,
                    );
                }
              } catch {
                // peer conectando / desconectando
              }
            }

            const localParticipant =
              participantsRef
                .current
                .find(
                  participant =>
                    participant.uid ===
                    currentUid,
                );

            if (
              localParticipant
                ?.micEnabled &&
              localLevel >
                VOICE_THRESHOLD
            ) {
              speakingUntilRef
                .current
                .set(
                  currentUid,

                  now +
                    SPEAKING_HOLD_MS,
                );
            }

            const next:
              Record<
                string,
                boolean
              > = {};

            for (
              const participant of
              participantsRef
                .current
            ) {
              const until =
                speakingUntilRef
                  .current
                  .get(
                    participant.uid,
                  ) ??
                0;

              next[
                participant.uid
              ] =
                participant
                  .micEnabled &&
                until >
                  now;
            }

            setSpeakingByUid(
              current =>
                sameSpeakingMap(
                  current,
                  next,
                )
                  ? current
                  : next,
            );
          } finally {
            busy =
              false;
          }
        },
        220,
      );

    return () => {
      clearInterval(
        timer,
      );
    };
  }, [
    currentUid,
  ]);


  /* =======================================================
     SCREEN SHARE
     ======================================================= */

  const stopScreenShare =
    useCallback(
      async (
        updatePresence =
          true,
      ) => {
        if (
          stoppingScreenRef
            .current
        ) {
          return;
        }

        stoppingScreenRef.current =
          true;

        try {
          const stream =
            localScreenStreamRef
              .current;

          localScreenStreamRef.current =
            null;

          for (
            const bundle of
            screenPeersRef.current
              .values()
          ) {
            if (
              bundle.sender
            ) {
              await bundle
                .sender
                .replaceTrack(
                  null,
                )
                .catch(
                  () => {},
                );
            }
          }

          stream
            ?.getTracks()
            .forEach(
              track => {
                try {
                  track.stop();
                } catch {
                  // ignore
                }
              },
            );

          setLocalScreenStream(
            null,
          );

          setScreenSharing(
            false,
          );

          if (
            updatePresence &&
            currentUid
          ) {
            await updateCallParticipant(
              call.roomId,

              currentUid,

              {
                screenEnabled:
                  false,
              },
            ).catch(
              () => {},
            );
          }
        } finally {
          stoppingScreenRef.current =
            false;
        }
      },
      [
        call.roomId,
        currentUid,
      ],
    );

  const toggleScreenShare =
    useCallback(
      async () => {
        if (
          !currentUid
        ) {
          return;
        }

        if (
          screenSharing
        ) {
          await stopScreenShare(
            true,
          );

          setError('');

          return;
        }

        try {
          const displayStream =
            await (
              mediaDevices as
                any
            ).getDisplayMedia(
              {
                android: {
                  createConfigForDefaultDisplay:
                    true,

                  resolutionScale:
                    0.72,
                },
              },
            );

          const screenTrack =
            displayStream
              ?.getVideoTracks?.()[0] ??
            null;

          if (
            !displayStream ||
            !screenTrack
          ) {
            throw new Error(
              'Nenhuma tela foi selecionada.',
            );
          }

          localScreenStreamRef.current =
            displayStream;

          setLocalScreenStream(
            displayStream,
          );

          setScreenSharing(
            true,
          );

          /*
           * Se o usuário parar pelo próprio
           * seletor do Android, limpamos
           * somente a malha de tela.
           */
          (
            screenTrack as
              any
          ).onended =
            () => {
              void stopScreenShare(
                true,
              );
            };

          for (
            const bundle of
            screenPeersRef.current
              .values()
          ) {
            if (
              bundle.sender
            ) {
              await bundle
                .sender
                .replaceTrack(
                  screenTrack,
                );
            }
          }

          await updateCallParticipant(
            call.roomId,

            currentUid,

            {
              screenEnabled:
                true,
            },
          );

          setError('');
        } catch (
          caught
        ) {
          setLocalScreenStream(
            null,
          );

          localScreenStreamRef.current =
            null;

          setScreenSharing(
            false,
          );

          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível iniciar a transmissão de tela.',
          );
        }
      },
      [
        call.roomId,
        currentUid,
        screenSharing,
        stopScreenShare,
      ],
    );

  /* =======================================================
     CAMERA
     ======================================================= */

  const toggleCamera =
    useCallback(
      async () => {
        if (
          !currentUid
        ) {
          return;
        }

        const stream =
          localStreamRef
            .current;

        if (
          !stream
        ) {
          return;
        }

        let videoTrack =
          stream
            .getVideoTracks()[0];

        if (
          !camera &&
          !videoTrack
        ) {
          try {
            const cameraGranted =
              await requestCameraPermission();

            if (!cameraGranted) {
              setError(
                'Permita o acesso à câmera para ligar o vídeo.',
              );

              return;
            }

            const cameraStream =
              await mediaDevices
                .getUserMedia({
                  audio:
                    false,

                  video: {
                    facingMode:
                      'user',
                  },
                });

            videoTrack =
              cameraStream
                .getVideoTracks()[0];

            if (
              !videoTrack
            ) {
              throw new Error(
                'Nenhuma câmera encontrada.',
              );
            }

            stream.addTrack(
              videoTrack,
            );

            for (
              const bundle of
              peersRef.current
                .values()
            ) {
              if (
                bundle.videoSender
              ) {
                await bundle
                  .videoSender
                  .replaceTrack(
                    videoTrack,
                  );
              }
            }

            /*
             * MediaStream é mutável. Criamos uma nova referência
             * para o React remontar o RTCView imediatamente.
             */
            const renderedStream =
              new MediaStream();

            stream
              .getTracks()
              .forEach(
                track => {
                  renderedStream
                    .addTrack(
                      track,
                    );
                },
              );

            localStreamRef.current =
              renderedStream;

            setLocalStream(
              renderedStream,
            );
          } catch (
            caught
          ) {
            setError(
              caught instanceof Error
                ? caught.message
                : 'Não foi possível ligar a câmera.',
            );

            return;
          }
        }

        const next =
          !camera;

        if (
          videoTrack
        ) {
          videoTrack.enabled =
            next;
        }

        setCamera(
          next,
        );

        setError('');

        await updateCallParticipant(
          call.roomId,

          currentUid,

          {
            cameraEnabled:
              next,
          },
        ).catch(
          () => {},
        );
      },
      [
        call.roomId,
        camera,
        currentUid,
      ],
    );

  /* =======================================================
     MIC
     ======================================================= */

  const toggleMic =
    useCallback(
      async () => {
        if (
          !currentUid
        ) {
          return;
        }

        const stream =
          localStreamRef
            .current;

        if (
          !stream
        ) {
          return;
        }

        let audioTrack =
          stream
            .getAudioTracks()[0];

        if (
          !mic &&
          !audioTrack
        ) {
          try {
            const microphoneGranted =
              await requestMicrophonePermission();

            if (!microphoneGranted) {
              setError(
                'Permita o acesso ao microfone para desmutar.',
              );

              return;
            }

            const audioStream =
              await mediaDevices
                .getUserMedia({
                  audio:
                    AUDIO_CONSTRAINTS,

                  video:
                    false,
                });

            audioTrack =
              audioStream
                .getAudioTracks()[0];

            if (
              !audioTrack
            ) {
              throw new Error(
                'Nenhum microfone encontrado.',
              );
            }

            stream.addTrack(
              audioTrack,
            );

            for (
              const bundle of
              peersRef.current
                .values()
            ) {
              if (
                bundle.audioSender
              ) {
                await bundle
                  .audioSender
                  .replaceTrack(
                    audioTrack,
                  );
              }
            }
          } catch (
            caught
          ) {
            setError(
              caught instanceof Error
                ? caught.message
                : 'Não foi possível acessar o microfone.',
            );

            return;
          }
        }

        const next =
          !mic;

        if (
          audioTrack
        ) {
          audioTrack.enabled =
            next;
        }

        setMic(
          next,
        );

        if (
          !next
        ) {
          speakingUntilRef
            .current
            .delete(
              currentUid,
            );
        }

        setError('');

        await updateCallParticipant(
          call.roomId,

          currentUid,

          {
            micEnabled:
              next,
          },
        ).catch(
          () => {},
        );
      },
      [
        call.roomId,
        currentUid,
        mic,
      ],
    );

  /* =======================================================
     AUDIO RECEIVE
     ======================================================= */

  const toggleSpeaker =
    useCallback(
      () => {
        const next =
          !speaker;

        speakerRef.current =
          next;

        setSpeaker(
          next,
        );

        Object.values(
          remoteStreams,
        ).forEach(
          stream => {
            stream
              .getAudioTracks()
              .forEach(
                track => {
                  track.enabled =
                    next;

                  if (
                    next &&
                    typeof (track as any)
                      ._setVolume ===
                      'function'
                  ) {
                    (track as any)
                      ._setVolume(
                        REMOTE_AUDIO_GAIN,
                      );
                  }
                },
              );
          },
        );
      },
      [
        remoteStreams,
        speaker,
      ],
    );

  /* =======================================================
     HAND
     ======================================================= */

  const toggleHand =
    useCallback(
      async () => {
        if (
          !currentUid
        ) {
          return;
        }

        const next =
          !hand;

        setHand(
          next,
        );

        await updateCallParticipant(
          call.roomId,

          currentUid,

          {
            handRaised:
              next,
          },
        ).catch(
          () => {},
        );
      },
      [
        call.roomId,
        currentUid,
        hand,
      ],
    );

  /* =======================================================
     LEAVE
     ======================================================= */

  const leave =
    useCallback(
      async () => {
        if (
          leavingRef.current
        ) {
          return;
        }

        leavingRef.current =
          true;

        const sessionId =
          sessionIdRef
            .current;

        if (
          currentUid &&
          sessionId
        ) {
          await leaveCallParticipant(
            {
              roomId:
                call.roomId,

              uid:
                currentUid,

              sessionId,
            },
          );
        }

        navigation.goBack();
      },
      [
        call.roomId,
        currentUid,
        navigation,
      ],
    );

  /* =======================================================
     SORT
     ======================================================= */

  const orderedParticipants =
    useMemo(
      () =>
        [
          ...participants,
        ].sort(
          (
            left,
            right,
          ) => {
            if (
              left.uid ===
              currentUid
            ) {
              return -1;
            }

            if (
              right.uid ===
              currentUid
            ) {
              return 1;
            }

            return left
              .username
              .localeCompare(
                right.username,
              );
          },
        ),
      [
        currentUid,
        participants,
      ],
    );

  const screenParticipants =
    useMemo(
      () =>
        orderedParticipants
          .filter(
            participant =>
              participant.uid ===
                currentUid
                ? screenSharing
                : participant
                    .screenEnabled ===
                  true,
          ),
      [
        currentUid,
        orderedParticipants,
        screenSharing,
      ],
    );

  const duration =
    formatDuration(
      (
        nowMs -
        createdAtMs
      ) /
        1000,
    );

  /* =======================================================
     UI
     ======================================================= */

  return (
    <View
      style={[
        styles.root,

        {
          paddingTop:
            insets.top,

          paddingBottom:
            Math.max(
              insets.bottom,
              8,
            ),
        },
      ]}
    >
      <Animated.View
        entering={
          FadeIn.duration(
            220,
          )
        }
        style={
          styles.logo
        }
      >
        <LogoMark
          size={55}
        />
      </Animated.View>

      <View
        style={
          styles.heading
        }
      >
        <View
          style={
            styles.headingText
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Sala de chamada
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {
              orderedParticipants.length
            }{' '}
            {orderedParticipants.length ===
            1
              ? 'participante'
              : 'participantes'}
            {' · '}
            {duration}
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={
              styles.callName
            }
          >
            {call.title}
          </Text>

          {!!error && (
            <Text
              numberOfLines={
                2
              }
              style={
                styles.error
              }
            >
              {error}
            </Text>
          )}
        </View>

        <View
          style={
            styles.headingActions
          }
        >
          <NativePressable
            haptic
            style={
              styles.headingAction
            }
          >
            <View
              style={
                styles.headingActionInner
              }
            >
              <UserPlus
                size={20}
                color={
                  colors.textSoft
                }
              />
            </View>
          </NativePressable>

          <NativePressable
            haptic
            style={
              styles.headingAction
            }
          >
            <View
              style={
                styles.headingActionInner
              }
            >
              <MoreHorizontal
                size={20}
                color={
                  colors.textSoft
                }
              />
            </View>
          </NativePressable>
        </View>
      </View>

      <FlatList
        data={
          orderedParticipants
        }
        keyExtractor={
          item =>
            item.uid
        }
        numColumns={2}
        showsVerticalScrollIndicator={
          false
        }
        columnWrapperStyle={
          styles.participantColumns
        }
        contentContainerStyle={
          styles.participants
        }
        ListHeaderComponent={
          screenParticipants.length >
          0 ? (
            <View
              style={
                styles.screenShareSection
              }
            >
              {screenParticipants.map(
                participant => {
                  const mine =
                    participant.uid ===
                    currentUid;

                  const stream =
                    mine
                      ? localScreenStream
                      : remoteScreenStreams[
                          participant
                            .uid
                        ];

                  const ready =
                    !!stream &&
                    stream
                      .getVideoTracks()
                      .length >
                      0;

                  return (
                    <View
                      key={
                        `screen-${participant.uid}`
                      }
                      style={
                        styles.screenShareCard
                      }
                    >
                      <View
                        style={
                          styles.screenShareStage
                        }
                      >
                        {ready &&
                        stream ? (
                          <RTCView
                            streamURL={
                              stream.toURL()
                            }
                            mirror={
                              false
                            }
                            objectFit="contain"
                            style={
                              styles.screenShareVideo
                            }
                          />
                        ) : (
                          <ActivityIndicator
                            size="small"
                            color={
                              colors.blue
                            }
                          />
                        )}
                      </View>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={
                          styles.screenShareName
                        }
                      >
                        {mine
                          ? 'Sua tela'
                          : `Tela de ${participant.username}`}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          connecting ? (
            <View
              style={
                styles.connecting
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  colors.blue
                }
              />

              <Text
                style={
                  styles.connectingText
                }
              >
                Entrando na chamada...
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.connecting
              }
            >
              <Text
                style={
                  styles.connectingText
                }
              >
                Nenhum participante na chamada.
              </Text>
            </View>
          )
        }
        renderItem={({
          item,
          index,
        }) => {
          const mine =
            item.uid ===
            currentUid;

          const itemMic =
            mine
              ? mic
              : item
                  .micEnabled;

          const itemCamera =
            mine
              ? camera
              : item
                  .cameraEnabled;

          const itemHand =
            mine
              ? hand
              : item
                  .handRaised;

          const stream =
            mine
              ? localStream
              : remoteStreams[
                  item.uid
                ];

          const hasVideo =
            !!stream &&
            itemCamera &&
            stream
              .getVideoTracks()
              .some(
                track =>
                  track.enabled,
              );

          const speaking =
            speakingByUid[
              item.uid
            ] ===
            true;

          const displayName =
            mine
              ? 'Você'
              : item.username;

          return (
            <Animated.View
              entering={
                FadeInDown
                  .duration(
                    230,
                  )
                  .delay(
                    index *
                      55,
                  )
              }
              layout={
                Layout.springify()
              }
              style={[
                styles.participantCell,

                orderedParticipants.length %
                    2 ===
                  1 &&
                  index ===
                    orderedParticipants.length -
                      1 &&
                  styles.lastParticipantCell,
              ]}
            >
              <View
                style={[
                  styles.participantCard,

                  speaking &&
                    styles.participantCardSpeaking,
                ]}
              >
                <View
                  style={
                    styles.cameraStage
                  }
                >
                  {hasVideo &&
                  stream ? (
                    <RTCView
                      key={
                        `${item.uid}-${stream
                          .getVideoTracks()[0]
                          ?.id ??
                          'video'}`
                      }
                      streamURL={
                        stream.toURL()
                      }
                      mirror={
                        mine
                      }
                      objectFit="cover"
                      zOrder={1}
                      style={
                        styles.rtcVideo
                      }
                    />
                  ) : item.avatar ? (
                    <Image
                      source={{
                        uri:
                          item.avatar,
                      }}
                      style={
                        styles.avatarImage
                      }
                    />
                  ) : (
                    <Avatar
                      name={
                        displayName
                      }
                      accent={
                        getAccent(
                          item.uid,
                        )
                      }
                      size={84}
                    />
                  )}
                </View>

                <View
                  style={
                    styles.participantChip
                  }
                >
                  {itemHand ? (
                    <>
                      <Hand
                        size={12}
                        color={
                          colors.blue
                        }
                      />

                      <Text
                        style={
                          styles.participantChipText
                        }
                      >
                        Mão levantada
                      </Text>
                    </>
                  ) : !itemMic ? (
                    <>
                      <MicOff
                        size={12}
                        color={
                          colors.textSoft
                        }
                      />

                      <Text
                        style={
                          styles.participantChipText
                        }
                      >
                        Microfone desativado
                      </Text>
                    </>
                  ) : itemCamera ? (
                    <>
                      <Video
                        size={12}
                        color={
                          colors.textSoft
                        }
                      />

                      <Text
                        style={
                          styles.participantChipText
                        }
                      >
                        Câmera ligada
                      </Text>
                    </>
                  ) : (
                    <>
                      <Mic
                        size={12}
                        color={
                          colors.textSoft
                        }
                      />

                      <Text
                        style={
                          styles.participantChipText
                        }
                      >
                        Microfone ligado
                      </Text>
                    </>
                  )}
                </View>

                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.participantName
                  }
                >
                  {displayName}
                </Text>
              </View>
            </Animated.View>
          );
        }}
      />

      <View
        style={
          styles.controlsWrap
        }
      >
        <View
          style={
            styles.controls
          }
        >
          <Control
            label="Câmera"
            active={
              camera
            }
            onPress={() => {
              void toggleCamera();
            }}
          >
            {camera ? (
              <Video
                size={21}
                color={
                  colors.text
                }
              />
            ) : (
              <VideoOff
                size={21}
                color={
                  colors.text
                }
              />
            )}
          </Control>

          <Control
            label="Áudio"
            active={
              speaker
            }
            onPress={
              toggleSpeaker
            }
          >
            {speaker ? (
              <Volume2
                size={21}
                color={
                  colors.text
                }
              />
            ) : (
              <VolumeX
                size={21}
                color={
                  colors.text
                }
              />
            )}
          </Control>

          <Control
            label={
              mic
                ? 'Mutar'
                : 'Desmutar'
            }
            active={
              !mic
            }
            onPress={() => {
              void toggleMic();
            }}
          >
            {mic ? (
              <Mic
                size={21}
                color={
                  colors.text
                }
              />
            ) : (
              <MicOff
                size={21}
                color={
                  colors.text
                }
              />
            )}
          </Control>


          <Control
            label={
              screenSharing
                ? 'Parar tela'
                : 'Tela'
            }
            active={
              screenSharing
            }
            onPress={() => {
              void toggleScreenShare();
            }}
          >
            <Cast
              size={21}
              color={
                colors.text
              }
            />
          </Control>

          <Control
            label={
              hand
                ? 'Abaixar mão'
                : 'Levantar mão'
            }
            active={
              hand
            }
            onPress={() => {
              void toggleHand();
            }}
          >
            <Hand
              size={21}
              color={
                colors.text
              }
            />
          </Control>

          <Control
            label="Sair"
            danger
            onPress={() => {
              void leave();
            }}
          >
            <PhoneOff
              size={21}
              color={
                colors.white
              }
            />
          </Control>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles =
  StyleSheet.create({
    root: {
      flex: 1,

      backgroundColor: 'transparent',
    },

    logo: {
      height: 70,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    heading: {
      minHeight: 78,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.lg,
    },

    headingText: {
      flex: 1,

      minWidth: 0,
    },

    title: {
      color:
        colors.text,

      fontSize: 20,

      fontWeight:
        '800',

      letterSpacing:
        -0.4,
    },

    subtitle: {
      marginTop: 4,

      color:
        colors.muted,

      fontSize: 10,
    },

    callName: {
      maxWidth: 220,

      marginTop: 3,

      color:
        colors.faint,

      fontSize: 9,
    },

    error: {
      maxWidth: 260,

      marginTop: 4,

      color:
        '#FF8193',

      fontSize: 8,

      lineHeight: 11,
    },

    headingActions: {
      marginLeft:
        'auto',

      flexDirection:
        'row',

      gap: 6,
    },

    headingAction: {
      width: 40,

      height: 40,
    },

    headingActionInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius: 13,
    },

    participants: {
      flexGrow: 1,

      paddingHorizontal:
        spacing.md,

      paddingTop: 8,

      paddingBottom: 116,
    },

    participantColumns: {
      gap: 9,
    },

    screenShareSection: {
      marginBottom: 10,

      gap: 10,
    },

    screenShareCard: {
      overflow:
        'hidden',

      minHeight: 230,

      backgroundColor:
        '#0B121C',

      borderRadius:
        radii.lg,
    },

    screenShareStage: {
      height: 210,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        '#05080D',
    },

    screenShareVideo: {
      ...StyleSheet.absoluteFill,
    },

    screenShareName: {
      paddingHorizontal: 11,

      paddingVertical: 9,

      color:
        colors.text,

      fontSize: 10,

      fontWeight:
        '700',
    },

    participantCell: {
      flex: 1,

      minWidth: 0,

      marginBottom: 9,
    },

    lastParticipantCell: {
      maxWidth:
        '50%',
    },

    participantCard: {
      minHeight: 235,

      overflow:
        'hidden',

      backgroundColor:
        colors.panel2,

      borderWidth: 2,

      borderColor:
        'transparent',

      borderRadius:
        radii.lg,
    },

    participantCardSpeaking: {
      borderColor:
        '#42A9FF',

      shadowColor:
        '#42A9FF',

      shadowOpacity:
        0.35,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,

        height: 0,
      },

      elevation: 4,
    },

    cameraStage: {
      flex: 1,

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#121B28',
    },

    rtcVideo: {
      ...StyleSheet.absoluteFill,

      zIndex: 5,

      elevation: 5,

      backgroundColor:
        '#0A1019',
    },

    avatarImage: {
      width: 84,

      height: 84,

      borderRadius: 42,

      backgroundColor:
        colors.panel3,
    },

    participantChip: {
      position:
        'absolute',

      left: 8,

      top: 8,

      maxWidth:
        '82%',

      minHeight: 26,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,

      paddingHorizontal: 7,

      backgroundColor:
        'rgba(7,11,18,0.76)',

      borderRadius: 9,
    },

    participantChipText: {
      flexShrink: 1,

      color:
        colors.textSoft,

      fontSize: 8,
    },

    participantName: {
      position:
        'absolute',

      left: 10,

      bottom: 9,

      maxWidth:
        '78%',

      color:
        colors.text,

      fontSize: 11,

      fontWeight:
        '700',
    },

    connecting: {
      minHeight: 250,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 10,
    },

    connectingText: {
      color:
        colors.muted,

      fontSize: 10,
    },

    controlsWrap: {
      position:
        'absolute',

      left: 10,

      right: 10,

      bottom: 8,
    },

    controls: {
      minHeight: 88,

      flexDirection:
        'row',

      alignItems:
        'stretch',

      paddingHorizontal: 3,

      paddingVertical: 7,

      backgroundColor:
        '#0E1622',

      borderRadius: 20,

      shadowColor:
        colors.black,

      shadowOpacity:
        0.35,

      shadowRadius: 18,

      shadowOffset: {
        width: 0,

        height: 10,
      },

      elevation: 18,
    },

    control: {
      flex: 1,

      minWidth: 0,
    },

    controlInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    controlIcon: {
      width: 42,

      height: 42,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel3,

      borderRadius: 13,
    },

    controlIconActive: {
      backgroundColor:
        '#1A2A3D',
    },

    controlIconDanger: {
      backgroundColor:
        colors.red,
    },

    controlLabel: {
      minHeight: 18,

      color:
        colors.muted,

      fontSize: 8,

      lineHeight: 9,

      fontWeight:
        '600',

      textAlign:
        'center',
    },

    controlLabelDanger: {
      color:
        '#FF8193',
    },
  });

