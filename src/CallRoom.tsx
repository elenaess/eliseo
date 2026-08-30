import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  User as FirebaseUser,
} from "firebase/auth";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import {
  ChevronDown,
  Hand,
  Mic,
  MicOff,
  MoreHorizontal,
  MonitorUp,
  PhoneOff,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  db,
} from "./firebase";

import type {
  EliseoUser,
} from "./firestore";

import "./CallRoom.css";


export type EliseoCallDescriptor = {
  roomId: string;
  contextType:
    | "dm"
    | "server";
  conversationId?: string;
  serverId?: string;
  title: string;
  returnPage:
    | "messages"
    | "community";
  startWithVideo: boolean;
};


type CallParticipant = {
  uid: string;
  sessionId: string;
  username: string;
  avatar?: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  handRaised: boolean;
  screenSharing?: boolean;
  joinedAt?: any;
  updatedAt?: any;
};


type PeerBundle = {
  pc: RTCPeerConnection;
  remoteUid: string;
  remoteSessionId: string;
  audioSender: RTCRtpSender;
  videoSender: RTCRtpSender;
  stopSignal: Unsubscribe;
  stopCandidates: Unsubscribe;
  processedCandidates:
    Set<string>;
  queuedCandidates:
    RTCIceCandidateInit[];
};

type ScreenPeerBundle = {
  pc: RTCPeerConnection;
  remoteUid: string;
  remoteSessionId: string;
  sender: RTCRtpSender | null;
  stopSignal: Unsubscribe;
  stopCandidates: Unsubscribe;
  processedCandidates: Set<string>;
  queuedCandidates: RTCIceCandidateInit[];
};


const ICE_SERVERS:
  RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ];


/* =========================================================
   ÁUDIO — PROCESSAMENTO AUTOMÁTICO DE VOZ

   Sempre que o microfone é aberto/reaberto, pedimos ao
   navegador:
   - supressão de ruído;
   - cancelamento de eco;
   - ganho automático.

   Usamos "ideal" para não impedir a chamada caso algum
   dispositivo/navegador não implemente uma dessas opções.
   ========================================================= */

function getAutomaticVoiceConstraints():
  MediaTrackConstraints {

  const supported =
    navigator.mediaDevices
      ?.getSupportedConstraints?.() ||
    {};

  const constraints:
    MediaTrackConstraints = {};

  /*
   * Mantemos a supressão de ruído e o cancelamento de eco,
   * mas desligamos o ganho automático. Em alguns microfones,
   * o AGC "respira" demais e acaba engolindo começo/fim de
   * palavras, dando a sensação de áudio cortado.
   */
  if (
    supported.noiseSuppression
  ) {
    constraints.noiseSuppression = {
      ideal: true,
    };
  }

  if (
    supported.echoCancellation
  ) {
    constraints.echoCancellation = {
      ideal: true,
    };
  }

  if (
    supported.autoGainControl
  ) {
    constraints.autoGainControl = {
      ideal: false,
    };
  }

  /*
   * O Opus do WebRTC trabalha muito bem em 48 kHz.
   * Pedimos 48 kHz / 16-bit quando o navegador permite.
   */
  if (
    supported.sampleRate
  ) {
    constraints.sampleRate = {
      ideal: 48000,
    };
  }

  if (
    supported.sampleSize
  ) {
    constraints.sampleSize = {
      ideal: 16,
    };
  }

  /*
   * Para voz, mono evita desperdiçar banda e deixa mais
   * margem para estabilidade do áudio.
   */
  if (
    supported.channelCount
  ) {
    constraints.channelCount = {
      ideal: 1,
    };
  }

  return constraints;
}


function prepareVoiceTrack(
  track:
    MediaStreamTrack | null
) {
  if (!track) {
    return;
  }

  /*
   * "speech" ajuda o navegador a tratar o sinal como voz,
   * em vez de áudio musical/ambiente.
   */
  try {
    track.contentHint =
      "speech";
  } catch {
    // Alguns navegadores não implementam contentHint.
  }
}


/*
 * Ajustes do Opus para reduzir "picotes":
 *
 * - usedtx=0:
 *   desliga DTX (silêncio descontínuo), evitando que o codec
 *   corte trechos muito baixos da fala.
 *
 * - useinbandfec=1:
 *   ativa FEC do Opus, que ajuda a reconstruir áudio quando
 *   pequenos pacotes são perdidos.
 *
 * - maxaveragebitrate=128000:
 *   dá bastante margem para voz limpa sem exigir banda alta.
 */
function optimizeOpusSdp(
  sdp: string
) {
  const opusMatch =
    sdp.match(
      /a=rtpmap:(\d+)\s+opus\/48000\/2/i
    );

  if (!opusMatch) {
    return sdp;
  }

  const payload =
    opusMatch[1];

  const fmtpRegex =
    new RegExp(
      `a=fmtp:${payload}([^\\r\\n]*)`,
      "i"
    );

  const wanted = [
    "minptime=10",
    "useinbandfec=1",
    "usedtx=0",
    "cbr=1",
    "maxaveragebitrate=64000",
    "maxplaybackrate=48000",
    "sprop-maxcapturerate=48000",
  ];

  if (
    fmtpRegex.test(sdp)
  ) {
    const updated =
      sdp.replace(
      fmtpRegex,
      (
  _whole,
  rest: string
) => {
        const existing =
          rest
            .replace(
              /^\s+/,
              ""
            )
            .split(";")
            .map(
              (item) =>
                item.trim()
            )
            .filter(Boolean)
            .filter(
              (item) =>
                !wanted.some(
                  (setting) =>
                    item
                      .toLowerCase()
                      .startsWith(
                        setting
                          .split("=")[0]
                          .toLowerCase() +
                        "="
                      )
                )
            );

        return (
          `a=fmtp:${payload} ` +
          [
            ...existing,
            ...wanted,
          ].join(";")
        );
      }
    );

    return addStableAudioPacketTime(
      updated
    );
  }

  const withFmtp =
    sdp.replace(
      opusMatch[0],
      `${opusMatch[0]}\r\n` +
        `a=fmtp:${payload} ` +
        wanted.join(";")
    );

  return addStableAudioPacketTime(
    withFmtp
  );
}


