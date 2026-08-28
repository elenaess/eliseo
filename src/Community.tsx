import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  User as FirebaseUser,
} from "firebase/auth";

import {
  ChevronDown,
  Hash,
  Image,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Users,
  Video,
  VolumeX,
} from "lucide-react";

import {
  createServer,
  createServerChannel,
  getUserById,
  joinServerById,
  listenToChannelMessages,
  listenToServerChannels,
  listenToUserServers,
  sendChannelMessage,
  updateServerSettings,
  createPixRequest,
  getPixRequestSecret,
  getUserByUsername,
  listenToIncomingPixRequests,
  listenToOutgoingPixRequests,
  respondToPixRequest,
  markPixPaymentReported,
  confirmPixPaymentReceived,

  type EliseoChannel,
  type EliseoChannelMessage,
  type EliseoPixAction,
  type EliseoPixRequest,
  type EliseoServer,
  type EliseoUser,
} from "./firestore";

import {
  uploadCommunityImage,
  uploadGif,
} from "./storage";

import { QRCodeSVG } from "qrcode.react";
import { buildPixPayload } from "./pix";
import type {
  EliseoCallDescriptor,
} from "./CallRoom";

import "./Community.css";


type CommunityProps = {
  user: FirebaseUser;

  profile:
    EliseoUser | null;

  onEditProfile:
    () => void;

  onStartCall:
    (
      call:
        EliseoCallDescriptor
    ) => void;

  onOpenSettings:
    () => void;

  openJoinSignal?:
    number;
};


type HydratedMessage =
  EliseoChannelMessage & {
    author:
      EliseoUser | null;
  };


/* =========================================================
   AVATAR
   ========================================================= */

function CommunityAvatar({
  user,
}: {
  user:
    EliseoUser | null;
}) {
  return (
    <div className="ui-avatar">

      {user?.avatar ? (
        <img
          src={user.avatar}
          alt=""
        />
      ) : (
        user?.username
          ?.charAt(0)
          .toUpperCase() ||
        "E"
      )}

    </div>
  );
}


/* =========================================================
   CONTA
   ========================================================= */

function CommunityAccount({
  profile,
  onEdit,
}: {
  profile:
    EliseoUser | null;

  onEdit:
    () => void;
}) {
  return (
    <div className="account-box">

      <div className="account-main">

        <div className="account-avatar-wrap">

          <CommunityAvatar
            user={profile}
          />

          <span className="online-dot" />

        </div>


        <div className="account-text">

          <strong>
            {profile?.username ||
              "Usuário"}
          </strong>

          <span>
            @
            {profile?.username ||
              "usuario"}
          </span>

        </div>


        <button
          onClick={
            onEdit
          }
        >
          <Pencil
            size={15}
          />
        </button>

      </div>


      <div className="account-status">

        <span className="status-dot" />

        <span>
          Online
        </span>

        <ChevronDown
          size={17}
        />

      </div>

    </div>
  );
}


/* =========================================================
   MODAL BASE
   ========================================================= */

function CommunityModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;

  subtitle?: string;

  children:
  ReactNode;

  onClose:
    () => void;
}) {
  return (
    <div className="community-modal-overlay">

      <div className="community-modal">

        <header>

          <div>

            <h2>
              {title}
            </h2>

            {subtitle && (
              <p>
                {subtitle}
              </p>
            )}

          </div>


          <button
            className="community-modal-close"
            onClick={
              onClose
            }
          >
            ×
          </button>

        </header>


        <div className="community-modal-content">
          {children}
        </div>

      </div>

    </div>
  );
}


