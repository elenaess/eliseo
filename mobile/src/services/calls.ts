import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';

import {
  db,
} from './firebase';

/* =========================================================
   CONFIG
   ========================================================= */

export const CALL_PARTICIPANT_STALE_MS =
  45_000;

/* =========================================================
   TIPOS
   ========================================================= */

export type EliseoCallContextType =
  | 'dm'
  | 'server';

export type EliseoCallDescriptor = {
  roomId: string;

  contextType:
    EliseoCallContextType;

  conversationId?: string;

  serverId?: string;

  channelId?: string;

  title: string;

  startWithVideo?: boolean;
};

export type EliseoCallParticipant = {
  uid: string;

  sessionId: string;

  username: string;

  avatar?: string;

  micEnabled: boolean;

  cameraEnabled: boolean;

  handRaised: boolean;

  joinedAt?: any;

  updatedAt?: any;
};

export type EliseoCallPresence = {
  roomId: string;

  active: boolean;

  participants:
    EliseoCallParticipant[];
};

/* =========================================================
   IDS
   ========================================================= */

export function makeDmCallRoomId(
  conversationId: string,
) {
  return `dm-${conversationId}`;
}

export function makeChannelCallRoomId(
  serverId: string,
  channelId: string,
) {
  return (
    `server-${serverId}-${channelId}`
  );
}

