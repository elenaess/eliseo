import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import {
  db,
  getUserById,
} from './firebase';

import type {
  EliseoUser,
} from './firebase';

export type EliseoPixAction =
  | 'pay'
  | 'charge';

export type EliseoPixStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'payment_reported'
  | 'paid';

export type EliseoPixContextType =
  | 'dm'
  | 'server';

export type EliseoPixRequest = {
  id: string;

  initiatorId: string;
  targetId: string;

  action:
    EliseoPixAction;

  amountCents: number;

  status:
    EliseoPixStatus;

  contextType:
    EliseoPixContextType;

  conversationId?: string;
  serverId?: string;
  channelId?: string;

  createdAt?: any;
  respondedAt?: any;
  paymentReportedAt?: any;
  paidAt?: any;
};

export type EliseoPixSecret = {
  requestId: string;
  ownerId: string;
  allowedUid: string;
  pixKey: string;
  createdAt?: any;
};

export type CreatePixRequestInput = {
  initiatorId: string;
  targetId: string;
  action:
    EliseoPixAction;
  amountCents: number;
  contextType:
    EliseoPixContextType;
  conversationId?: string;
  serverId?: string;
  channelId?: string;
};

function createdAtValue(
  value: any,
) {
  return (
    value?.toMillis?.() ??
    value?.seconds * 1000 ??
    0
  );
}

function sortNewest(
  requests:
    EliseoPixRequest[],
) {
  return [
    ...requests,
  ].sort(
    (
      first,
      second,
    ) =>
      createdAtValue(
        second.createdAt,
      ) -
      createdAtValue(
        first.createdAt,
      ),
  );
}

function mapRequest(
  requestDoc: any,
): EliseoPixRequest {
  const data =
    requestDoc.data();

  return {
    id:
      requestDoc.id,

    initiatorId:
      data?.initiatorId ??
      '',

    targetId:
      data?.targetId ??
      '',

    action:
      data?.action ===
      'charge'
        ? 'charge'
        : 'pay',

    amountCents:
      Number(
        data?.amountCents ??
          0,
      ),

    status:
      data?.status ??
      'pending',

    contextType:
      data?.contextType ===
      'server'
        ? 'server'
        : 'dm',

    conversationId:
      data?.conversationId ??
      undefined,

    serverId:
      data?.serverId ??
      undefined,

    channelId:
      data?.channelId ??
      undefined,

    createdAt:
      data?.createdAt ??
      null,

    respondedAt:
      data?.respondedAt ??
      null,

    paymentReportedAt:
      data?.paymentReportedAt ??
      null,

    paidAt:
      data?.paidAt ??
      null,
  };
}

export function parsePixAmount(
  value: string,
): number | null {
  const normalized =
    value
      .trim()
      .replace(
        /R\$/gi,
        '',
      )
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

  const number =
    Number(normalized);

  if (
    !Number.isFinite(
      number,
    ) ||
    number <= 0
  ) {
    return null;
  }

  return Math.round(
    number * 100,
  );
}

export function formatPixAmount(
  cents: number,
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  ).format(
    cents / 100,
  );
}