function CommunityPixLogo({
  size = 22,
}: {
  size?: number;
}) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}pix.svg`}
      alt=""
      aria-hidden="true"
      className="community-pix-brand-logo"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}


function parseCommunityPixAmount(
  value: string
): number | null {
  const normalized =
    value
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

  const number =
    Number(normalized);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return Math.round(
    number * 100
  );
}


function formatCommunityPixAmount(
  cents: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(cents / 100);
}


function CommunityPixReadyCard({
  request,
  username,
  busy,
  onPaid,
}: {
  request: EliseoPixRequest;
  username: string;
  busy: boolean;
  onPaid: (
    request: EliseoPixRequest
  ) => void;
}) {
  const [pixKey, setPixKey] =
    useState("");

  const [copyLabel, setCopyLabel] =
    useState("Copiar Pix");

  useEffect(() => {
    let alive = true;

    getPixRequestSecret(
      request.id
    )
      .then((secret) => {
        if (alive) {
          setPixKey(
            secret?.pixKey || ""
          );
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [request.id]);

  const pixPayload =
    useMemo(() => {
      if (!pixKey) {
        return "";
      }

      try {
        return buildPixPayload({
          pixKey,
          amountCents:
            request.amountCents,
          txid: request.id,
        });
      } catch {
        return "";
      }
    }, [
      pixKey,
      request.amountCents,
      request.id,
    ]);

  async function copyPix() {
    if (!pixPayload) {
      return;
    }

    await navigator.clipboard
      .writeText(pixPayload);

    setCopyLabel("Copiado!");

    window.setTimeout(
      () =>
        setCopyLabel(
          "Copiar Pix"
        ),
      1400
    );
  }

  return (
    <div className="community-pix-ready-card community-pix-qr-card">
      <div className="community-pix-qr-copy">
        <strong className="community-pix-card-title">
          <CommunityPixLogo size={21} />
          PIX pronto para pagar
        </strong>

        <span>
          Pague {formatCommunityPixAmount(request.amountCents)} para @{username}.
        </span>

        <code>
          {pixPayload ||
            "Gerando Pix Copia e Cola..."}
        </code>

        <div className="community-pix-ready-actions">
          <button
            type="button"
            onClick={copyPix}
            disabled={!pixPayload || busy}
          >
            {copyLabel}
          </button>

          <button
            type="button"
            className="community-pix-paid-button"
            onClick={() =>
              onPaid(request)
            }
            disabled={!pixPayload || busy}
          >
            {busy
              ? "Aguarde..."
              : "Já paguei"}
          </button>
        </div>
      </div>

      <div className="community-pix-qr-box">
        {pixPayload ? (
          <QRCodeSVG
            value={pixPayload}
            size={240}
            level="L"
            includeMargin
          />
        ) : (
          <span>
            Carregando QR...
          </span>
        )}
      </div>
    </div>
  );
}


function CommunityPixConfirmReceiptCard({
  request,
  username,
  busy,
  onConfirm,
}: {
  request: EliseoPixRequest;
  username: string;
  busy: boolean;
  onConfirm: (
    request: EliseoPixRequest,
    received: boolean
  ) => void;
}) {
  return (
    <div className="community-pix-p2p-card community-pix-payment-check-card">
      <div>
        <strong>
          Confirmar recebimento
        </strong>

        <span>
          @{username} marcou {formatCommunityPixAmount(request.amountCents)} como pago. O valor já caiu na sua conta?
        </span>
      </div>

      <div className="community-pix-actions">
        <button
          type="button"
          className="deny"
          onClick={() =>
            onConfirm(
              request,
              false
            )
          }
          disabled={busy}
        >
          Ainda não
        </button>

        <button
          type="button"
          className="confirm"
          onClick={() =>
            onConfirm(
              request,
              true
            )
          }
          disabled={busy}
        >
          Confirmar pagamento
        </button>
      </div>
    </div>
  );
}


/* =========================================================
   COMMUNITY
   ========================================================= */

function Community({
  user,
  profile,
  onEditProfile,
  onStartCall,
  onOpenSettings,
  openJoinSignal = 0,
}: CommunityProps) {

  const [
    servers,
    setServers,
  ] =
    useState<
      EliseoServer[]
    >([]);


  const [
    selectedServerId,
    setSelectedServerId,
  ] =
    useState<
      string | null
    >(null);


  const [
    channels,
    setChannels,
  ] =
    useState<
      EliseoChannel[]
    >([]);


  const [
    selectedChannelId,
    setSelectedChannelId,
  ] =
    useState<
      string | null
    >(null);


  const [
    messages,
    setMessages,
  ] =
    useState<
      HydratedMessage[]
    >([]);


  const [
    messageText,
    setMessageText,
  ] =
    useState("");


  const [
    pixMenuOpen,
    setPixMenuOpen,
  ] =
    useState(false);


  const [
    pixMode,
    setPixMode,
  ] =
    useState<
      EliseoPixAction | null
    >(null);


  const [
    pixTarget,
    setPixTarget,
  ] =
    useState("");


  const [
    pixAmount,
    setPixAmount,
  ] =
    useState("");


  const [
    pixIncoming,
    setPixIncoming,
  ] =
    useState<
      EliseoPixRequest[]
    >([]);


  const [
    pixOutgoing,
    setPixOutgoing,
  ] =
    useState<
      EliseoPixRequest[]
    >([]);


  const [
    pixUsernames,
    setPixUsernames,
  ] =
    useState<
      Record<string, string>
    >({});


  const [
    pixBusy,
    setPixBusy,
  ] =
    useState(false);


  const [
    pixError,
    setPixError,
  ] =
    useState("");


  const [
    messageMedia,
    setMessageMedia,
  ] =
    useState<File | null>(
      null
    );


  const [
    sendingMessage,
    setSendingMessage,
  ] =
    useState(false);


  const mediaInputRef =
    useRef<HTMLInputElement>(
      null
    );


  const messageMediaPreview =
    useMemo(
      () =>
        messageMedia
          ? URL.createObjectURL(
              messageMedia
            )
          : "",
      [messageMedia]
    );


  useEffect(() => {
    return () => {
      if (
        messageMediaPreview
      ) {
        URL.revokeObjectURL(
          messageMediaPreview
        );
      }
    };
  }, [
    messageMediaPreview,
  ]);


  const [
    serverMenuOpen,
    setServerMenuOpen,
  ] =
    useState(false);


  const [
    createServerOpen,
    setCreateServerOpen,
  ] =
    useState(false);


  const [
    joinServerOpen,
    setJoinServerOpen,
  ] =
    useState(false);


  const [
    createChannelOpen,
    setCreateChannelOpen,
  ] =
    useState(false);


  const [
    settingsOpen,
    setSettingsOpen,
  ] =
    useState(false);


  const [
    serverName,
    setServerName,
  ] =
    useState("");


  const [
    joinId,
    setJoinId,
  ] =
    useState("");


  const [
    channelName,
    setChannelName,
  ] =
    useState("");


  const [
    serverPhoto,
    setServerPhoto,
  ] =
    useState<File | null>(
      null
    );


  const [
    serverBanner,
    setServerBanner,
  ] =
    useState<File | null>(
      null
    );


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");

    useEffect(() => {
  if (
    openJoinSignal > 0
  ) {
    setError("");
    setJoinId("");
    setJoinServerOpen(true);
  }
}, [openJoinSignal]);


  useEffect(() => {
    const stopIncoming =
      listenToIncomingPixRequests(
        user.uid,
        setPixIncoming
      );

    const stopOutgoing =
      listenToOutgoingPixRequests(
        user.uid,
        setPixOutgoing
      );

    return () => {
      stopIncoming();
      stopOutgoing();
    };
  }, [user.uid]);


  useEffect(() => {
    const ids =
      [...new Set(
        [
          ...pixIncoming.flatMap(
            (request) => [
              request.initiatorId,
              request.targetId,
            ]
          ),
          ...pixOutgoing.flatMap(
            (request) => [
              request.initiatorId,
              request.targetId,
            ]
          ),
        ].filter(Boolean)
      )];

    if (ids.length === 0) {
      return;
    }

    Promise.all(
      ids.map(
        async (uid) => ({
          uid,
          user:
            await getUserById(uid),
        })
      )
    ).then((items) => {
      const next:
        Record<string, string> = {};

      items.forEach((item) => {
        next[item.uid] =
          item.user?.username ||
          "usuario";
      });

      setPixUsernames(next);
    });
  }, [pixIncoming, pixOutgoing]);


  /* =======================================================
     SERVIDORES DO USUÁRIO
     ======================================================= */

  useEffect(() => {

    return listenToUserServers(
      user.uid,

      (
        incoming
      ) => {

        setServers(
          incoming
        );


        setSelectedServerId(
          (
            current
          ) => {

            if (
              current &&
              incoming.some(
                (
                  server
                ) =>
                  server.id ===
                  current
              )
            ) {
              return current;
            }

            return (
              incoming[0]
                ?.id ||
              null
            );
          }
        );

      }
    );

  }, [
    user.uid,
  ]);


  const selectedServer =
    useMemo(
      () =>
        servers.find(
          (
            server
          ) =>
            server.id ===
            selectedServerId
        ) ||
        null,

      [
        servers,
        selectedServerId,
      ]
    );


  const owner =
    selectedServer
      ?.ownerId ===
    user.uid;


  /* =======================================================
     CANAIS
     ======================================================= */

  useEffect(() => {

    if (
      !selectedServerId
    ) {
      setChannels([]);
      setSelectedChannelId(
        null
      );

      return;
    }


    return listenToServerChannels(
      selectedServerId,

      (
        incoming
      ) => {

        setChannels(
          incoming
        );


        setSelectedChannelId(
          (
            current
          ) => {

            if (
              current &&
              incoming.some(
                (
                  channel
                ) =>
                  channel.id ===
                  current
              )
            ) {
              return current;
            }

            return (
              incoming[0]
                ?.id ||
              null
            );
          }
        );

      }
    );

  }, [
    selectedServerId,
  ]);


  const selectedChannel =
    channels.find(
      (
        channel
      ) =>
        channel.id ===
        selectedChannelId
    ) ||
    null;


  const pendingPix =
    pixIncoming.filter(
      (request) =>
        request.status === "pending" &&
        request.contextType === "server" &&
        request.serverId ===
          selectedServerId &&
        request.channelId ===
          selectedChannelId
    );


  const allPix = [
    ...pixIncoming,
    ...pixOutgoing,
  ];

  const readyPix =
    allPix.filter(
      (request) => {
        const payerId =
          request.action === "charge"
            ? request.targetId
            : request.initiatorId;

        return (
          request.status === "accepted" &&
          payerId === user.uid &&
          request.contextType === "server" &&
          request.serverId ===
            selectedServerId &&
          request.channelId ===
            selectedChannelId
        );
      }
    );

  const confirmReceiptPix =
    allPix.filter(
      (request) => {
        const receiverId =
          request.action === "charge"
            ? request.initiatorId
            : request.targetId;

        return (
          request.status === "payment_reported" &&
          receiverId === user.uid &&
          request.contextType === "server" &&
          request.serverId ===
            selectedServerId &&
          request.channelId ===
            selectedChannelId
        );
      }
    );


  /* =======================================================
     MENSAGENS
     ======================================================= */

  useEffect(() => {

    if (
      !selectedServerId ||
      !selectedChannelId
    ) {
      setMessages([]);

      return;
    }


    return listenToChannelMessages(
      selectedServerId,
      selectedChannelId,

      async (
        incoming
      ) => {

        const authorIds =
          [
            ...new Set(
              incoming.map(
                (
                  message
                ) =>
                  message.senderId
              )
            ),
          ];


        const users =
          await Promise.all(
            authorIds.map(
              async (
                uid
              ) => ({
                uid,

                user:
                  await getUserById(
                    uid
                  ),
              })
            )
          );


        const userMap =
          new Map(
            users.map(
              (
                item
              ) => [
                item.uid,
                item.user,
              ]
            )
          );


        setMessages(
          incoming.map(
            (
              message
            ) => ({
              ...message,

              author:
                userMap.get(
                  message.senderId
                ) ||
                null,
            })
          )
        );

      }
    );

  }, [
    selectedServerId,
    selectedChannelId,
  ]);


  /* =======================================================
     CRIAR SERVIDOR
     ======================================================= */

  async function handleCreateServer() {

    const name =
      serverName.trim();


    if (!name) {

      setError(
        "Digite um nome para o servidor."
      );

      return;
    }


    try {

      setSaving(true);
      setError("");


      const serverId =
        await createServer(
          user.uid,
          name
        );


      let photoUrl = "";
      let bannerUrl = "";


      if (
        serverPhoto
      ) {

        const uploaded =
          await uploadCommunityImage(
            user.uid,
            serverPhoto
          );

        photoUrl =
          uploaded.url;

      }


      if (
        serverBanner
      ) {

        const uploaded =
          await uploadCommunityImage(
            user.uid,
            serverBanner
          );

        bannerUrl =
          uploaded.url;

      }


      if (
        photoUrl ||
        bannerUrl
      ) {

        await updateServerSettings(
          serverId,
          user.uid,
          {
            photo:
              photoUrl,

            banner:
              bannerUrl,
          }
        );

      }


      setSelectedServerId(
        serverId
      );


      setCreateServerOpen(
        false
      );


      setServerName("");
      setServerPhoto(null);
      setServerBanner(null);

    } catch (
      caught
    ) {

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar o servidor."
      );

    } finally {

      setSaving(false);

    }

  }


  /* =======================================================
     ENTRAR COM ID
     ======================================================= */

  async function handleJoinServer() {

    const id =
      joinId.trim();


    if (!id) {

      setError(
        "Digite o ID do servidor."
      );

      return;
    }


    try {

      setSaving(true);
      setError("");


      await joinServerById(
        id,
        user.uid
      );


      setSelectedServerId(
        id
      );


      setJoinServerOpen(
        false
      );


      setJoinId("");

    } catch (
      caught
    ) {

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível entrar no servidor."
      );

    } finally {

      setSaving(false);

    }

  }


  /* =======================================================
     CRIAR CANAL
     ======================================================= */

  async function handleCreateChannel() {

    if (
      !selectedServer
    ) {
      return;
    }


    const name =
      channelName
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          "-"
        );


    if (!name) {

      setError(
        "Digite o nome do canal."
      );

      return;
    }


    try {

      setSaving(true);
      setError("");


      await createServerChannel(
        selectedServer.id,
        user.uid,
        name
      );


      setChannelName(
        ""
      );


      setCreateChannelOpen(
        false
      );

    } catch (
      caught
    ) {

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar o canal."
      );

    } finally {

      setSaving(false);

    }

  }


  /* =======================================================
     SALVAR APARÊNCIA
     ======================================================= */

  async function handleSaveServerSettings() {

    if (
      !selectedServer
    ) {
      return;
    }


    try {

      setSaving(true);
      setError("");


      let photo =
        selectedServer.photo ||
        "";


      let banner =
        selectedServer.banner ||
        "";


      if (
        serverPhoto
      ) {

        const uploaded =
          await uploadCommunityImage(
            user.uid,
            serverPhoto
          );

        photo =
          uploaded.url;

      }


      if (
        serverBanner
      ) {

        const uploaded =
          await uploadCommunityImage(
            user.uid,
            serverBanner
          );

        banner =
          uploaded.url;

      }


      await updateServerSettings(
        selectedServer.id,
        user.uid,
        {
          name:
            serverName.trim() ||
            selectedServer.name,

          photo,

          banner,
        }
      );


      setSettingsOpen(
        false
      );


      setServerPhoto(null);
      setServerBanner(null);

    } catch (
      caught
    ) {

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o servidor."
      );

    } finally {

      setSaving(false);

    }

  }


  async function submitServerPix(
    action: EliseoPixAction,
    usernameInput: string,
    amountInput: string
  ) {
    if (
      !selectedServerId ||
      !selectedChannelId ||
      !selectedServer
    ) {
      return false;
    }

    const amountCents =
      parseCommunityPixAmount(
        amountInput
      );

    if (!amountCents) {
      setPixError(
        "Digite um valor válido."
      );
      return false;
    }

    const username =
      usernameInput
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    if (!username) {
      setPixError(
        "Marque uma pessoa com @usuario."
      );
      return false;
    }

    try {
      setPixBusy(true);
      setPixError("");

      const target =
        await getUserByUsername(
          username
        );

      if (!target) {
        throw new Error(
          "Usuário não encontrado."
        );
      }

      if (
        !selectedServer.members
          .includes(target.uid)
      ) {
        throw new Error(
          "Essa pessoa não faz parte deste servidor."
        );
      }

      await createPixRequest({
        initiatorId:
          user.uid,
        targetId:
          target.uid,
        action,
        amountCents,
        contextType:
          "server",
        serverId:
          selectedServerId,
        channelId:
          selectedChannelId,
      });

      setPixMenuOpen(false);
      setPixMode(null);
      setPixTarget("");
      setPixAmount("");

      return true;
    } catch (caught) {
      setPixError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar a solicitação PIX."
      );
      return false;
    } finally {
      setPixBusy(false);
    }
  }


  async function handlePixCommand(
    text: string
  ) {
    const trimmed =
      text.trim();

    if (
      !/^\.(pagar|cobrar)\b/i
        .test(trimmed)
    ) {
      return false;
    }

    const match =
      trimmed.match(
        /^\.(pagar|cobrar)\s+@([a-z0-9._]+)\s+(.+)$/i
      );

    if (!match) {
      setPixError(
        "Use .pagar @usuario 25,50 ou .cobrar @usuario 25,50."
      );
      return true;
    }

    if (messageMedia) {
      setPixError(
        "Envie o comando PIX sem mídia anexada."
      );
      return true;
    }

    const action:
      EliseoPixAction =
      match[1].toLowerCase() ===
      "pagar"
        ? "pay"
        : "charge";

    const success =
      await submitServerPix(
        action,
        match[2],
        match[3]
      );

    if (success) {
      setMessageText("");
    }

    return true;
  }


  async function answerServerPix(
    request: EliseoPixRequest,
    accept: boolean
  ) {
    try {
      setPixBusy(true);
      setPixError("");

      await respondToPixRequest(
        request,
        user.uid,
        accept
      );
    } catch (caught) {
      setPixError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível responder à solicitação PIX."
      );
    } finally {
      setPixBusy(false);
    }
  }


  async function reportServerPixPaid(
    request: EliseoPixRequest
  ) {
    try {
      setPixBusy(true);
      setPixError("");

      await markPixPaymentReported(
        request,
        user.uid
      );
    } catch (caught) {
      setPixError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível marcar o PIX como pago."
      );
    } finally {
      setPixBusy(false);
    }
  }


  async function confirmServerPixReceived(
    request: EliseoPixRequest,
    received: boolean
  ) {
    try {
      setPixBusy(true);
      setPixError("");

      await confirmPixPaymentReceived(
        request,
        user.uid,
        received
      );
    } catch (caught) {
      setPixError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível confirmar o recebimento."
      );
    } finally {
      setPixBusy(false);
    }
  }


  /* =======================================================
     ENVIAR MENSAGEM
     ======================================================= */

  async function handleSendMessage() {

    if (
      !selectedServerId ||
      !selectedChannelId ||
      sendingMessage
    ) {
      return;
    }


    const text =
      messageText.trim();


    if (
      text &&
      await handlePixCommand(text)
    ) {
      return;
    }


    if (
      !text &&
      !messageMedia
    ) {
      return;
    }


    try {

      setSendingMessage(
        true
      );

      let media:
        {
          url: string;
          type:
            | "image"
            | "gif";
          key?: string;
        } | null =
        null;


      if (
        messageMedia
      ) {

        const isGif =
          messageMedia.type ===
            "image/gif" ||
          messageMedia.name
            .toLowerCase()
            .endsWith(".gif");


        const uploaded =
          isGif
            ? await uploadGif(
                user.uid,
                messageMedia
              )
            : await uploadCommunityImage(
                user.uid,
                messageMedia
              );


        media = {
          url:
            uploaded.url,

          type:
            isGif
              ? "gif"
              : "image",

          key:
            uploaded.key,
        };

      }


      await sendChannelMessage(
        selectedServerId,
        selectedChannelId,
        user.uid,
        text,
        media
      );


      setMessageText("");
      setMessageMedia(null);

      if (
        mediaInputRef.current
      ) {
        mediaInputRef.current.value =
          "";
      }

    } catch (
      caught
    ) {

      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar a mensagem."
      );

    } finally {

      setSendingMessage(
        false
      );

    }

  }


  function handleMessageMedia(
    file:
      File | null
  ) {

    if (!file) {
      return;
    }


    const allowedTypes =
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];


    const allowedExtension =
      /\.(jpe?g|png|webp|gif)$/i
        .test(
          file.name
        );


    if (
      !allowedTypes.includes(
        file.type
      ) &&
      !allowedExtension
    ) {

      setError(
        "Escolha uma imagem JPG, PNG, WEBP ou GIF."
      );

      return;
    }


    setError("");
    setMessageMedia(
      file
    );

  }


  function removeMessageMedia() {

    setMessageMedia(
      null
    );

    if (
      mediaInputRef.current
    ) {
      mediaInputRef.current.value =
        "";
    }

  }


  /* =======================================================
     SEM SERVIDOR
     ======================================================= */

  if (
    !selectedServer
  ) {

    return (
      <div className="community-empty-page">

        <Users size={45} />


        <h2>
          Comunidades
        </h2>


        <p>
          Crie seu primeiro servidor ou entre em um utilizando o ID.
        </p>


        <div>

          <button
            className="community-primary-button"
            onClick={() => {

              setError("");
              setCreateServerOpen(
                true
              );

            }}
          >
            Criar servidor
          </button>


          <button
            className="community-secondary-button"
            onClick={() => {

              setError("");
              setJoinServerOpen(
                true
              );

            }}
          >
            Entrar com ID
          </button>

        </div>


        {createServerOpen && (
          <CreateServerModal
            name={
              serverName
            }
            setName={
              setServerName
            }
            setPhoto={
              setServerPhoto
            }
            setBanner={
              setServerBanner
            }
            saving={
              saving
            }
            error={
              error
            }
            onSubmit={
              handleCreateServer
            }
            onClose={() =>
              setCreateServerOpen(
                false
              )
            }
          />
        )}


        {joinServerOpen && (
          <JoinServerModal
            joinId={
              joinId
            }
            setJoinId={
              setJoinId
            }
            saving={
              saving
            }
            error={
              error
            }
            onSubmit={
              handleJoinServer
            }
            onClose={() =>
              setJoinServerOpen(
                false
              )
            }
          />
        )}

      </div>
    );

  }


  /* =======================================================
     UI PRINCIPAL
     ======================================================= */

  return (
    <div className="community-layout">

      <aside className="community-sidebar">


        {/* BANNER */}

        <div
          className="community-cover"
          style={
            selectedServer.banner
              ? {
                  backgroundImage:
                    `linear-gradient(
                      rgba(7, 11, 18, 0.18),
                      rgba(7, 11, 18, 0.55)
                    ),
                    url("${selectedServer.banner}")`,
                }
              : undefined
          }
        >

          {!selectedServer.banner && (
            <>
              <span>
                {selectedServer.name}
              </span>

              <small>
                ELÍSEO
              </small>
            </>
          )}

        </div>


        {/* SERVIDOR */}

        <div className="community-name">

          <div
            className={`community-icon ${
              selectedServer.photo
                ? ""
                : "purple-cloud"
            }`}
          >

            {selectedServer.photo && (
              <img
                src={
                  selectedServer.photo
                }
                alt=""
              />
            )}

          </div>


          <div className="community-server-info">

            <strong>
              {selectedServer.name}
            </strong>


            <span>
              ● Online ·{" "}
              {
                selectedServer
                  .members
                  .length
              }{" "}
              membros
            </span>

          </div>


          <button
            className="community-server-menu-button"
            onClick={() =>
              setServerMenuOpen(
                !serverMenuOpen
              )
            }
          >
            <ChevronDown
              size={18}
            />
          </button>


          {serverMenuOpen && (

            <div className="community-server-dropdown">

              <div className="community-server-id">

                <span>
                  ID do servidor
                </span>

                <code>
                  {selectedServer.id}
                </code>


                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      selectedServer.id
                    )
                  }
                >
                  Copiar ID
                </button>

              </div>


              <div className="community-server-list">

                {servers.map(
                  (
                    server
                  ) => (

                    <button
                      key={
                        server.id
                      }
                      className={
                        server.id ===
                        selectedServer.id
                          ? "active"
                          : ""
                      }
                      onClick={() => {

                        setSelectedServerId(
                          server.id
                        );

                        setServerMenuOpen(
                          false
                        );

                      }}
                    >
                      {server.name}
                    </button>

                  )
                )}

              </div>


              <button
                onClick={() => {

                  setError("");

                  setServerMenuOpen(
                    false
                  );

                  setCreateServerOpen(
                    true
                  );

                }}
              >
                + Criar servidor
              </button>


              <button
                onClick={() => {

                  setError("");

                  setServerMenuOpen(
                    false
                  );

                  setJoinServerOpen(
                    true
                  );

                }}
              >
                Entrar com ID
              </button>


              {owner && (

                <button
                  onClick={() => {

                    setServerName(
                      selectedServer.name
                    );

                    setServerPhoto(
                      null
                    );

                    setServerBanner(
                      null
                    );

                    setError("");

                    setServerMenuOpen(
                      false
                    );

                    setSettingsOpen(
                      true
                    );

                  }}
                >
                  <Settings
                    size={16}
                  />

                  Personalizar servidor
                </button>

              )}

            </div>

          )}

        </div>


        {/* CANAIS */}

        <div className="channel-group">

          <div className="channel-title">

            CANAIS DE TEXTO


            {owner && (

              <button
                className="channel-add-button"
                title="Criar canal"
                onClick={() => {

                  setError("");

                  setCreateChannelOpen(
                    true
                  );

                }}
              >
                <Plus
                  size={16}
                />
              </button>

            )}

          </div>


          {channels.map(
            (
              channel
            ) => (

              <button
                key={
                  channel.id
                }
                className={
                  channel.id ===
                  selectedChannelId
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSelectedChannelId(
                    channel.id
                  )
                }
              >

                <Hash
                  size={19}
                />

                {channel.name}

              </button>

            )
          )}

        </div>


        {/* VOZ - VISUAL */}

        <div className="channel-group">

          <div className="channel-title">
            CANAIS DE VOZ
          </div>


          <button
            className="community-voice-channel-button"
            onClick={() =>
              onStartCall({
                roomId:
                  `server-${selectedServer.id}-geral`,
                contextType:
                  "server",
                serverId:
                  selectedServer.id,
                title:
                  `${selectedServer.name} · Geral`,
                returnPage:
                  "community",
                startWithVideo:
                  false,
              })
            }
          >
            <Phone
              size={18}
            />
            Geral
          </button>

        </div>


        <CommunityAccount
          profile={profile}
          onEdit={
            onEditProfile
          }
        />

      </aside>


      {/* ===================================================
          CHAT
          =================================================== */}

      <main className="community-chat">

        <header>

          <h2>
            #{" "}
            {selectedChannel
              ?.name ||
              "geral"}
          </h2>


          <div className="page-search">

            <Search
              size={18}
            />

            Buscar mensagens

          </div>


          <button
            type="button"
            className="community-call-header-button"
            title="Entrar em chamada de voz"
            onClick={() =>
              onStartCall({
                roomId:
                  `server-${selectedServer.id}-geral`,
                contextType:
                  "server",
                serverId:
                  selectedServer.id,
                title:
                  `${selectedServer.name} · Geral`,
                returnPage:
                  "community",
                startWithVideo:
                  false,
              })
            }
          >
            <Phone
              size={20}
            />
          </button>


          <button
            type="button"
            className="community-call-header-button"
            title="Entrar em chamada de vídeo"
            onClick={() =>
              onStartCall({
                roomId:
                  `server-${selectedServer.id}-geral`,
                contextType:
                  "server",
                serverId:
                  selectedServer.id,
                title:
                  `${selectedServer.name} · Geral`,
                returnPage:
                  "community",
                startWithVideo:
                  true,
              })
            }
          >
            <Video
              size={20}
            />
          </button>


          <VolumeX
            size={21}
          />


          <button
            type="button"
            className="community-header-icon-button"
            onClick={onOpenSettings}
            title="Configurações"
          >
            <MoreHorizontal
              size={21}
            />
          </button>

        </header>


        <div className="community-messages">

          {messages.length ===
            0 && (

            <div className="community-channel-empty">

              <Hash
                size={40}
              />

              <strong>
                Início de #
                {
                  selectedChannel
                    ?.name
                }
              </strong>

              <span>
                Este é o começo deste canal.
              </span>

            </div>

          )}


          {messages.map(
  (message) => {

    const mine =
      message.senderId === user.uid;

    return (
      <div
        className={`dm-message ${
          mine ? "mine" : ""
        }`}
        key={message.id}
      >

        {!mine && (
          <CommunityAvatar
            user={message.author}
          />
        )}

        <div className="dm-message-content">

          <div className="dm-message-meta">

            <strong>
              {mine
                ? "Você"
                : message.author?.username ||
                  "Usuário"}
            </strong>

            <time>
              {formatMessageTime(
                message.createdAt
              )}
            </time>

          </div>

          {message.text && (
            <p>
              {message.text}
            </p>
          )}


          {message.mediaUrl && (
            <div
              className={`community-message-media ${
                message.mediaType ===
                "gif"
                  ? "gif"
                  : "image"
              }`}
            >
              <img
                src={
                  message.mediaUrl
                }
                alt={
                  message.mediaType ===
                  "gif"
                    ? "GIF enviado"
                    : "Imagem enviada"
                }
                loading="lazy"
              />
            </div>
          )}

        </div>

      </div>
    );
  }
)}

        </div>


        {/* COMPOSER */}

        {pendingPix.map(
          (request) => {
            const username =
              pixUsernames[
                request.initiatorId
              ] || "usuario";

            return (
              <div
                className="community-pix-p2p-card"
                key={request.id}
              >
                <div>
                  <strong>
                    {request.action === "charge"
                      ? "Cobrança P2P"
                      : "Pagamento P2P"}
                  </strong>

                  <span>
                    @{username} {request.action === "charge"
                      ? "está cobrando"
                      : "quer pagar"} {formatCommunityPixAmount(request.amountCents)} {request.action === "charge"
                        ? "de você."
                        : "para você."}
                  </span>
                </div>

                <div className="community-pix-actions">
                  <button
                    type="button"
                    className="deny"
                    onClick={() =>
                      answerServerPix(
                        request,
                        false
                      )
                    }
                    disabled={pixBusy}
                  >
                    Negar
                  </button>

                  <button
                    type="button"
                    className="confirm"
                    onClick={() =>
                      answerServerPix(
                        request,
                        true
                      )
                    }
                    disabled={pixBusy}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            );
          }
        )}


        {readyPix.map(
          (request) => {
            const receiverId =
              request.action === "charge"
                ? request.initiatorId
                : request.targetId;

            return (
              <CommunityPixReadyCard
                key={request.id}
                request={request}
                username={
                  pixUsernames[
                    receiverId
                  ] || "usuario"
                }
                busy={pixBusy}
                onPaid={
                  reportServerPixPaid
                }
              />
            );
          }
        )}


        {confirmReceiptPix.map(
          (request) => {
            const payerId =
              request.action === "charge"
                ? request.targetId
                : request.initiatorId;

            return (
              <CommunityPixConfirmReceiptCard
                key={request.id}
                request={request}
                username={
                  pixUsernames[
                    payerId
                  ] || "usuario"
                }
                busy={pixBusy}
                onConfirm={
                  confirmServerPixReceived
                }
              />
            );
          }
        )}


        {pixError && (
          <div className="community-pix-error">
            {pixError}
          </div>
        )}


        {pixMenuOpen && (
          <div className="community-pix-popover">
            {!pixMode ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPixMode(
                      "pay"
                    )
                  }
                >
                  Pagar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPixMode(
                      "charge"
                    )
                  }
                >
                  Cobrar
                </button>
              </>
            ) : (
              <>
                <div className="community-pix-popover-title">
                  <strong>
                    {pixMode === "pay"
                      ? "Pagar pessoa"
                      : "Cobrar pessoa"}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setPixMode(null)
                    }
                  >
                    ←
                  </button>
                </div>

                <input
                  value={pixTarget}
                  onChange={(e) =>
                    setPixTarget(
                      e.target.value
                    )
                  }
                  placeholder="@usuario"
                />

                <input
                  value={pixAmount}
                  onChange={(e) =>
                    setPixAmount(
                      e.target.value
                    )
                  }
                  placeholder="Valor, ex: 25,50"
                  inputMode="decimal"
                />

                <button
                  type="button"
                  className="community-pix-submit"
                  onClick={() =>
                    submitServerPix(
                      pixMode,
                      pixTarget,
                      pixAmount
                    )
                  }
                  disabled={pixBusy}
                >
                  {pixBusy
                    ? "Enviando..."
                    : "Enviar solicitação"}
                </button>
              </>
            )}

            <small>
              Comandos: .pagar @usuario 25,50 ou .cobrar @usuario 25,50
            </small>
          </div>
        )}


        {messageMedia &&
          messageMediaPreview && (

          <div className="community-media-preview">

            <div className="community-media-preview-image">

              <img
                src={
                  messageMediaPreview
                }
                alt="Prévia da mídia"
              />

              <button
                type="button"
                className="community-media-remove"
                title="Remover mídia"
                onClick={
                  removeMessageMedia
                }
              >
                ×
              </button>

            </div>


            <div className="community-media-preview-info">

              <strong>
                {messageMedia.type ===
                  "image/gif" ||
                messageMedia.name
                  .toLowerCase()
                  .endsWith(".gif")
                  ? "GIF"
                  : "Imagem"}
              </strong>

              <span>
                {messageMedia.name}
              </span>

            </div>

          </div>

        )}


        <div className="community-composer">

          <input
            ref={
              mediaInputRef
            }
            className="community-media-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) =>
              handleMessageMedia(
                e.target.files
                  ?.[0] ||
                null
              )
            }
          />


          <input
            value={
              messageText
            }
            onChange={(e) =>
              setMessageText(
                e.target.value
              )
            }
            onKeyDown={(e) => {

              if (
                e.key ===
                "Enter"
              ) {
                handleSendMessage();
              }

            }}
            placeholder={
              `Enviar mensagem para #${selectedChannel?.name || "geral"}`
            }
            disabled={
              sendingMessage
            }
          />


          <button
            type="button"
            title="Enviar imagem ou GIF"
            onClick={() =>
              mediaInputRef.current
                ?.click()
            }
            disabled={
              sendingMessage
            }
          >
            <Image
              size={22}
            />
          </button>


          <button
            type="button"
            title="Pagar ou cobrar"
            className={
              pixMenuOpen
                ? "pix-active"
                : ""
            }
            onClick={() => {
              setPixMenuOpen(
                !pixMenuOpen
              );
              setPixMode(null);
              setPixError("");
            }}
          >
            <CommunityPixLogo
              size={22}
            />
          </button>


          <button
            className="send"
            onClick={
              handleSendMessage
            }
            disabled={
              sendingMessage ||
              (
                !messageText.trim() &&
                !messageMedia
              )
            }
            title={
              sendingMessage
                ? "Enviando..."
                : "Enviar mensagem"
            }
          >
            <Send
              size={25}
            />
          </button>

        </div>

      </main>


      {/* ===================================================
          MODAIS
          =================================================== */}

      {createServerOpen && (
        <CreateServerModal
          name={
            serverName
          }
          setName={
            setServerName
          }
          setPhoto={
            setServerPhoto
          }
          setBanner={
            setServerBanner
          }
          saving={
            saving
          }
          error={
            error
          }
          onSubmit={
            handleCreateServer
          }
          onClose={() =>
            setCreateServerOpen(
              false
            )
          }
        />
      )}


      {joinServerOpen && (
        <JoinServerModal
          joinId={
            joinId
          }
          setJoinId={
            setJoinId
          }
          saving={
            saving
          }
          error={
            error
          }
          onSubmit={
            handleJoinServer
          }
          onClose={() =>
            setJoinServerOpen(
              false
            )
          }
        />
      )}


      {createChannelOpen && (
        <CommunityModal
          title="Criar canal"
          subtitle="Somente o dono do servidor pode criar canais."
          onClose={() =>
            setCreateChannelOpen(
              false
            )
          }
        >

          <label className="community-field">

            <span>
              Nome do canal
            </span>

            <input
              value={
                channelName
              }
              onChange={(e) =>
                setChannelName(
                  e.target.value
                )
              }
              placeholder="Ex: geral"
            />

          </label>


          {error && (
            <div className="community-error">
              {error}
            </div>
          )}


          <div className="community-modal-actions">

            <button
              className="community-secondary-button"
              onClick={() =>
                setCreateChannelOpen(
                  false
                )
              }
            >
              Cancelar
            </button>


            <button
              className="community-primary-button"
              onClick={
                handleCreateChannel
              }
              disabled={
                saving
              }
            >
              {saving
                ? "Criando..."
                : "Criar canal"}
            </button>

          </div>

        </CommunityModal>
      )}


      {settingsOpen && (
        <CommunityModal
          title="Personalizar servidor"
          subtitle="Altere a identidade visual da comunidade."
          onClose={() =>
            setSettingsOpen(
              false
            )
          }
        >

          <label className="community-field">

            <span>
              Nome
            </span>

            <input
              value={
                serverName
              }
              onChange={(e) =>
                setServerName(
                  e.target.value
                )
              }
            />

          </label>


          <label className="community-upload-field">

            <strong>
              Foto do servidor
            </strong>

            <span>
              PNG, JPG, WEBP ou GIF.
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) =>
                setServerPhoto(
                  e.target.files
                    ?.[0] ||
                  null
                )
              }
            />

          </label>


          <label className="community-upload-field">

            <strong>
              Banner
            </strong>

            <span>
              Recomendado: imagem horizontal.
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) =>
                setServerBanner(
                  e.target.files
                    ?.[0] ||
                  null
                )
              }
            />

          </label>


          {error && (
            <div className="community-error">
              {error}
            </div>
          )}


          <div className="community-modal-actions">

            <button
              className="community-secondary-button"
              onClick={() =>
                setSettingsOpen(
                  false
                )
              }
            >
              Cancelar
            </button>


            <button
              className="community-primary-button"
              disabled={
                saving
              }
              onClick={
                handleSaveServerSettings
              }
            >
              {saving
                ? "Salvando..."
                : "Salvar"}
            </button>

          </div>

        </CommunityModal>
      )}

    </div>
  );
}