export function makeCallSessionId() {
  return (
    `${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

export function makeCallPairId(
  localUid: string,
  localSession: string,
  remoteUid: string,
  remoteSession: string,
) {
  return [
    `${localUid}_${localSession}`,

    `${remoteUid}_${remoteSession}`,
  ]
    .sort()
    .join('__');
}

/* =========================================================
   REFS
   ========================================================= */

export function getCallRoomRef(
  roomId: string,
) {
  return doc(
    db,
    'calls',
    roomId,
  );
}

export function getCallParticipantsRef(
  roomId: string,
) {
  return collection(
    db,
    'calls',
    roomId,
    'participants',
  );
}

export function getCallParticipantRef(
  roomId: string,
  uid: string,
) {
  return doc(
    db,
    'calls',
    roomId,
    'participants',
    uid,
  );
}

export function getCallSignalRef(
  roomId: string,
  pairId: string,
) {
  return doc(
    db,
    'calls',
    roomId,
    'signals',
    pairId,
  );
}

export function getCallCandidatesRef(
  roomId: string,
  pairId: string,
) {
  return collection(
    db,
    'calls',
    roomId,
    'signals',
    pairId,
    'candidates',
  );
}

/* =========================================================
   TIMESTAMP
   ========================================================= */

function timestampToMillis(
  value: any,
) {
  if (
    value?.toMillis
  ) {
    return value.toMillis();
  }

  if (
    typeof value?.seconds ===
    'number'
  ) {
    return (
      value.seconds *
      1000
    );
  }

  return 0;
}

export function isCallParticipantFresh(
  participant:
    EliseoCallParticipant,
  now = Date.now(),
) {
  const updatedAt =
    timestampToMillis(
      participant.updatedAt,
    );

  /*
   * serverTimestamp pode aparecer
   * temporariamente como null no cliente.
   *
   * Nesse instante não devemos expulsar
   * visualmente o participante.
   */
  if (
    !updatedAt
  ) {
    return true;
  }

  return (
    now -
      updatedAt <
    CALL_PARTICIPANT_STALE_MS
  );
}

/* =========================================================
   SALA
   ========================================================= */

export async function openCallRoom(
  call:
    EliseoCallDescriptor,
  createdBy: string,
) {
  const roomRef =
    getCallRoomRef(
      call.roomId,
    );

  const snapshot =
    await getDoc(
      roomRef,
    );

  const alreadyActive =
    snapshot.exists() &&
    snapshot.data()
      ?.active === true;

  const commonData = {
    contextType:
      call.contextType,

    conversationId:
      call.conversationId ??
      null,

    serverId:
      call.serverId ??
      null,

    channelId:
      call.channelId ??
      null,

    title:
      call.title,

    active:
      true,

    updatedAt:
      serverTimestamp(),
  };

  if (
    alreadyActive
  ) {
    await setDoc(
      roomRef,
      commonData,
      {
        merge: true,
      },
    );

    return;
  }

  await setDoc(
    roomRef,
    {
      ...commonData,

      createdBy,

      createdAt:
        serverTimestamp(),

      endedAt:
        null,
    },
    {
      merge: true,
    },
  );
}

/* =========================================================
   ENTRAR NA CALL
   ========================================================= */

export async function joinCallParticipant({
  roomId,
  uid,
  sessionId,
  username,
  avatar,
  micEnabled,
  cameraEnabled,
  handRaised = false,
}: {
  roomId: string;

  uid: string;

  sessionId: string;

  username: string;

  avatar?: string;

  micEnabled: boolean;

  cameraEnabled: boolean;

  handRaised?: boolean;
}) {
  await setDoc(
    getCallParticipantRef(
      roomId,
      uid,
    ),
    {
      uid,

      sessionId,

      username,

      avatar:
        avatar ?? '',

      micEnabled,

      cameraEnabled,

      handRaised,

      joinedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    },
  );
}

/* =========================================================
   ATUALIZAR PARTICIPANTE
   ========================================================= */

export async function updateCallParticipant(
  roomId: string,
  uid: string,
  patch:
    Partial<
      Pick<
        EliseoCallParticipant,
        | 'micEnabled'
        | 'cameraEnabled'
        | 'handRaised'
        | 'username'
        | 'avatar'
      >
    >,
) {
  await setDoc(
    getCallParticipantRef(
      roomId,
      uid,
    ),
    {
      ...patch,

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}

/* =========================================================
   HEARTBEAT
   ========================================================= */

export async function touchCallParticipant(
  roomId: string,
  uid: string,
) {
  await setDoc(
    getCallParticipantRef(
      roomId,
      uid,
    ),
    {
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}

/* =========================================================
   PARTICIPANTES EM TEMPO REAL
   ========================================================= */

export function listenToCallParticipants(
  roomId: string,
  callback: (
    participants:
      EliseoCallParticipant[],
  ) => void,
) {
  let latest:
    EliseoCallParticipant[] =
      [];

  function emit() {
    const now =
      Date.now();

    callback(
      latest.filter(
        participant =>
          isCallParticipantFresh(
            participant,
            now,
          ),
      ),
    );
  }

  const unsubscribe =
    onSnapshot(
      getCallParticipantsRef(
        roomId,
      ),

      snapshot => {
        latest =
          snapshot.docs.map(
            item => {
              const data =
                item.data();

              return {
                uid:
                  item.id,

                sessionId:
                  data.sessionId ??
                  '',

                username:
                  data.username ??
                  'Usuário',

                avatar:
                  data.avatar ??
                  '',

                micEnabled:
                  data.micEnabled !==
                  false,

                cameraEnabled:
                  data.cameraEnabled ===
                  true,

                handRaised:
                  data.handRaised ===
                  true,

                joinedAt:
                  data.joinedAt ??
                  null,

                updatedAt:
                  data.updatedAt ??
                  null,
              };
            },
          );

        emit();
      },
    );

  /*
   * onSnapshot só dispara quando
   * o Firestore muda.
   *
   * Este timer também faz um
   * participante travado/crashado
   * desaparecer depois do timeout.
   */
  const staleTimer =
    setInterval(
      emit,
      10_000,
    );

  return () => {
    clearInterval(
      staleTimer,
    );

    unsubscribe();
  };
}

/* =========================================================
   PRESENÇA COMPLETA DA SALA
   ========================================================= */

export function listenToCallPresence(
  roomId: string,
  callback: (
    presence:
      EliseoCallPresence,
  ) => void,
) {
  let roomActive =
    false;

  let participants:
    EliseoCallParticipant[] =
      [];

  function emit() {
    callback({
      roomId,

      active:
        roomActive &&
        participants.length >
          0,

      participants,
    });
  }

  const stopRoom =
    onSnapshot(
      getCallRoomRef(
        roomId,
      ),

      snapshot => {
        roomActive =
          snapshot.exists() &&
          snapshot.data()
            ?.active ===
            true;

        emit();
      },
    );

  const stopParticipants =
    listenToCallParticipants(
      roomId,

      incoming => {
        participants =
          incoming;

        emit();
      },
    );

  return () => {
    stopRoom();
    stopParticipants();
  };
}

/* =========================================================
   PRESENÇA — DM
   ========================================================= */

export function listenToDmCallPresence(
  conversationId: string,
  callback: (
    presence:
      EliseoCallPresence,
  ) => void,
) {
  return listenToCallPresence(
    makeDmCallRoomId(
      conversationId,
    ),
    callback,
  );
}

/* =========================================================
   PRESENÇA — CANAL
   ========================================================= */

export function listenToChannelCallPresence(
  serverId: string,
  channelId: string,
  callback: (
    presence:
      EliseoCallPresence,
  ) => void,
) {
  return listenToCallPresence(
    makeChannelCallRoomId(
      serverId,
      channelId,
    ),
    callback,
  );
}

/* =========================================================
   SAIR DA CALL
   ========================================================= */

export async function leaveCallParticipant({
  roomId,
  uid,
  sessionId,
}: {
  roomId: string;

  uid: string;

  sessionId: string;
}) {
  const participantRef =
    getCallParticipantRef(
      roomId,
      uid,
    );

  try {
    const snapshot =
      await getDoc(
        participantRef,
      );

    /*
     * Evita um celular antigo apagar
     * uma sessão mais nova do mesmo UID.
     */
    if (
      snapshot.exists() &&
      snapshot.data()
        ?.sessionId ===
        sessionId
    ) {
      await deleteDoc(
        participantRef,
      );
    }

    const remaining =
      await getDocs(
        getCallParticipantsRef(
          roomId,
        ),
      );

    const freshRemaining =
      remaining.docs
        .map(item => {
          const data =
            item.data();

          return {
            uid:
              item.id,

            sessionId:
              data.sessionId ??
              '',

            username:
              data.username ??
              '',

            avatar:
              data.avatar ??
              '',

            micEnabled:
              data.micEnabled !==
              false,

            cameraEnabled:
              data.cameraEnabled ===
              true,

            handRaised:
              data.handRaised ===
              true,

            joinedAt:
              data.joinedAt ??
              null,

            updatedAt:
              data.updatedAt ??
              null,
          } satisfies
            EliseoCallParticipant;
        })
        .filter(
          isCallParticipantFresh,
        );

    if (
      freshRemaining.length ===
      0
    ) {
      await updateDoc(
        getCallRoomRef(
          roomId,
        ),
        {
          active:
            false,

          endedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },
      ).catch(
        () => {},
      );
    }
  } catch (
    error
  ) {
    console.warn(
      'Falha ao sair da call:',
      error,
    );
  }
}