function addStableAudioPacketTime(
  sdp: string
) {
  if (
    /\r?\na=ptime:/i
      .test(sdp)
  ) {
    return sdp;
  }

  const audioLine =
    /m=audio[^\r\n]*/i;

  const match =
    sdp.match(audioLine);

  if (!match) {
    return sdp;
  }

  const start =
    sdp.indexOf(
      match[0]
    );

  const nextMedia =
    sdp.indexOf(
      "\r\nm=",
      start +
        match[0].length
    );

  const end =
    nextMedia === -1
      ? sdp.length
      : nextMedia;

  return (
    sdp.slice(0, end) +
    "\r\na=ptime:20\r\na=maxptime:60" +
    sdp.slice(end)
  );
}


function optimizeAudioDescription(
  description:
    RTCSessionDescriptionInit
):
  RTCSessionDescriptionInit {

  return {
    type:
      description.type,
    sdp:
      optimizeOpusSdp(
        description.sdp || ""
      ),
  };
}


async function configureAudioSender(
  sender:
    RTCRtpSender
) {
  try {
    const parameters =
      sender.getParameters();

    if (
      parameters.encodings &&
      parameters.encodings.length > 0
    ) {
      parameters.encodings =
        parameters.encodings.map(
          (encoding) => ({
            ...encoding,
            maxBitrate:
              64000,
          })
        );

      await sender.setParameters(
        parameters
      );
    }
  } catch {
    /*
     * Alguns browsers só aceitam setParameters depois da
     * negociação. O SDP acima continua garantindo os
     * principais ajustes do Opus.
     */
  }
}


/*
 * SUAVIZAÇÃO DE RECEPÇÃO
 *
 * WebRTC já possui jitter buffer automaticamente. Em browsers
 * que expõem jitterBufferTarget, pedimos um alvo um pouco maior
 * para absorver variações de chegada dos pacotes antes de tocar
 * o áudio. Isso acrescenta uma pequena latência, mas reduz
 * bastante os "picotes" quando a rede oscila.
 *
 * A propriedade ainda não existe em todos os navegadores, então
 * o código cai silenciosamente para o jitter buffer padrão.
 */
function configureSmoothAudioReceiver(
  receiver:
    RTCRtpReceiver,
  track:
    MediaStreamTrack
) {
  if (
    track.kind !== "audio"
  ) {
    return;
  }

  try {
    const smoothReceiver =
      receiver as
        RTCRtpReceiver & {
          jitterBufferTarget?:
            number;
        };

    if (
      "jitterBufferTarget"
        in smoothReceiver
    ) {
      smoothReceiver
        .jitterBufferTarget =
          140;
    }
  } catch {
    // Browser sem suporte: mantém o buffer automático nativo.
  }
}


function makeSessionId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


function serializeDescription(
  description:
    RTCSessionDescriptionInit
) {
  return {
    type:
      description.type,
    sdp:
      description.sdp || "",
  };
}


function serializeCandidate(
  candidate:
    RTCIceCandidate
) {
  return {
    candidate:
      candidate.candidate,
    sdpMid:
      candidate.sdpMid,
    sdpMLineIndex:
      candidate.sdpMLineIndex,
    usernameFragment:
      candidate.usernameFragment,
  };
}


function pairIdFor(
  localUid: string,
  localSession: string,
  remoteUid: string,
  remoteSession: string
) {
  const endpoints = [
    `${localUid}_${localSession}`,
    `${remoteUid}_${remoteSession}`,
  ].sort();

  return endpoints.join("__");
}


function formatDuration(
  totalSeconds: number
) {
  const safe =
    Math.max(
      0,
      Math.floor(
        totalSeconds
      )
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60
    );

  const seconds =
    safe % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map((value) =>
      String(value)
        .padStart(2, "0")
    )
    .join(":");
}


function participantLetter(
  participant:
    Pick<
      CallParticipant,
      "username"
    >
) {
  return (
    participant.username
      ?.charAt(0)
      .toUpperCase() ||
    "E"
  );
}