/* =========================================================
   CRIAR SERVIDOR
   ========================================================= */

function CreateServerModal({
  name,
  setName,
  setPhoto,
  setBanner,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  name: string;

  setName:
    (
      value: string
    ) => void;

  setPhoto:
    (
      file:
        File | null
    ) => void;

  setBanner:
    (
      file:
        File | null
    ) => void;

  saving:
    boolean;

  error:
    string;

  onSubmit:
    () => void;

  onClose:
    () => void;
}) {
  return (
    <CommunityModal
      title="Criar servidor"
      subtitle="Crie um novo espaço no Elíseo."
      onClose={
        onClose
      }
    >

      <label className="community-field">

        <span>
          Nome do servidor
        </span>

        <input
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          placeholder="Minha comunidade"
        />

      </label>


      <label className="community-upload-field">

        <strong>
          Foto do servidor
        </strong>

        <span>
          Será exibida como ícone da comunidade.
        </span>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) =>
            setPhoto(
              e.target.files
                ?.[0] ||
              null
            )
          }
        />

      </label>


      <label className="community-upload-field">

        <strong>
          Banner
        </strong>

        <span>
          Imagem exibida no topo do servidor.
        </span>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) =>
            setBanner(
              e.target.files
                ?.[0] ||
              null
            )
          }
        />

      </label>


      {error && (
        <div className="community-error">
          {error}
        </div>
      )}


      <div className="community-modal-actions">

        <button
          className="community-secondary-button"
          onClick={
            onClose
          }
        >
          Cancelar
        </button>


        <button
          className="community-primary-button"
          disabled={
            saving
          }
          onClick={
            onSubmit
          }
        >
          {saving
            ? "Criando..."
            : "Criar servidor"}
        </button>

      </div>

    </CommunityModal>
  );
}