export async function saveMyPixKey(
  uid: string,
  pixKey: string,
) {
  const clean =
    pixKey.trim();

  if (!clean) {
    throw new Error(
      'Digite uma chave PIX.',
    );
  }

  if (
    clean.length > 120
  ) {
    throw new Error(
      'Essa chave PIX é longa demais.',
    );
  }

  await setDoc(
    doc(
      db,
      'pixProfiles',
      uid,
    ),
    {
      pixKey:
        clean,
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  return clean;
}

export async function getMyPixKey(
  uid: string,
) {
  const snapshot =
    await getDoc(
      doc(
        db,
        'pixProfiles',
        uid,
      ),
    );

  if (
    !snapshot.exists()
  ) {
    return '';
  }

  return String(
    snapshot.data()?.pixKey ??
      '',
  );
}

export async function createPixRequest(
  input:
    CreatePixRequestInput,
) {
  if (
    !input.initiatorId ||
    !input.targetId
  ) {
    throw new Error(
      'Usuário PIX inválido.',
    );
  }

  if (
    input.initiatorId ===
    input.targetId
  ) {
    throw new Error(
      'Você não pode criar um PIX para você mesma.',
    );
  }

  if (
    !Number.isInteger(
      input.amountCents,
    ) ||
    input.amountCents <= 0
  ) {
    throw new Error(
      'Digite um valor PIX válido.',
    );
  }

  if (
    input.contextType ===
      'dm' &&
    !input.conversationId
  ) {
    throw new Error(
      'Conversa inválida.',
    );
  }

  if (
    input.contextType ===
      'server' &&
    (!input.serverId ||
      !input.channelId)
  ) {
    throw new Error(
      'Canal inválido.',
    );
  }

  const requestRef =
    doc(
      collection(
        db,
        'pixRequests',
      ),
    );

  const batch =
    writeBatch(db);

  const requestData: any = {
    initiatorId:
      input.initiatorId,

    targetId:
      input.targetId,

    action:
      input.action,

    amountCents:
      input.amountCents,

    status:
      'pending',

    contextType:
      input.contextType,

    createdAt:
      serverTimestamp(),
  };

  if (
    input.contextType ===
    'dm'
  ) {
    requestData.conversationId =
      input.conversationId;
  } else {
    requestData.serverId =
      input.serverId;
    requestData.channelId =
      input.channelId;
  }

  batch.set(
    requestRef,
    requestData,
  );

  if (
    input.action ===
    'charge'
  ) {
    const pixKey =
      await getMyPixKey(
        input.initiatorId,
      );

    if (!pixKey) {
      throw new Error(
        'Cadastre sua chave PIX antes de cobrar alguém.',
      );
    }

    batch.set(
      doc(
        db,
        'pixRequestSecrets',
        requestRef.id,
      ),
      {
        requestId:
          requestRef.id,

        ownerId:
          input.initiatorId,

        allowedUid:
          input.targetId,

        pixKey,

        createdAt:
          serverTimestamp(),
      },
    );
  }

  await batch.commit();

  return requestRef.id;
}

export async function respondToPixRequest(
  request:
    EliseoPixRequest,
  currentUid: string,
  accept: boolean,
) {
  if (
    request.targetId !==
    currentUid
  ) {
    throw new Error(
      'Você não pode responder a essa solicitação.',
    );
  }

  if (
    request.status !==
    'pending'
  ) {
    return;
  }

  const requestRef =
    doc(
      db,
      'pixRequests',
      request.id,
    );

  if (!accept) {
    await updateDoc(
      requestRef,
      {
        status:
          'declined',
        respondedAt:
          serverTimestamp(),
      },
    );

    return;
  }

  if (
    request.action ===
    'pay'
  ) {
    const pixKey =
      await getMyPixKey(
        currentUid,
      );

    if (!pixKey) {
      throw new Error(
        'Cadastre sua chave PIX antes de aceitar esse pagamento.',
      );
    }

    const batch =
      writeBatch(db);

    batch.update(
      requestRef,
      {
        status:
          'accepted',
        respondedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        'pixRequestSecrets',
        request.id,
      ),
      {
        requestId:
          request.id,

        ownerId:
          currentUid,

        allowedUid:
          request.initiatorId,

        pixKey,

        createdAt:
          serverTimestamp(),
      },
    );

    await batch.commit();

    return;
  }

  await updateDoc(
    requestRef,
    {
      status:
        'accepted',
      respondedAt:
        serverTimestamp(),
    },
  );
}

export async function getPixRequestSecret(
  requestId: string,
): Promise<
  EliseoPixSecret | null
> {
  const snapshot =
    await getDoc(
      doc(
        db,
        'pixRequestSecrets',
        requestId,
      ),
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  const data =
    snapshot.data();

  return {
    requestId:
      data?.requestId ??
      requestId,

    ownerId:
      data?.ownerId ??
      '',

    allowedUid:
      data?.allowedUid ??
      '',

    pixKey:
      data?.pixKey ??
      '',

    createdAt:
      data?.createdAt ??
      null,
  };
}

export function listenToIncomingPixRequests(
  uid: string,
  callback: (
    requests:
      EliseoPixRequest[],
  ) => void,
) {
  const requestsQuery =
    query(
      collection(
        db,
        'pixRequests',
      ),
      where(
        'targetId',
        '==',
        uid,
      ),
    );

  return onSnapshot(
    requestsQuery,
    snapshot => {
      callback(
        sortNewest(
          snapshot.docs.map(
            mapRequest,
          ),
        ),
      );
    },
  );
}

export function listenToOutgoingPixRequests(
  uid: string,
  callback: (
    requests:
      EliseoPixRequest[],
  ) => void,
) {
  const requestsQuery =
    query(
      collection(
        db,
        'pixRequests',
      ),
      where(
        'initiatorId',
        '==',
        uid,
      ),
    );

  return onSnapshot(
    requestsQuery,
    snapshot => {
      callback(
        sortNewest(
          snapshot.docs.map(
            mapRequest,
          ),
        ),
      );
    },
  );
}

export async function markPixPaymentReported(
  request:
    EliseoPixRequest,
  currentUid: string,
) {
  const payerId =
    request.action ===
    'charge'
      ? request.targetId
      : request.initiatorId;

  if (
    payerId !==
    currentUid
  ) {
    throw new Error(
      'Somente quem está pagando pode marcar como pago.',
    );
  }

  if (
    request.status !==
    'accepted'
  ) {
    return;
  }

  await updateDoc(
    doc(
      db,
      'pixRequests',
      request.id,
    ),
    {
      status:
        'payment_reported',
      paymentReportedAt:
        serverTimestamp(),
    },
  );
}

export async function confirmPixPaymentReceived(
  request:
    EliseoPixRequest,
  currentUid: string,
  received: boolean,
) {
  const receiverId =
    request.action ===
    'charge'
      ? request.initiatorId
      : request.targetId;

  if (
    receiverId !==
    currentUid
  ) {
    throw new Error(
      'Somente quem recebe pode confirmar o pagamento.',
    );
  }

  if (
    request.status !==
    'payment_reported'
  ) {
    return;
  }

  await updateDoc(
    doc(
      db,
      'pixRequests',
      request.id,
    ),
    {
      status:
        received
          ? 'paid'
          : 'accepted',
      paidAt:
        received
          ? serverTimestamp()
          : null,
    },
  );
}

export async function getServerPixMembers(
  serverId: string,
  currentUid: string,
): Promise<EliseoUser[]> {
  const snapshot =
    await getDoc(
      doc(
        db,
        'servers',
        serverId,
      ),
    );

  if (
    !snapshot.exists()
  ) {
    return [];
  }

  const members =
    (snapshot.data()
      ?.members ?? []) as string[];

  const profiles =
    await Promise.all(
      members
        .filter(
          uid =>
            uid !==
            currentUid,
        )
        .map(
          uid =>
            getUserById(
              uid,
            ),
        ),
    );

  return profiles
    .filter(
      (
        profile,
      ): profile is EliseoUser =>
        !!profile,
    )
    .sort(
      (
        first,
        second,
      ) =>
        first.username.localeCompare(
          second.username,
          'pt-BR',
        ),
    );
}

export async function getServerPixMemberByUsername(
  serverId: string,
  currentUid: string,
  username: string,
) {
  const clean =
    username
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

  if (!clean) {
    return null;
  }

  const members =
    await getServerPixMembers(
      serverId,
      currentUid,
    );

  return (
    members.find(
      member =>
        member.username
          .toLowerCase() ===
        clean,
    ) ?? null
  );
}