function StreamVideo({
  stream,
  muted,
  mirrored = false,
  className = "",
}: {
  stream:
    MediaStream | null;
  muted: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref =
    useRef<HTMLVideoElement | null>(
      null
    );

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.srcObject =
      stream;
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${
        mirrored
          ? "mirrored"
          : ""
      }`}
    />
  );
}


function ParticipantAvatar({
  participant,
}: {
  participant:
    CallParticipant;
}) {
  return (
    <div className="el-call-avatar">
      {participant.avatar ? (
        <img
          src={participant.avatar}
          alt=""
        />
      ) : (
        participantLetter(
          participant
        )
      )}
    </div>
  );
}


function ControlButton({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
  withChevron = false,
}: {
  icon:
    React.ReactNode;
  label: string;
  onClick:
    () => void;
  active?: boolean;
  danger?: boolean;
  withChevron?: boolean;
}) {
  return (
    <button
      type="button"
      className={`el-call-control ${
        active
          ? "active"
          : ""
      } ${
        danger
          ? "danger"
          : ""
      }`}
      onClick={onClick}
    >
      <span className="el-call-control-icon">
        {icon}
      </span>

      <span className="el-call-control-label">
        {label}

        {withChevron && (
          <ChevronDown
            size={14}
          />
        )}
      </span>
    </button>
  );
}


function CallRoom({
  user,
  profile,
  call,
  onLeave,
  onOpenSettings,
}: {
  user: FirebaseUser;
  profile:
    EliseoUser | null;
  call:
    EliseoCallDescriptor;
  onLeave:
    () => void;
  onOpenSettings:
    () => void;
}) {
  const [participants, setParticipants] =
    useState<CallParticipant[]>([]);

  const [remoteStreams, setRemoteStreams] =
    useState<
      Record<
        string,
        MediaStream
      >
    >({});

  const [localStream, setLocalStream] =
    useState<MediaStream | null>(
      null
    );

  const [cameraEnabled, setCameraEnabled] =
    useState(
      call.startWithVideo
    );

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [speakerEnabled, setSpeakerEnabled] =
    useState(true);

  const [handRaised, setHandRaised] =
    useState(false);

  /* ELISEO_DESKTOP_SCREEN_SHARE_V1 */
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);

  const [error, setError] =
    useState("");

  const [createdAtMs, setCreatedAtMs] =
    useState(
      Date.now()
    );

  const [nowMs, setNowMs] =
    useState(
      Date.now()
    );

  const localStreamRef =
    useRef<MediaStream>(
      new MediaStream()
    );

  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const screenPeersRef = useRef<Map<string, ScreenPeerBundle>>(new Map());

  const sessionIdRef =
    useRef("");

  const peersRef =
    useRef<
      Map<
        string,
        PeerBundle
      >
    >(
      new Map()
    );

  const stopParticipantsRef =
    useRef<Unsubscribe | null>(
      null
    );

  const stopRoomRef =
    useRef<Unsubscribe | null>(
      null
    );

  const leavingRef =
    useRef(false);

  const onLeaveRef =
    useRef(
      onLeave
    );

  useEffect(() => {
    onLeaveRef.current =
      onLeave;
  }, [
    onLeave,
  ]);


  const roomRef =
    useMemo(
      () =>
        doc(
          db,
          "calls",
          call.roomId
        ),
      [call.roomId]
    );

  const participantsRef =
    useMemo(
      () =>
        collection(
          db,
          "calls",
          call.roomId,
          "participants"
        ),
      [call.roomId]
    );


  const updateMyParticipant =
    useCallback(
      async (
        patch:
          Record<string, any>
      ) => {
        if (
          !sessionIdRef.current
        ) {
          return;
        }

        await setDoc(
          doc(
            db,
            "calls",
            call.roomId,
            "participants",
            user.uid
          ),
          {
            ...patch,
            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      },
      [
        call.roomId,
        user.uid,
      ]
    );


  const closePeer =
    useCallback(
      (
        remoteUid: string
      ) => {
        const bundle =
          peersRef.current.get(
            remoteUid
          );

        if (!bundle) {
          return;
        }

        bundle.stopSignal();
        bundle.stopCandidates();
        bundle.pc.ontrack = null;
        bundle.pc.onicecandidate =
          null;
        bundle.pc.close();

        peersRef.current.delete(
          remoteUid
        );

        setRemoteStreams(
          (current) => {
            const next = {
              ...current,
            };

            delete next[
              remoteUid
            ];

            return next;
          }
        );
      },
      []
    );

  const closeScreenPeer =
    useCallback(
      (remoteUid: string) => {
        const bundle = screenPeersRef.current.get(remoteUid);
        if (!bundle) return;

        bundle.stopSignal();
        bundle.stopCandidates();
        bundle.pc.ontrack = null;
        bundle.pc.onicecandidate = null;
        bundle.pc.close();
        screenPeersRef.current.delete(remoteUid);

        setRemoteScreenStreams((current) => {
          if (!current[remoteUid]) return current;
          const next = {...current};
          delete next[remoteUid];
          return next;
        });
      },
      []
    );

  const ensureScreenPeer =
    useCallback(
      async (remote: CallParticipant) => {
        if (!sessionIdRef.current || remote.uid === user.uid) return;

        const existing = screenPeersRef.current.get(remote.uid);
        if (existing && existing.remoteSessionId === remote.sessionId) return;
        if (existing) closeScreenPeer(remote.uid);

        const pc = new RTCPeerConnection({iceServers: ICE_SERVERS});
        const initiator = user.uid.localeCompare(remote.uid) < 0;
        const bundle: ScreenPeerBundle = {
          pc,
          remoteUid: remote.uid,
          remoteSessionId: remote.sessionId,
          sender: null,
          stopSignal: () => {},
          stopCandidates: () => {},
          processedCandidates: new Set(),
          queuedCandidates: [],
        };

        screenPeersRef.current.set(remote.uid, bundle);
        const remoteScreenStream = new MediaStream();
        setRemoteScreenStreams((current) => ({...current, [remote.uid]: remoteScreenStream}));

        if (initiator) {
          const transceiver = pc.addTransceiver("video", {direction: "sendrecv"});
          bundle.sender = transceiver.sender;
          await bundle.sender.replaceTrack(
            localScreenStreamRef.current?.getVideoTracks()[0] || null
          );
        }

        pc.ontrack = (event) => {
          if (event.track.kind !== "video") return;
          if (!remoteScreenStream.getTracks().some((track) => track.id === event.track.id)) {
            remoteScreenStream.addTrack(event.track);
          }
          setRemoteScreenStreams((current) => ({...current, [remote.uid]: remoteScreenStream}));
        };

        const basePairId = pairIdFor(
          user.uid,
          sessionIdRef.current,
          remote.uid,
          remote.sessionId
        );
        const pairId = `${basePairId}__screen`;
        const signalRef = doc(db, "calls", call.roomId, "signals", pairId);
        const candidatesRef = collection(
          db, "calls", call.roomId, "signals", pairId, "candidates"
        );

        async function flushCandidates() {
          if (!pc.remoteDescription) return;
          while (bundle.queuedCandidates.length) {
            const candidate = bundle.queuedCandidates.shift();
            if (!candidate) continue;
            try { await pc.addIceCandidate(candidate); } catch {}
          }
        }

        bundle.stopSignal = onSnapshot(signalRef, async (snapshot) => {
          if (!snapshot.exists() || pc.signalingState === "closed") return;
          const data = snapshot.data() as DocumentData;
          try {
            if (!initiator && data.offer && !pc.remoteDescription) {
              await pc.setRemoteDescription(data.offer);
              const transceiver = pc.getTransceivers().find(
                (item) => item.receiver?.track?.kind === "video"
              );
              if (transceiver) {
                transceiver.direction = "sendrecv";
                bundle.sender = transceiver.sender;
                await bundle.sender.replaceTrack(
                  localScreenStreamRef.current?.getVideoTracks()[0] || null
                );
              }
              await flushCandidates();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await setDoc(signalRef, {
                answer: serializeDescription(answer),
                answerFrom: user.uid,
                updatedAt: serverTimestamp(),
              }, {merge: true});
            }

            if (initiator && data.answer && !pc.remoteDescription) {
              await pc.setRemoteDescription(data.answer);
              await flushCandidates();
            }
          } catch (caught) {
            console.warn("Falha na sinalização da tela:", caught);
          }
        });

        bundle.stopCandidates = onSnapshot(candidatesRef, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== "added" || bundle.processedCandidates.has(change.doc.id)) return;
            bundle.processedCandidates.add(change.doc.id);
            const data = change.doc.data();
            if (data.from === user.uid) return;
            const candidate = data.candidate as RTCIceCandidateInit;
            if (!candidate?.candidate) return;
            if (pc.remoteDescription) pc.addIceCandidate(candidate).catch(() => {});
            else bundle.queuedCandidates.push(candidate);
          });
        });

        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          addDoc(candidatesRef, {
            from: user.uid,
            candidate: serializeCandidate(event.candidate),
            createdAt: serverTimestamp(),
          }).catch(() => {});
        };

        if (initiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalRef, {
            aUid: user.uid,
            bUid: remote.uid,
            media: "screen",
            offer: serializeDescription(offer),
            offerFrom: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, {merge: true});
        }
      },
      [call.roomId, closeScreenPeer, user.uid]
    );



  const ensurePeer =
    useCallback(
      async (
        remote:
          CallParticipant
      ) => {
        if (
          !sessionIdRef.current ||
          remote.uid ===
            user.uid
        ) {
          return;
        }

        const existing =
          peersRef.current.get(
            remote.uid
          );

        if (
          existing &&
          existing.remoteSessionId ===
            remote.sessionId
        ) {
          return;
        }

        if (existing) {
          closePeer(
            remote.uid
          );
        }

        const pc =
          new RTCPeerConnection({
            iceServers:
              ICE_SERVERS,
          });

        const audioTransceiver =
          pc.addTransceiver(
            "audio",
            {
              direction:
                "sendrecv",
            }
          );

        const videoTransceiver =
          pc.addTransceiver(
            "video",
            {
              direction:
                "sendrecv",
            }
          );

        const localAudio =
          localStreamRef.current
            .getAudioTracks()[0] ||
          null;

        prepareVoiceTrack(
          localAudio
        );

        const localVideo =
          localStreamRef.current
            .getVideoTracks()[0] ||
          null;

        await audioTransceiver
          .sender
          .replaceTrack(
            localAudio
          );

        await configureAudioSender(
          audioTransceiver.sender
        );

        await videoTransceiver
          .sender
          .replaceTrack(
            localVideo
          );

        const remoteStream =
          new MediaStream();

        setRemoteStreams(
          (current) => ({
            ...current,
            [remote.uid]:
              remoteStream,
          })
        );

        pc.ontrack =
          (event) => {
            configureSmoothAudioReceiver(
              event.receiver,
              event.track
            );

            if (
              !remoteStream
                .getTracks()
                .some(
                  (track) =>
                    track.id ===
                    event.track.id
                )
            ) {
              remoteStream.addTrack(
                event.track
              );
            }

            setRemoteStreams(
              (current) => ({
                ...current,
                [remote.uid]:
                  remoteStream,
              })
            );
          };

        const pairId =
          pairIdFor(
            user.uid,
            sessionIdRef.current,
            remote.uid,
            remote.sessionId
          );

        const signalRef =
          doc(
            db,
            "calls",
            call.roomId,
            "signals",
            pairId
          );

        const candidatesRef =
          collection(
            db,
            "calls",
            call.roomId,
            "signals",
            pairId,
            "candidates"
          );

        const initiator =
          user.uid.localeCompare(
            remote.uid
          ) < 0;

        const bundle:
          PeerBundle = {
            pc,
            remoteUid:
              remote.uid,
            remoteSessionId:
              remote.sessionId,
            audioSender:
              audioTransceiver.sender,
            videoSender:
              videoTransceiver.sender,
            stopSignal:
              () => {},
            stopCandidates:
              () => {},
            processedCandidates:
              new Set(),
            queuedCandidates: [],
          };

        peersRef.current.set(
          remote.uid,
          bundle
        );

        async function flushCandidates() {
          if (
            !pc.remoteDescription
          ) {
            return;
          }

          while (
            bundle.queuedCandidates
              .length
          ) {
            const candidate =
              bundle.queuedCandidates.shift();

            if (!candidate) {
              continue;
            }

            try {
              await pc.addIceCandidate(
                candidate
              );
            } catch {
              // Um candidate antigo ou duplicado pode chegar
              // durante a troca de estado. Ignoramos.
            }
          }
        }

        bundle.stopSignal =
          onSnapshot(
            signalRef,
            async (
              snapshot
            ) => {
              if (
                !snapshot.exists() ||
                pc.signalingState ===
                  "closed"
              ) {
                return;
              }

              const data =
                snapshot.data() as
                  DocumentData;

              try {
                if (
                  !initiator &&
                  data.offer &&
                  !pc.remoteDescription
                ) {
                  await pc.setRemoteDescription(
                    data.offer
                  );

                  await flushCandidates();

                  const answer =
                    optimizeAudioDescription(
                      await pc.createAnswer()
                    );

                  await pc.setLocalDescription(
                    answer
                  );

                  await configureAudioSender(
                    audioTransceiver.sender
                  );

                  await setDoc(
                    signalRef,
                    {
                      answer:
                        serializeDescription(
                          answer
                        ),
                      answerFrom:
                        user.uid,
                      updatedAt:
                        serverTimestamp(),
                    },
                    {
                      merge: true,
                    }
                  );
                }

                if (
                  initiator &&
                  data.answer &&
                  !pc.remoteDescription
                ) {
                  await pc.setRemoteDescription(
                    data.answer
                  );

                  await flushCandidates();
                }
              } catch (
                caught
              ) {
                console.error(
                  "Falha no sinal WebRTC:",
                  caught
                );
              }
            }
          );

        bundle.stopCandidates =
          onSnapshot(
            candidatesRef,
            (snapshot) => {
              snapshot.docChanges()
                .forEach(
                  (change) => {
                    if (
                      change.type !==
                        "added" ||
                      bundle
                        .processedCandidates
                        .has(
                          change.doc.id
                        )
                    ) {
                      return;
                    }

                    bundle
                      .processedCandidates
                      .add(
                        change.doc.id
                      );

                    const data =
                      change.doc.data();

                    if (
                      data.from ===
                      user.uid
                    ) {
                      return;
                    }

                    const candidate =
                      data.candidate as
                        RTCIceCandidateInit;

                    if (
                      pc.remoteDescription
                    ) {
                      pc.addIceCandidate(
                        candidate
                      ).catch(
                        () => {}
                      );
                    } else {
                      bundle
                        .queuedCandidates
                        .push(
                          candidate
                        );
                    }
                  }
                );
            }
          );

        pc.onicecandidate =
          (event) => {
            if (
              !event.candidate
            ) {
              return;
            }

            addDoc(
              candidatesRef,
              {
                from:
                  user.uid,
                candidate:
                  serializeCandidate(
                    event.candidate
                  ),
                createdAt:
                  serverTimestamp(),
              }
            ).catch(
              (caught) => {
                console.error(
                  "Falha ao enviar ICE candidate:",
                  caught
                );
              }
            );
          };

        if (initiator) {
          try {
            const offer =
              optimizeAudioDescription(
                await pc.createOffer()
              );

            await pc.setLocalDescription(
              offer
            );

            await configureAudioSender(
              audioTransceiver.sender
            );

            await setDoc(
              signalRef,
              {
                aUid:
                  user.uid,
                bUid:
                  remote.uid,
                offer:
                  serializeDescription(
                    offer
                  ),
                offerFrom:
                  user.uid,
                createdAt:
                  serverTimestamp(),
                updatedAt:
                  serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          } catch (
            caught
          ) {
            console.error(
              "Falha ao criar oferta WebRTC:",
              caught
            );
          }
        }
      },
      [
        call.roomId,
        closePeer,
        user.uid,
      ]
    );


  const tearDown =
    useCallback(
      async (
        sessionId: string,
        navigate: boolean
      ) => {
        if (
          navigate &&
          leavingRef.current
        ) {
          return;
        }

        if (navigate) {
          leavingRef.current =
            true;
        }

        stopParticipantsRef.current?.();
        stopParticipantsRef.current =
          null;

        stopRoomRef.current?.();
        stopRoomRef.current =
          null;

        Array.from(
          peersRef.current.keys()
        ).forEach(
          closePeer
        );

        Array.from(screenPeersRef.current.keys()).forEach(closeScreenPeer);

        localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
        localScreenStreamRef.current = null;

        localStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        localStreamRef.current =
          new MediaStream();

        try {
          const myRef =
            doc(
              db,
              "calls",
              call.roomId,
              "participants",
              user.uid
            );

          const mySnapshot =
            await getDoc(
              myRef
            );

          if (
            mySnapshot.exists() &&
            mySnapshot.data()
              .sessionId ===
              sessionId
          ) {
            await deleteDoc(
              myRef
            );
          }

          const remaining =
            await getDocs(
              participantsRef
            );

          if (
            remaining.empty
          ) {
            await updateDoc(
              roomRef,
              {
                active: false,
                endedAt:
                  serverTimestamp(),
              }
            ).catch(
              () => {}
            );
          }
        } catch (
          caught
        ) {
          console.error(
            "Falha ao sair da chamada:",
            caught
          );
        }

        if (navigate) {
          onLeaveRef.current();
        }
      },
      [
        call.roomId,
        closePeer,
        participantsRef,
        roomRef,
        user.uid,
      ]
    );


  useEffect(() => {
    const sessionId =
      makeSessionId();

    sessionIdRef.current =
      sessionId;

    leavingRef.current =
      false;

    let cancelled = false;

    async function start() {
      setError("");

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        setError(
          "Seu navegador não disponibilizou câmera/microfone para esta página."
        );
        return;
      }

      const stream =
        new MediaStream();

      try {
        const audioStream =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio:
                getAutomaticVoiceConstraints(),
              video: false,
            });

        audioStream
          .getAudioTracks()
          .forEach(
            (track) => {
              prepareVoiceTrack(
                track
              );

              stream.addTrack(
                track
              );
            }
          );
      } catch {
        setMicEnabled(false);
      }

      if (
        call.startWithVideo
      ) {
        try {
          const videoStream =
            await navigator
              .mediaDevices
              .getUserMedia({
                audio: false,
                video: {
                  width: {
                    ideal: 1280,
                  },
                  height: {
                    ideal: 720,
                  },
                },
              });

          videoStream
            .getVideoTracks()
            .forEach(
              (track) =>
                stream.addTrack(
                  track
                )
            );
        } catch {
          setCameraEnabled(false);
        }
      }

      if (cancelled) {
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
        return;
      }

      localStreamRef.current =
        stream;

      setLocalStream(
        new MediaStream(
          stream.getTracks()
        )
      );

      const actualMic =
        stream.getAudioTracks()
          .length > 0;

      const actualCamera =
        stream.getVideoTracks()
          .length > 0;

      setMicEnabled(
        actualMic
      );
      setCameraEnabled(
        actualCamera
      );

      try {
        const existingParticipants =
          await getDocs(
            participantsRef
          );

        const roomSnapshot =
          await getDoc(
            roomRef
          );

        const shouldResetRoom =
          !roomSnapshot.exists() ||
          existingParticipants.empty ||
          roomSnapshot.data()
            .active !== true;

        if (
          shouldResetRoom
        ) {
          await setDoc(
            roomRef,
            {
              contextType:
                call.contextType,
              conversationId:
                call.conversationId ||
                null,
              serverId:
                call.serverId ||
                null,
              title:
                call.title,
              createdBy:
                user.uid,
              createdAt:
                serverTimestamp(),
              updatedAt:
                serverTimestamp(),
              active: true,
            }
          );
        } else {
          await setDoc(
            roomRef,
            {
              active: true,
              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }

        await setDoc(
          doc(
            db,
            "calls",
            call.roomId,
            "participants",
            user.uid
          ),
          {
            uid:
              user.uid,
            sessionId,
            username:
              profile?.username ||
              user.displayName ||
              "Usuário",
            avatar:
              profile?.avatar ||
              user.photoURL ||
              "",
            micEnabled:
              actualMic,
            cameraEnabled:
              actualCamera,
            handRaised: false,
            screenSharing: false,
            joinedAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp(),
          }
        );
      } catch (
        caught
      ) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível abrir a chamada."
        );
        return;
      }

      stopRoomRef.current =
        onSnapshot(
          roomRef,
          (snapshot) => {
            const createdAt =
              snapshot.data()
                ?.createdAt;

            if (
              createdAt?.toMillis
            ) {
              setCreatedAtMs(
                createdAt.toMillis()
              );
            }
          }
        );

      stopParticipantsRef.current =
        onSnapshot(
          participantsRef,
          (snapshot) => {
            const incoming =
              snapshot.docs.map(
                (item) => ({
                  ...(item.data() as
                    Omit<
                      CallParticipant,
                      "uid"
                    >),
                  uid:
                    item.id,
                })
              );

            setParticipants(
              incoming
            );

            const remoteByUid =
              new Map(
                incoming
                  .filter(
                    (item) =>
                      item.uid !==
                      user.uid
                  )
                  .map(
                    (item) => [
                      item.uid,
                      item,
                    ]
                  )
              );

            for (
              const remote of
                remoteByUid.values()
            ) {
              ensurePeer(
                remote
              );
              ensureScreenPeer(remote);
            }

            Array.from(
              peersRef.current
                .entries()
            ).forEach(
              ([
                remoteUid,
                bundle,
              ]) => {
                const remote =
                  remoteByUid.get(
                    remoteUid
                  );

                if (
                  !remote ||
                  remote.sessionId !==
                    bundle.remoteSessionId
                ) {
                  closePeer(
                    remoteUid
                  );
                  closeScreenPeer(remoteUid);
                }
              }
            );
          }
        );
    }

    start();

    return () => {
      cancelled = true;

      tearDown(
        sessionId,
        false
      );
    };
  }, [
    call.contextType,
    call.conversationId,
    call.roomId,
    call.serverId,
    call.startWithVideo,
    call.title,
    closePeer,
    ensurePeer,
    participantsRef,
    profile?.avatar,
    profile?.username,
    roomRef,
    tearDown,
    user.displayName,
    user.photoURL,
    user.uid,
  ]);


  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setNowMs(
            Date.now()
          ),
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  async function stopScreenShare() {
    const stream = localScreenStreamRef.current;
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    localScreenStreamRef.current = null;
    setLocalScreenStream(null);

    await Promise.all(
      Array.from(screenPeersRef.current.values()).map((bundle) =>
        bundle.sender?.replaceTrack(null) ?? Promise.resolve()
      )
    );

    setScreenSharing(false);
    await updateMyParticipant({screenSharing: false}).catch(() => {});
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      setError("");
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Seu navegador não oferece compartilhamento de tela.");
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: false});
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      localScreenStreamRef.current = stream;
      setLocalScreenStream(new MediaStream(stream.getTracks()));

      await Promise.all(
        Array.from(screenPeersRef.current.values()).map((bundle) =>
          bundle.sender?.replaceTrack(track) ?? Promise.resolve()
        )
      );

      track.onended = () => { void stopScreenShare(); };
      setScreenSharing(true);
      await updateMyParticipant({screenSharing: true});
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível compartilhar a tela."
      );
    }
  }



  async function toggleCamera() {
    try {
      setError("");

      const currentTrack =
        localStreamRef.current
          .getVideoTracks()[0];

      if (currentTrack) {
        currentTrack.stop();
        localStreamRef.current
          .removeTrack(
            currentTrack
          );

        await Promise.all(
          Array.from(
            peersRef.current
              .values()
          ).map(
            (bundle) =>
              bundle.videoSender
                .replaceTrack(
                  null
                )
          )
        );

        setCameraEnabled(false);
        setLocalStream(
          new MediaStream(
            localStreamRef.current
              .getTracks()
          )
        );

        await updateMyParticipant({
          cameraEnabled: false,
        });
        return;
      }

      const cameraStream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: false,
            video: {
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
          });

      const nextTrack =
        cameraStream
          .getVideoTracks()[0];

      if (!nextTrack) {
        return;
      }

      localStreamRef.current
        .addTrack(
          nextTrack
        );

      await Promise.all(
        Array.from(
          peersRef.current
            .values()
        ).map(
          (bundle) =>
            bundle.videoSender
              .replaceTrack(
                nextTrack
              )
        )
      );

      setCameraEnabled(true);
      setLocalStream(
        new MediaStream(
          localStreamRef.current
            .getTracks()
        )
      );

      await updateMyParticipant({
        cameraEnabled: true,
      });
    } catch (
      caught
    ) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível acessar a câmera."
      );
    }
  }


  async function toggleMicrophone() {
    try {
      setError("");

      let track =
        localStreamRef.current
          .getAudioTracks()[0];

      if (!track) {
        const audioStream =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio:
                getAutomaticVoiceConstraints(),
              video: false,
            });

        track =
          audioStream
            .getAudioTracks()[0];

        if (!track) {
          return;
        }

        prepareVoiceTrack(
          track
        );

        localStreamRef.current
          .addTrack(
            track
          );

        await Promise.all(
          Array.from(
            peersRef.current
              .values()
          ).map(
            async (
              bundle
            ) => {
              await bundle
                .audioSender
                .replaceTrack(
                  track
                );

              await configureAudioSender(
                bundle.audioSender
              );
            }
          )
        );

        track.enabled = true;
        setMicEnabled(true);

        await updateMyParticipant({
          micEnabled: true,
        });
        return;
      }

      track.enabled =
        !track.enabled;

      setMicEnabled(
        track.enabled
      );

      await updateMyParticipant({
        micEnabled:
          track.enabled,
      });
    } catch (
      caught
    ) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível acessar o microfone."
      );
    }
  }


  async function toggleHand() {
    const next =
      !handRaised;

    setHandRaised(
      next
    );

    await updateMyParticipant({
      handRaised:
        next,
    }).catch(
      () => {
        setHandRaised(
          !next
        );
      }
    );
  }


  const orderedParticipants =
    useMemo(() => {
      const me =
        participants.find(
          (item) =>
            item.uid ===
            user.uid
        ) || {
          uid:
            user.uid,
          sessionId:
            sessionIdRef.current,
          username:
            profile?.username ||
            user.displayName ||
            "Você",
          avatar:
            profile?.avatar ||
            user.photoURL ||
            "",
          micEnabled,
          cameraEnabled,
          handRaised,
          screenSharing,
        };

      const others =
        participants
          .filter(
            (item) =>
              item.uid !==
              user.uid
          )
          .sort(
            (a, b) =>
              a.username.localeCompare(
                b.username
              )
          );

      return [
        me,
        ...others,
      ];
    }, [
      cameraEnabled,
      handRaised,
      micEnabled,
      participants,
      profile?.avatar,
      profile?.username,
      user.displayName,
      user.photoURL,
      user.uid,
    ]);


  const duration =
    formatDuration(
      (nowMs -
        createdAtMs) /
        1000
    );


  return (
    <main className="el-call-page">

      <header className="el-call-heading">
        <div>
          <h1>
            Sala de chamada
          </h1>

          <span>
            {orderedParticipants.length}{" "}
            {orderedParticipants.length === 1
              ? "participante"
              : "participantes"}{" "}
            <b>•</b>{" "}
            {duration}
          </span>

          <small>
            {call.title}
          </small>
        </div>

        <div className="el-call-heading-actions">
          <button
            type="button"
            title="Convidar pessoas"
          >
            <UserPlus
              size={23}
            />
          </button>

          <button
            type="button"
            title="Configurações"
            onClick={onOpenSettings}
          >
            <MoreHorizontal
              size={23}
            />
          </button>
        </div>
      </header>


      {error && (
        <div className="el-call-error">
          {error}
        </div>
      )}


      <section
        className={`el-call-grid count-${Math.min(
          orderedParticipants.length,
          4
        )}`}
      >
        {orderedParticipants.map(
          (participant) => {
            const mine =
              participant.uid ===
              user.uid;

            const stream =
              mine
                ? localStream
                : remoteStreams[
                    participant.uid
                  ] ||
                  null;

            const cameraOn =
              mine
                ? cameraEnabled
                : participant.cameraEnabled;

            const micOn =
              mine
                ? micEnabled
                : participant.micEnabled;

            const raised =
              mine
                ? handRaised
                : participant.handRaised;

            return (
              <article
                className={`el-call-card ${
                  cameraOn
                    ? "camera-on"
                    : "camera-off"
                }`}
                key={`${participant.uid}-${participant.sessionId}`}
              >
                <StreamVideo
                  stream={stream}
                  muted={
                    mine ||
                    !speakerEnabled
                  }
                  mirrored={mine}
                  className="el-call-video"
                />

                {!cameraOn && (
                  <div className="el-call-avatar-stage">
                    <ParticipantAvatar
                      participant={
                        participant
                      }
                    />
                  </div>
                )}

                <div className="el-call-card-chips">
                  {!micOn ? (
                    <span className="el-call-chip">
                      <MicOff
                        size={16}
                      />
                      Microfone desativado
                    </span>
                  ) : cameraOn ? (
                    <span className="el-call-chip">
                      <Video
                        size={16}
                      />
                      Câmera ligada
                    </span>
                  ) : (
                    <span className="el-call-chip">
                      <Volume2
                        size={16}
                      />
                      Somente áudio
                    </span>
                  )}

                  {raised && (
                    <span className="el-call-chip hand">
                      <Hand
                        size={16}
                      />
                      Mão levantada
                    </span>
                  )}
                </div>

                <strong className="el-call-participant-name">
                  {participant.username}
                  {mine
                    ? " (você)"
                    : ""}
                </strong>

                <button
                  type="button"
                  className="el-call-card-menu"
                  title="Configurações"
                  onClick={onOpenSettings}
                >
                  <MoreHorizontal
                    size={21}
                  />
                </button>
              </article>
            );
          }
        )}
      

        {orderedParticipants
          .filter((participant) =>
            participant.uid === user.uid
              ? screenSharing
              : !!participant.screenSharing
          )
          .map((participant) => {
            const mine = participant.uid === user.uid;
            const stream = mine
              ? localScreenStream
              : remoteScreenStreams[participant.uid] || null;

            return (
              <article
                className="el-call-card camera-on sharing-screen screen-share-card"
                key={`screen-${participant.uid}-${participant.sessionId}`}
              >
                <StreamVideo
                  stream={stream}
                  muted
                  mirrored={false}
                  className="el-call-video"
                />
                <div className="el-call-card-chips">
                  <span className="el-call-chip screen">
                    <MonitorUp size={16} />
                    Compartilhando tela
                  </span>
                </div>
                <strong className="el-call-participant-name">
                  {participant.username} · tela
                </strong>
              </article>
            );
          })}
      </section>


      <div className="el-call-controls-wrap">
        <div className="el-call-controls">
          <ControlButton
            icon={
              cameraEnabled
                ? <Video />
                : <VideoOff />
            }
            label="Câmera"
            onClick={
              toggleCamera
            }
            active={
              cameraEnabled
            }
            withChevron
          />

          <ControlButton
            icon={
              speakerEnabled
                ? <Volume2 />
                : <VolumeX />
            }
            label="Áudio"
            onClick={() =>
              setSpeakerEnabled(
                (value) =>
                  !value
              )
            }
            active={
              speakerEnabled
            }
            withChevron
          />

          

          <ControlButton
            icon={<MonitorUp />}
            label={screenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
            onClick={toggleScreenShare}
            active={screenSharing}
          />

          <div className="el-call-control-divider" />

          <ControlButton
            icon={
              micEnabled
                ? <Mic />
                : <MicOff />
            }
            label={
              micEnabled
                ? "Mutar"
                : "Desmutar"
            }
            onClick={
              toggleMicrophone
            }
            active={
              !micEnabled
            }
          />

          <ControlButton
            icon={<Hand />}
            label={
              handRaised
                ? "Abaixar mão"
                : "Levantar mão"
            }
            onClick={
              toggleHand
            }
            active={
              handRaised
            }
          />

          <ControlButton
            icon={<PhoneOff />}
            label="Sair"
            onClick={() =>
              tearDown(
                sessionIdRef.current,
                true
              )
            }
            danger
          />
        </div>
      </div>

    </main>
  );
}


export default CallRoom;