/* =========================================================
   ENTRAR NO SERVIDOR
   ========================================================= */

function JoinServerModal({
  joinId,
  setJoinId,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  joinId:
    string;

  setJoinId:
    (
      id: string
    ) => void;

  saving:
    boolean;

  error:
    string;

  onSubmit:
    () => void;

  onClose:
    () => void;
}) {
  return (
    <CommunityModal
      title="Entrar em servidor"
      subtitle="Cole o ID fornecido pelo dono da comunidade."
      onClose={
        onClose
      }
    >

      <label className="community-field">

        <span>
          ID do servidor
        </span>

        <input
          value={
            joinId
          }
          onChange={(e) =>
            setJoinId(
              e.target.value
            )
          }
          placeholder="Ex: a7TmKf..."
        />

      </label>


      {error && (
        <div className="community-error">
          {error}
        </div>
      )}


      <div className="community-modal-actions">

        <button
          className="community-secondary-button"
          onClick={
            onClose
          }
        >
          Cancelar
        </button>


        <button
          className="community-primary-button"
          onClick={
            onSubmit
          }
          disabled={
            saving
          }
        >
          {saving
            ? "Entrando..."
            : "Entrar"}
        </button>

      </div>

    </CommunityModal>
  );
}


/* =========================================================
   HORA
   ========================================================= */

function formatMessageTime(
  timestamp: any
) {
  if (
    !timestamp
      ?.toDate
  ) {
    return "Agora";
  }


  return timestamp
    .toDate()
    .toLocaleTimeString(
      "pt-BR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
}


export default Community;