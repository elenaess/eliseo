import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  File,
  FileImage,
  Folder,
  FolderPlus,
  Gamepad2,
  HardDrive,
  Hash,
  Heart,
  HelpCircle,
  Home,
  Image,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Upload,
  User,
  Users,
  Video,
  VolumeX,
  Pencil,
} from "lucide-react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
} from "./firebase";

import Login from "./login";
import Feed from "./Feed";
import ProfileEditor from "./ProfileEditor";
import Community from "./Community";
import CallRoom, {
  type EliseoCallDescriptor,
} from "./CallRoom";

import { QRCodeSVG } from "qrcode.react";
import { buildPixPayload } from "./pix";

import {
  createUserProfile,
  getOrCreateConversation,
  getUserById,
  listenToMessages,
  listenToUserConversations,
  markConversationRead,
  searchUsers,
  listenToUserServers,
  type EliseoServer,
  sendFirestoreMessage,
  createPixRequest,
  getMyPixKey,
  getPixRequestSecret,
  listenToIncomingPixRequests,
  listenToOutgoingPixRequests,
  respondToPixRequest,
  markPixPaymentReported,
  confirmPixPaymentReceived,
  saveMyPixKey,
  createDriveFolder,
  createDriveFileRecord,
  listenToDriveFiles,
  listenToDriveFolders,
  listenToDriveUsage,
  releaseDriveBytes,
  reserveDriveBytes,
  ELISEO_DRIVE_LIMIT_BYTES,
  type EliseoDriveFile,
  type EliseoDriveFolder,
  type ConversationListItem,
  type EliseoPixAction,
  type EliseoPixRequest,
  type EliseoUser,
  type FirestoreMessage,
} from "./firestore";

import {
  deleteStoredFile,
  uploadDriveFile,
  uploadGif,
  uploadPostImage,
} from "./storage";

import "./App.css";


type Page =
  | "home"
  | "feed"
  | "messages"
  | "community"
  | "drive"
  | "profile"
  | "settings"
  | "customize"
  | "finance"
  | "call";


function formatTime(timestamp: any) {
  if (!timestamp?.toDate) {
    return "";
  }

  const date =
    timestamp.toDate();

  return date.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


/* =========================================================
   LOGO
   ========================================================= */

function EliseoLogo() {
  return (
    <img
      src="/eliseo.png"
      alt="Elíseo"
      className="eliseo-logo-image"
    />
  );
}


/* =========================================================
   AVATAR
   ========================================================= */

function Avatar({
  user,
  size = "normal",
}: {
  user:
    EliseoUser | null;

  size?:
    | "small"
    | "normal"
    | "large";
}) {
  return (
    <div
      className={`ui-avatar ${size}`}
    >
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
   TOPBAR
   ========================================================= */

function TopBar({
  page,
  setPage,
  servers,
  onJoinCommunity,
}: {
  page: Page;

  setPage:
    (page: Page) => void;

  servers:
    EliseoServer[];

  onJoinCommunity:
    () => void;
}) {
  return (
    <header className="topbar">

      <button
        className="top-logo-button"
        onClick={() =>
          setPage("home")
        }
      >
        <EliseoLogo />
      </button>

      <div className="top-divider" />

      <nav className="top-main-nav">

        <button
          className={
            page === "feed"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("feed")
          }
          title="Feed"
        >
          <Home size={22} />
        </button>

        <button
          className={
            page === "drive"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("drive")
          }
        >
          <BookOpen size={22} />
        </button>

        <button
          className={
            page === "messages"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("messages")
          }
        >
          <MessageCircle size={22} />
        </button>

      </nav>

      <div className="top-divider" />

      <div className="top-spaces">

        {servers.map(
          (server) => (
            <button
              key={server.id}
              className="space-thumb server-space"
              title={server.name}
              onClick={() =>
                setPage("community")
              }
            >

              {server.photo ? (
                <img
                  src={server.photo}
                  alt={server.name}
                />
              ) : (
                <span>
                  {server.name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}

            </button>
          )
        )}

        <button
          className="add-space"
          title="Entrar em comunidade"
          onClick={
            onJoinCommunity
          }
        >
          <Plus size={22} />
        </button>

      </div>

      <div className="top-spacer" />

      <button className="top-action">
        <HelpCircle size={23} />
      </button>

      <button className="top-action notification">
        <Bell size={23} />
        <span />
      </button>

    </header>
  );
}

/* =========================================================
   ACCOUNT CARD
   ========================================================= */

function AccountCard({
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

          <Avatar
            user={profile}
            size="large"
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
          <Pencil size={15} />
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
   USER SIDEBAR
   ========================================================= */

function UserSidebar({
  page,
  setPage,
  profile,
  onEdit,
}: {
  page: Page;

  setPage:
    (page: Page) => void;

  profile:
    EliseoUser | null;

  onEdit:
    () => void;
}) {
  return (
    <aside className="user-sidebar">

      <div className="sidebar-art">
        <div className="art-block a" />
        <div className="art-block b" />
        <div className="art-block c" />
        <div className="art-block d" />
        <div className="art-circle" />
      </div>


      <nav className="sidebar-nav">

        <button
          className={
            page === "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("profile")
          }
        >
          <User size={23} />
          <span>
            Perfil
          </span>
        </button>


        <button
          className={
            page === "customize"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage(
              "customize"
            )
          }
        >
          <Palette size={23} />
          <span>
            Personalizar
          </span>
        </button>


        <button
          className={
            page === "drive"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("drive")
          }
        >
          <Folder size={23} />
          <span>
            Pastas
          </span>
        </button>


        <button
          className={
            page === "feed"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("feed")
          }
        >
          <Home size={23} />
          <span>
            Feed
          </span>
        </button>


        <button
          className={
            page === "settings"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("settings")
          }
        >
          <Settings size={23} />
          <span>
            Configurações
          </span>
        </button>

      </nav>


      <AccountCard
        profile={profile}
        onEdit={onEdit}
      />

    </aside>
  );
}


/* =========================================================
   HOME
   ========================================================= */

function HomeView({
  profile,
  setPage,
}: {
  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;
}) {
  return (
    <div className="home-view">

      <UserSidebar
        page="home"
        setPage={setPage}
        profile={profile}
        onEdit={() =>
          setPage("profile")
        }
      />

      <main className="content-panel">

        <div className="content-title-row">
          <h1>
            Elíseo
          </h1>
        </div>

        <div className="dashboard-grid">

          <button
            onClick={() =>
              setPage("profile")
            }
          >
            <div className="dash-icon blue">
              <User size={34} />
            </div>

            <strong>
              Perfil
            </strong>

            <span>
              Gerencie suas informações pessoais e como você se apresenta.
            </span>
          </button>


          <button
            onClick={() =>
              setPage(
                "customize"
              )
            }
          >
            <div className="dash-icon purple">
              <Palette size={34} />
            </div>

            <strong>
              Personalização
            </strong>

            <span>
              Customize temas, cores, ícones e aparência.
            </span>
          </button>


          <button
            onClick={() =>
              setPage(
                "community"
              )
            }
          >
            <div className="dash-icon cyan">
              <Users size={34} />
            </div>

            <strong>
              Comunidades
            </strong>

            <span>
              Gerencie comunidades, cargos e permissões.
            </span>
          </button>


          <button
            onClick={() =>
              setPage("feed")
            }
          >
            <div className="dash-icon green">
              <File size={34} />
            </div>

            <strong>
              Feed
            </strong>

            <span>
              Personalize o conteúdo que você vê no seu feed.
            </span>
          </button>


          <button
            onClick={() =>
              setPage(
                "messages"
              )
            }
          >
            <div className="dash-icon coral">
              <MessageCircle
                size={34}
              />
            </div>

            <strong>
              Social
            </strong>

            <span>
              Conecte-se com amigos e gerencie suas interações.
            </span>
          </button>


          <button
            onClick={() =>
              setPage(
                "finance"
              )
            }
          >
            <div className="dash-icon yellow">
              <CircleDollarSign
                size={34}
              />
            </div>

            <strong>
              Financeiro
            </strong>

            <span>
              Pagamentos, saldo e histórico de transações.
            </span>
          </button>


          <button>
            <div className="dash-icon cyan">
              <Settings
                size={34}
              />
            </div>

            <strong>
              Integrações
            </strong>

            <span>
              Conecte serviços externos ao Elíseo.
            </span>
          </button>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   DRIVE
   ========================================================= */

function formatDriveBytes(
  bytes: number
) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    bytes /
    Math.pow(1024, index);

  return `${value.toFixed(
    index >= 3 ? 2 : 1
  )} ${units[index]}`;
}

function driveFileType(
  file: EliseoDriveFile
) {
  const contentType =
    file.contentType || "";

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "";

  if (
    contentType.startsWith(
      "image/"
    )
  ) {
    return "image";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (
    ["xlsx", "xls", "csv"]
      .includes(extension)
  ) {
    return "sheet";
  }

  if (
    ["ppt", "pptx"]
      .includes(extension)
  ) {
    return "presentation";
  }

  if (
    ["doc", "docx", "txt", "odt"]
      .includes(extension)
  ) {
    return "word";
  }

  if (
    ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "html", "css", "json"]
      .includes(extension)
  ) {
    return "code";
  }

  return "generic";
}

function DriveView({
  user,
  profile,
  setPage,
}: {
  user:
    NonNullable<
      typeof auth.currentUser
    >;

  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;
}) {
  const [folders, setFolders] =
    useState<EliseoDriveFolder[]>([]);

  const [files, setFiles] =
    useState<EliseoDriveFile[]>([]);

  const [usedBytes, setUsedBytes] =
    useState(0);

  const [currentFolderId, setCurrentFolderId] =
    useState<string | null>(null);

  const [searchText, setSearchText] =
    useState("");

  const [newFolderOpen, setNewFolderOpen] =
    useState(false);

  const [newFolderName, setNewFolderName] =
    useState("");

  const [driveBusy, setDriveBusy] =
    useState(false);

  const [driveError, setDriveError] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(() => {
    const stopFolders =
      listenToDriveFolders(
        user.uid,
        setFolders
      );

    const stopFiles =
      listenToDriveFiles(
        user.uid,
        setFiles
      );

    const stopUsage =
      listenToDriveUsage(
        user.uid,
        setUsedBytes
      );

    return () => {
      stopFolders();
      stopFiles();
      stopUsage();
    };
  }, [user.uid]);

  const currentFolder =
    currentFolderId
      ? folders.find(
          (folder) =>
            folder.id ===
            currentFolderId
        ) || null
      : null;

  const visibleFolders =
    folders.filter(
      (folder) =>
        folder.parentId ===
          currentFolderId &&
        folder.name
          .toLowerCase()
          .includes(
            searchText
              .trim()
              .toLowerCase()
          )
    );

  const visibleFiles =
    files.filter(
      (file) =>
        file.folderId ===
          currentFolderId &&
        file.name
          .toLowerCase()
          .includes(
            searchText
              .trim()
              .toLowerCase()
          )
    );

  const usagePercent =
    Math.min(
      100,
      (usedBytes /
        ELISEO_DRIVE_LIMIT_BYTES) *
        100
    );

  function goUpFolder() {
    if (!currentFolder) {
      return;
    }

    setCurrentFolderId(
      currentFolder.parentId
    );
  }

  async function handleCreateFolder() {
    const cleanName =
      newFolderName.trim();

    if (!cleanName) {
      setDriveError(
        "Digite um nome para a pasta."
      );
      return;
    }

    try {
      setDriveBusy(true);
      setDriveError("");

      await createDriveFolder(
        user.uid,
        cleanName,
        currentFolderId
      );

      setNewFolderName("");
      setNewFolderOpen(false);
    } catch (caught) {
      setDriveError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar a pasta."
      );
    } finally {
      setDriveBusy(false);
    }
  }

  async function handleDriveUpload(
    selectedFiles:
      FileList | null
  ) {
    if (
      !selectedFiles ||
      selectedFiles.length === 0
    ) {
      return;
    }

    try {
      setDriveBusy(true);
      setDriveError("");

      for (
        const file of
        Array.from(selectedFiles)
      ) {
        if (
          file.size >
          ELISEO_DRIVE_LIMIT_BYTES
        ) {
          throw new Error(
            `${file.name} ultrapassa o limite total de 5 GB.`
          );
        }

        let reserved = false;
        let uploadedKey = "";

        try {
          await reserveDriveBytes(
            user.uid,
            file.size
          );

          reserved = true;

          const uploaded =
            await uploadDriveFile(
              user.uid,
              file
            );

          uploadedKey =
            uploaded.key;

          await createDriveFileRecord(
            user.uid,
            currentFolderId,
            {
              name: file.name,
              key: uploaded.key,
              url: uploaded.url,
              size:
                uploaded.size ||
                file.size,
              contentType:
                uploaded.contentType ||
                file.type ||
                "application/octet-stream",
            }
          );
        } catch (caught) {
          if (uploadedKey) {
            try {
              await deleteStoredFile(
                uploadedKey
              );
            } catch {
              // A falha de limpeza não esconde o erro principal.
            }
          }

          if (reserved) {
            try {
              await releaseDriveBytes(
                user.uid,
                file.size
              );
            } catch {
              // Mantém o erro original.
            }
          }

          throw caught;
        }
      }
    } catch (caught) {
      setDriveError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o arquivo."
      );
    } finally {
      setDriveBusy(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="main-layout">

      <UserSidebar
        page="drive"
        setPage={setPage}
        profile={profile}
        onEdit={() =>
          setPage("profile")
        }
      />

      <main className="content-panel drive-panel">

        <header className="section-top drive-topbar">
          <div className="drive-breadcrumb">
            {currentFolder && (
              <button
                type="button"
                className="drive-back-button"
                onClick={goUpFolder}
                title="Voltar"
              >
                <ArrowLeft size={19} />
              </button>
            )}

            <div>
              <strong>
                Pasta 1
              </strong>

              {currentFolder && (
                <>
                  <span>/</span>
                  <b>
                    {currentFolder.name}
                  </b>
                </>
              )}
            </div>
          </div>

          <label className="page-search drive-search">
            <Search size={18} />
            <input
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="Buscar arquivos"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="drive-file-input"
            onChange={(event) =>
              handleDriveUpload(
                event.target.files
              )
            }
          />

          <button
            type="button"
            className="drive-header-action"
            onClick={() => {
              setDriveError("");
              setNewFolderOpen(true);
            }}
            disabled={driveBusy}
          >
            <FolderPlus size={19} />
            Nova pasta
          </button>

          <button
            type="button"
            className="drive-header-action primary"
            onClick={() =>
              fileInputRef.current
                ?.click()
            }
            disabled={driveBusy}
          >
            <Upload size={19} />
            {driveBusy
              ? "Enviando..."
              : "Enviar arquivo"}
          </button>

          <button
            type="button"
            className="header-icon-button"
            onClick={() =>
              setPage("settings")
            }
            title="Configurações"
          >
            <MoreHorizontal
              size={21}
            />
          </button>
        </header>

        <div className="drive-storage-card">
          <div className="drive-storage-icon">
            <HardDrive size={22} />
          </div>

          <div className="drive-storage-copy">
            <div>
              <strong>
                Seu Drive
              </strong>

              <span>
                {formatDriveBytes(
                  usedBytes
                )} de 5 GB usados
              </span>
            </div>

            <div className="drive-storage-track">
              <i
                style={{
                  width:
                    `${usagePercent}%`,
                }}
              />
            </div>
          </div>

          <b>
            {usagePercent.toFixed(1)}%
          </b>
        </div>

        {newFolderOpen && (
          <div className="drive-create-folder-bar">
            <FolderPlus size={20} />

            <input
              autoFocus
              value={newFolderName}
              onChange={(event) =>
                setNewFolderName(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  handleCreateFolder();
                }

                if (
                  event.key === "Escape"
                ) {
                  setNewFolderOpen(
                    false
                  );
                }
              }}
              placeholder="Nome da nova pasta"
            />

            <button
              type="button"
              onClick={handleCreateFolder}
              disabled={driveBusy}
            >
              Criar
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => {
                setNewFolderOpen(false);
                setNewFolderName("");
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {driveError && (
          <div className="drive-error">
            {driveError}
          </div>
        )}

        <div className="drive-grid">
          {visibleFolders.map(
            (folder) => (
              <div
                role="button"
                tabIndex={0}
                className="folder-card drive-folder-card"
                key={folder.id}
                onClick={() => {
                  setCurrentFolderId(
                    folder.id
                  );
                  setSearchText("");
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    setCurrentFolderId(
                      folder.id
                    );
                    setSearchText("");
                  }
                }}
              >
                <button
                  type="button"
                  className="drive-card-menu"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPage("settings");
                  }}
                  title="Configurações"
                >
                  <MoreHorizontal
                    size={20}
                  />
                </button>

                <Folder
                  className="folder-blue"
                  size={72}
                  fill="currentColor"
                />

                <strong>
                  {folder.name}
                </strong>

                <span>
                  Pasta
                </span>

                <small>
                  Abrir pasta
                </small>
              </div>
            )
          )}

          {visibleFiles.map(
            (file) => (
              <DriveFileCard
                key={file.id}
                file={file}
                onOpenSettings={() =>
                  setPage("settings")
                }
              />
            )
          )}
        </div>

        {visibleFolders.length === 0 &&
          visibleFiles.length === 0 && (
          <div className="drive-empty-state">
            <Folder size={42} />

            <strong>
              {searchText
                ? "Nada encontrado"
                : "Esta pasta está vazia"}
            </strong>

            <span>
              Crie uma pasta ou envie arquivos para o seu Drive.
            </span>
          </div>
        )}

      </main>

    </div>
  );
}


function DriveFileCard({
  file,
  onOpenSettings,
}: {
  file: EliseoDriveFile;
  onOpenSettings:
    () => void;
}) {
  const type =
    driveFileType(file);

  return (
    <div
      className="file-card drive-real-file"
      onDoubleClick={() =>
        window.open(
          file.url,
          "_blank",
          "noopener,noreferrer"
        )
      }
    >
      <button
        type="button"
        className="drive-card-menu"
        onClick={onOpenSettings}
        title="Configurações"
      >
        <MoreHorizontal
          size={19}
        />
      </button>

      <div
        className={`file-icon ${type}`}
      >
        {type === "image" ? (
          <FileImage
            size={37}
          />
        ) : (
          <File size={37} />
        )}
      </div>

      <div className="file-text">
        <strong>
          {file.name}
        </strong>

        <span>
          {formatDriveBytes(
            file.size
          )}
        </span>

        <small>
          Clique duas vezes para abrir
        </small>
      </div>
    </div>
  );
}


/* =========================================================
   PROFILE
   ========================================================= */

function ProfileView({
  profile,
  setPage,
  onEdit,
}: {
  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;

  onEdit:
    () => void;
}) {
  return (
    <div className="main-layout">

      <UserSidebar
        page="profile"
        setPage={setPage}
        profile={profile}
        onEdit={onEdit}
      />

      <main className="content-panel profile-page">

        <header className="section-top">
          <h2>
            Editar Perfil
          </h2>

          <button
            className="primary-button"
            onClick={onEdit}
          >
            Salvar alterações
          </button>

          <button
            type="button"
            className="header-icon-button"
            onClick={() =>
              setPage("settings")
            }
            title="Configurações"
          >
            <MoreHorizontal
              size={21}
            />
          </button>
        </header>


        <div className="profile-hero">

          <div className="profile-banner" />

          <div className="profile-gradient">

            <div className="hero-avatar">

              <Avatar
                user={profile}
                size="large"
              />

              <button
                onClick={onEdit}
              >
                <Pencil
                  size={18}
                />
              </button>

            </div>


            <h1>
              {profile?.username ||
                "Elena"}
            </h1>

            <h3>
              @
              {profile?.username ||
                "elena"}
            </h3>

            <p>
              {profile?.bio ||
                "Personalize sua bio no Elíseo."}
            </p>

            <span>
              Entrou no Elíseo
            </span>

          </div>

        </div>


        <div className="music-card-large">

          <div className="music-service">
            ▶
          </div>

          <div>
            <small>
              ESCUTANDO AGORA
            </small>

            <strong>
              Midnight City
            </strong>

            <span>
              M83
            </span>
          </div>

          <div className="music-progress">
            <span>
              1:24
            </span>

            <div>
              <i />
            </div>

            <span>
              4:03
            </span>
          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   CUSTOMIZATION
   ========================================================= */

function CustomizeView({
  profile,
  setPage,
}: {
  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;
}) {
  return (
    <div className="main-layout">

      <UserSidebar
        page="customize"
        setPage={setPage}
        profile={profile}
        onEdit={() =>
          setPage("profile")
        }
      />

      <main className="content-panel">

        <div className="content-title-row">
          <h1>
            Personalização
          </h1>
        </div>


        <div className="settings-list">

          <SettingRow
            icon={
              <Palette />
            }
            title="Cor do aplicativo"
            subtitle="Escolha a cor principal do aplicativo."
          >
            <div className="color-options">
              <i className="black" />
              <i className="gray" />
              <i className="white" />

              <div className="logo-theme dark">
                <EliseoLogo />
              </div>

              <div className="logo-theme light active">
                <EliseoLogo />
              </div>
            </div>
          </SettingRow>


          <SettingRow
            icon={
              <MessageCircle />
            }
            title="Tema do chat"
            subtitle="Escolha o tema das suas conversas."
          />


          <SettingRow
            icon={
              <span className="text-icon">
                Tᵀ
              </span>
            }
            title="Fonte do aplicativo"
            subtitle="Altere o tamanho e o estilo da fonte."
          />


          <SettingRow
            icon={
              <Menu />
            }
            title="Layout"
            subtitle="Personalize como os conteúdos são exibidos."
          />


          <SettingRow
            icon={
              <Bell />
            }
            title="Sons e notificações"
            subtitle="Configure sons, vibrações e alertas."
          />


          <SettingRow
            icon={
              <Image />
            }
            title="Plano de fundo"
            subtitle="Escolha ou envie um plano de fundo personalizado."
          />


          <SettingRow
            icon={
              <span className="emoji-icon">
                ☻
              </span>
            }
            title="Emojis e reações"
            subtitle="Personalize o estilo das reações."
          />

        </div>

      </main>

    </div>
  );
}


function SettingRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon:
    React.ReactNode;

  title: string;

  subtitle: string;

  children?:
    React.ReactNode;
}) {
  return (
    <div className="setting-row">

      <div className="setting-icon">
        {icon}
      </div>

      <div className="setting-text">
        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>
      </div>

      {children || (
        <span className="setting-default">
          Padrão ›
        </span>
      )}

    </div>
  );
}


/* =========================================================
   SETTINGS
   ========================================================= */

function SettingsView({
  profile,
  setPage,
}: {
  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;
}) {
  return (
    <div className="main-layout">
      <UserSidebar
        page="settings"
        setPage={setPage}
        profile={profile}
        onEdit={() =>
          setPage("profile")
        }
      />

      <main className="content-panel settings-view">
        <div className="content-title-row">
          <h1>
            Configurações
          </h1>
        </div>

        <div className="settings-list">
          <button
            type="button"
            className="setting-row settings-link-row"
            onClick={() =>
              setPage("customize")
            }
          >
            <div className="setting-icon">
              <Palette size={25} />
            </div>

            <div className="setting-text">
              <strong>
                Aparência e personalização
              </strong>
              <span>
                Tema, cores, fonte e aparência do Elíseo.
              </span>
            </div>
            <span className="setting-default">
              ›
            </span>
          </button>

          <button
            type="button"
            className="setting-row settings-link-row"
            onClick={() =>
              setPage("profile")
            }
          >
            <div className="setting-icon">
              <User size={25} />
            </div>
            <div className="setting-text">
              <strong>
                Conta e perfil
              </strong>
              <span>
                Informações da sua conta e identidade no app.
              </span>
            </div>
            <span className="setting-default">
              ›
            </span>
          </button>

          <button
            type="button"
            className="setting-row settings-link-row"
            onClick={() =>
              setPage("finance")
            }
          >
            <div className="setting-icon">
              <CircleDollarSign size={25} />
            </div>
            <div className="setting-text">
              <strong>
                PIX e pagamentos
              </strong>
              <span>
                Chave PIX e recursos P2P.
              </span>
            </div>
            <span className="setting-default">
              ›
            </span>
          </button>

          <div className="setting-row">
            <div className="setting-icon">
              <Bell size={25} />
            </div>
            <div className="setting-text">
              <strong>
                Sons e notificações
              </strong>
              <span>
                Controles gerais de alertas do aplicativo.
              </span>
            </div>
            <span className="setting-default">
              Padrão
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}


/* =========================================================
   FINANCE
   ========================================================= */

function FinanceView({
  profile,
  setPage,
}: {
  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;
}) {
  const [pixKey, setPixKey] =
    useState("");

  const [pixSaving, setPixSaving] =
    useState(false);

  const [pixStatus, setPixStatus] =
    useState("");

  useEffect(() => {
    if (!profile?.uid) {
      return;
    }

    getMyPixKey(profile.uid)
      .then((key) => {
        setPixKey(key);
      })
      .catch(() => {});
  }, [profile?.uid]);

  async function savePixKey() {
    if (!profile?.uid) {
      return;
    }

    try {
      setPixSaving(true);
      setPixStatus("");

      await saveMyPixKey(
        profile.uid,
        pixKey
      );

      setPixStatus(
        "Chave Pix salva com privacidade."
      );
    } catch (caught) {
      setPixStatus(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar a chave Pix."
      );
    } finally {
      setPixSaving(false);
    }
  }

  return (
    <div className="main-layout">

      <UserSidebar
        page="finance"
        setPage={setPage}
        profile={profile}
        onEdit={() =>
          setPage("profile")
        }
      />

      <main className="content-panel">

        <div className="content-title-row">
          <h1>
            Financeiro
          </h1>
        </div>


        <div className="finance-list">

          <div className="finance-row">

            <div className="finance-icon cyan">
              ◆
            </div>

            <div>
              <strong>
                PIX P2P do Elíseo
              </strong>

              <span>
                Cobranças e pagamentos exigem confirmação da pessoa marcada.
              </span>
            </div>

            <div className="pix-private-badge">
              P2P
            </div>

          </div>


          <div className="finance-row input-row pix-key-row">

            <div className="finance-icon blue">
              🔑
            </div>

            <div>
              <strong>
                Sua chave PIX
              </strong>

              <span>
                Ela fica em um perfil financeiro privado e só é revelada após uma confirmação P2P.
              </span>

              <div className="pix-key-controls">
                <input
                  value={pixKey}
                  onChange={(e) =>
                    setPixKey(
                      e.target.value
                    )
                  }
                  placeholder="Email, CPF, telefone ou chave aleatória"
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="finance-save-pix"
                  onClick={savePixKey}
                  disabled={
                    pixSaving ||
                    !pixKey.trim()
                  }
                >
                  {pixSaving
                    ? "Salvando..."
                    : "Salvar"}
                </button>
              </div>

              {pixStatus && (
                <small className="pix-finance-status">
                  {pixStatus}
                </small>
              )}
            </div>

          </div>


          <div className="finance-row input-row">

            <div className="finance-icon purple">
              ▣
            </div>

            <div>
              <strong>
                Confirmação P2P
              </strong>

              <span>
                Nenhuma chave é exibida para a outra pessoa antes de ela aceitar a solicitação.
              </span>
            </div>

          </div>


          <div className="finance-row">

            <div className="finance-icon yellow">
              <Users size={25} />
            </div>

            <div>
              <strong>
                Chats e comunidades
              </strong>

              <span>
                Use o botão de dinheiro nas DMs ou .pagar / .cobrar nos canais.
              </span>
            </div>

            <div className="fake-select">
              Ativo
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   CALL
   ========================================================= */

function CallView({
  user,
  profile,
  setPage,
  call,
  onFinish,
}: {
  user:
    NonNullable<
      typeof auth.currentUser
    >;

  profile:
    EliseoUser | null;

  setPage:
    (page: Page) => void;

  call:
    EliseoCallDescriptor | null;

  onFinish:
    () => void;
}) {
  if (!call) {
    return (
      <div className="main-layout">

        <UserSidebar
          page="call"
          setPage={setPage}
          profile={profile}
          onEdit={() =>
            setPage("profile")
          }
        />

        <main className="content-panel">

          <div className="empty-state">
            <Video size={44} />

            <strong>
              Nenhuma chamada ativa
            </strong>

            <span>
              Inicie uma chamada em uma DM ou servidor.
            </span>
          </div>

        </main>

      </div>
    );
  }

  return (
    <div className="main-layout">

      <UserSidebar
        page="call"
        setPage={setPage}
        profile={profile}
        onEdit={() =>
          setPage("profile")
        }
      />

      <CallRoom
        user={user}
        profile={profile}
        call={call}
        onLeave={
          onFinish
        }
        onOpenSettings={() =>
          setPage("settings")
        }
      />

    </div>
  );
}


function parsePixAmount(
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


function formatPixAmount(
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


function PixReadyCard({
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
    <div className="pix-ready-card pix-qr-card">
      <div className="pix-qr-copy">
        <strong>
          PIX pronto para pagar
        </strong>

        <span>
          Pague {formatPixAmount(request.amountCents)} para @{username}.
        </span>

        <code>
          {pixPayload ||
            "Gerando Pix Copia e Cola..."}
        </code>

        <div className="pix-ready-actions">
          <button
            type="button"
            onClick={copyPix}
            disabled={!pixPayload || busy}
          >
            {copyLabel}
          </button>

          <button
            type="button"
            className="pix-paid-button"
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

      <div className="pix-qr-box">
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


function PixConfirmReceiptCard({
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
    <div className="pix-p2p-card pix-payment-check-card">
      <div>
        <strong>
          Confirmar recebimento
        </strong>

        <span>
          @{username} marcou {formatPixAmount(request.amountCents)} como pago. O valor já caiu na sua conta?
        </span>
      </div>

      <div className="pix-p2p-actions">
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
   MESSAGES
   ========================================================= */

function MessagesView({
  user,
  profile,
  conversations,
  selectedConversationId,
  setSelectedConversationId,
  messages,
  messageText,
  setMessageText,
  searchText,
  setSearchText,
  searchResults,
  openDM,
  sendMessage,
  messagesEndRef,
  messageMedia,
  messageMediaPreview,
  sendingMessage,
  dmMediaInputRef,
  handleMessageMedia,
  removeMessageMedia,
  startCall,
  openSettings,
}: any) {
  const selected =
    conversations.find(
      (
        conversation:
          ConversationListItem
      ) =>
        conversation.id ===
        selectedConversationId
    );

  const [pixMenuOpen, setPixMenuOpen] =
    useState(false);

  const [pixMode, setPixMode] =
    useState<EliseoPixAction | null>(null);

  const [pixAmount, setPixAmount] =
    useState("");

  const [pixIncoming, setPixIncoming] =
    useState<EliseoPixRequest[]>([]);

  const [pixOutgoing, setPixOutgoing] =
    useState<EliseoPixRequest[]>([]);

  const [pixBusy, setPixBusy] =
    useState(false);

  const [pixError, setPixError] =
    useState("");

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

  const pendingPix =
    pixIncoming.filter(
      (request) =>
        request.status === "pending" &&
        request.contextType === "dm" &&
        request.conversationId ===
          selectedConversationId
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
          request.contextType === "dm" &&
          request.conversationId ===
            selectedConversationId
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
          request.contextType === "dm" &&
          request.conversationId ===
            selectedConversationId
        );
      }
    );

  async function submitDmPix() {
    if (
      !selected ||
      !pixMode ||
      pixBusy
    ) {
      return;
    }

    const amountCents =
      parsePixAmount(
        pixAmount
      );

    if (!amountCents) {
      setPixError(
        "Digite um valor válido."
      );
      return;
    }

    try {
      setPixBusy(true);
      setPixError("");

      await createPixRequest({
        initiatorId:
          user.uid,
        targetId:
          selected.otherUser.uid,
        action:
          pixMode,
        amountCents,
        contextType: "dm",
        conversationId:
          selectedConversationId,
      });

      setPixAmount("");
      setPixMode(null);
      setPixMenuOpen(false);
    } catch (caught) {
      setPixError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar a solicitação PIX."
      );
    } finally {
      setPixBusy(false);
    }
  }

  async function answerPix(
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


  async function reportPixPaid(
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


  async function confirmPixReceived(
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


  return (
    <div className="messages-layout">

      <aside className="dm-sidebar">

        <div className="dm-search">
          <Search size={18} />
          <input
            placeholder="Buscar conversas"
            value={searchText}
            onChange={(e) =>
              setSearchText(
                e.target.value
              )
            }
          />
          <Menu size={20} />
        </div>


        {searchText &&
          searchResults.map(
            (
              result:
                EliseoUser
            ) => (
              <button
                className="dm-item"
                onClick={() =>
                  openDM(result)
                }
              >
                <Avatar
                  user={result}
                />

                <div>
                  <strong>
                    {result.username}
                  </strong>

                  <span>
                    Abrir conversa
                  </span>
                </div>
              </button>
            )
          )}


        {conversations.map(
          (
            conversation:
              ConversationListItem
          ) => (
            <button
              key={
                conversation.id
              }
              className={`dm-item ${
                conversation.id ===
                selectedConversationId
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setSelectedConversationId(
                  conversation.id
                )
              }
            >

              <Avatar
                user={
                  conversation.otherUser
                }
              />

              <div>
                <strong>
                  {
                    conversation
                      .otherUser
                      .username
                  }
                </strong>

                <span>
                  {conversation.lastMessage ||
                    "Nova conversa"}
                </span>
              </div>

              <time>
                {formatTime(
                  conversation.lastMessageAt
                )}
              </time>

            </button>
          )
        )}


        <AccountCard
          profile={profile}
          onEdit={() => {}}
        />

      </aside>


      <main className="dm-chat">

        {selected ? (
          <>

            <header>

              <Avatar
                user={
                  selected.otherUser
                }
              />

              <div>
                <strong>
                  {
                    selected
                      .otherUser
                      .username
                  }
                </strong>

                <span>
                  ● Online
                </span>
              </div>

              <div className="dm-header-spacer" />

              <div className="page-search">
                <Search
                  size={18}
                />
                Buscar mensagens
              </div>

              <button
                type="button"
                className="dm-call-header-button"
                title="Iniciar chamada de voz"
                onClick={() =>
                  startCall({
                    roomId:
                      `dm-${selectedConversationId}`,
                    contextType:
                      "dm",
                    conversationId:
                      selectedConversationId,
                    title:
                      `DM com ${selected.otherUser.username}`,
                    returnPage:
                      "messages",
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
                className="dm-call-header-button"
                title="Iniciar chamada de vídeo"
                onClick={() =>
                  startCall({
                    roomId:
                      `dm-${selectedConversationId}`,
                    contextType:
                      "dm",
                    conversationId:
                      selectedConversationId,
                    title:
                      `DM com ${selected.otherUser.username}`,
                    returnPage:
                      "messages",
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
                className="header-icon-button"
                onClick={openSettings}
                title="Configurações"
              >
                <MoreHorizontal
                  size={21}
                />
              </button>

            </header>


            <div className="dm-messages">

              <div className="today-separator">
                Hoje
              </div>


              {messages.map(
  (
    message:
      FirestoreMessage
  ) => {

    const me =
      message.senderId ===
      user.uid;

    const messageAuthor =
      me
        ? profile
        : selected.otherUser;


    return (
      <div
        className={`dm-message ${
          me
            ? "mine"
            : ""
        }`}
        key={message.id}
      >

        {!me && (
          <Avatar
            user={
              selected.otherUser
            }
          />
        )}


        <div className="dm-message-content">

          <div className="dm-message-meta">

            <strong>

              {me
                ? profile?.username ||
                  "Você"
                : selected
                    .otherUser
                    .username}

            </strong>


            <time>

              {formatTime(
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
              className={`dm-message-media ${
                message.mediaType === "gif"
                  ? "gif"
                  : ""
              }`}
            >
              <img
                src={message.mediaUrl}
                alt={
                  message.mediaType === "gif"
                    ? "GIF enviado"
                    : "Imagem enviada"
                }
                loading="lazy"
              />
            </div>
          )}

        </div>


        {me && (
          <Avatar
            user={
              messageAuthor
            }
          />
        )}

      </div>
    );

  }
)}


              <div
                ref={
                  messagesEndRef
                }
              />

            </div>


            {pendingPix.map(
              (request) => (
                <div
                  className="pix-p2p-card"
                  key={request.id}
                >
                  <div>
                    <strong>
                      {request.action === "charge"
                        ? "Cobrança P2P"
                        : "Pagamento P2P"}
                    </strong>

                    <span>
                      @{selected.otherUser.username} {request.action === "charge"
                        ? "está cobrando"
                        : "quer pagar"} {formatPixAmount(request.amountCents)} {request.action === "charge"
                          ? "de você."
                          : "para você."}
                    </span>
                  </div>

                  <div className="pix-p2p-actions">
                    <button
                      type="button"
                      className="deny"
                      onClick={() =>
                        answerPix(
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
                        answerPix(
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
              )
            )}

            {readyPix.map(
              (request) => (
                <PixReadyCard
                  key={request.id}
                  request={request}
                  username={
                    selected.otherUser.username
                  }
                  busy={pixBusy}
                  onPaid={
                    reportPixPaid
                  }
                />
              )
            )}

            {confirmReceiptPix.map(
              (request) => (
                <PixConfirmReceiptCard
                  key={request.id}
                  request={request}
                  username={
                    selected.otherUser.username
                  }
                  busy={pixBusy}
                  onConfirm={
                    confirmPixReceived
                  }
                />
              )
            )}

            {pixError && (
              <div className="pix-inline-error">
                {pixError}
              </div>
            )}

            {pixMenuOpen && (
              <div className="dm-pix-popover">
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
                      Pagar @{selected.otherUser.username}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPixMode(
                          "charge"
                        )
                      }
                    >
                      Cobrar @{selected.otherUser.username}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="pix-popover-title">
                      <strong>
                        {pixMode === "pay"
                          ? "Pagar"
                          : "Cobrar"} @{selected.otherUser.username}
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
                      className="pix-submit"
                      onClick={submitDmPix}
                      disabled={pixBusy}
                    >
                      {pixBusy
                        ? "Enviando..."
                        : "Enviar solicitação"}
                    </button>
                  </>
                )}
              </div>
            )}

            {messageMedia &&
              messageMediaPreview && (

              <div className="dm-media-preview">

                <div className="dm-media-preview-image">

                  <img
                    src={
                      messageMediaPreview
                    }
                    alt="Prévia da mídia"
                  />

                  <button
                    type="button"
                    className="dm-media-remove"
                    title="Remover mídia"
                    onClick={
                      removeMessageMedia
                    }
                  >
                    ×
                  </button>

                </div>

                <div className="dm-media-preview-info">

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

            <div className="dm-composer">

              <input
                ref={
                  dmMediaInputRef
                }
                className="dm-media-input"
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
                    sendMessage();
                  }
                }}
                placeholder={`Enviar mensagem para @${selected.otherUser.username}`}
                disabled={
                  sendingMessage
                }
              />

              <button
                type="button"
                title="Enviar imagem ou GIF"
                onClick={() =>
                  dmMediaInputRef.current
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
                <CircleDollarSign
                  size={22}
                />
              </button>

              <button
                className="send"
                onClick={
                  sendMessage
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
                <Send size={25} />
              </button>

            </div>

          </>
        ) : (
          <div className="empty-state">
            <MessageCircle
              size={44}
            />

            <strong>
              Mensagens diretas
            </strong>

            <span>
              Selecione uma conversa.
            </span>
          </div>
        )}

      </main>

    </div>
  );
}


/* =========================================================
   APP
   ========================================================= */

function App() {
  const [
    user,
    setUser,
  ] =
    useState(
      auth.currentUser
    );


  const [
    profile,
    setProfile,
  ] =
    useState<
      EliseoUser | null
    >(null);


  const [
    page,
    setPage,
  ] =
    useState<Page>(
      "home"
    );


  const [
    activeCall,
    setActiveCall,
  ] =
    useState<
      EliseoCallDescriptor | null
    >(null);


  const [
    editingProfile,
    setEditingProfile,
  ] =
    useState(false);


  const [
    conversations,
    setConversations,
  ] =
    useState<
      ConversationListItem[]
    >([]);


  const [
    selectedConversationId,
    setSelectedConversationId,
  ] =
    useState<
      string | null
    >(null);


  const [
    messages,
    setMessages,
  ] =
    useState<
      FirestoreMessage[]
    >([]);


  const [
    messageText,
    setMessageText,
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


  const dmMediaInputRef =
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
    searchText,
    setSearchText,
  ] =
    useState("");


  const [
    searchResults,
    setSearchResults,
  ] =
    useState<
      EliseoUser[]
    >([]);

  const [
  topServers,
  setTopServers,
] = useState<EliseoServer[]>([]);

  const [
  communityJoinSignal,
  setCommunityJoinSignal,
] = useState(0);

  useEffect(() => {
  if (!user) {
    setTopServers([]);
    return;
  }

  return listenToUserServers(
    user.uid,
    setTopServers
  );
}, [user]);


  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );


  useEffect(() => {
    return onAuthStateChanged(
      auth,

      async (
        currentUser
      ) => {
        setUser(
          currentUser
        );

        if (
          !currentUser
        ) {
          return;
        }

        await createUserProfile(
          currentUser.uid,
          currentUser.email ||
            ""
        );

        const p =
          await getUserById(
            currentUser.uid
          );

        setProfile(p);
      }
    );
  }, []);


  useEffect(() => {
    if (!user) {
      return;
    }

    return listenToUserConversations(
      user.uid,
      setConversations
    );
  }, [
    user,
  ]);


  useEffect(() => {
    if (
      !selectedConversationId
    ) {
      return;
    }

    return listenToMessages(
      selectedConversationId,
      setMessages
    );
  }, [
    selectedConversationId,
  ]);


  useEffect(() => {
    setMessageMedia(
      null
    );

    if (
      dmMediaInputRef.current
    ) {
      dmMediaInputRef.current.value =
        "";
    }
  }, [
    selectedConversationId,
  ]);


  useEffect(() => {
    if (
      !user ||
      !searchText
    ) {
      setSearchResults(
        []
      );
      return;
    }

    const timer =
      setTimeout(
        async () => {
          setSearchResults(
            await searchUsers(
              searchText,
              user.uid
            )
          );
        },
        250
      );

    return () =>
      clearTimeout(timer);
  }, [
    searchText,
    user,
  ]);


  function startCall(
    descriptor:
      EliseoCallDescriptor
  ) {
    setActiveCall(
      descriptor
    );

    setPage(
      "call"
    );
  }


  async function openDM(
    other:
      EliseoUser
  ) {
    if (!user) {
      return;
    }

    const id =
      await getOrCreateConversation(
        user.uid,
        other.uid
      );

    setSelectedConversationId(
      id
    );

    setPage(
      "messages"
    );

    await markConversationRead(
      id,
      user.uid
    );
  }


  async function sendMessage() {
    if (
      !user ||
      !selectedConversationId ||
      sendingMessage
    ) {
      return;
    }

    const text =
      messageText.trim();

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
            : await uploadPostImage(
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

      await sendFirestoreMessage(
        selectedConversationId,
        user.uid,
        text,
        media
      );

      setMessageText("");
      setMessageMedia(null);

      if (
        dmMediaInputRef.current
      ) {
        dmMediaInputRef.current.value =
          "";
      }
    } catch (
      caught
    ) {
      console.error(
        "Erro ao enviar DM:",
        caught
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
      window.alert(
        "Escolha uma imagem JPG, PNG, WEBP ou GIF."
      );
      return;
    }

    setMessageMedia(
      file
    );
  }


  function removeMessageMedia() {
    setMessageMedia(
      null
    );

    if (
      dmMediaInputRef.current
    ) {
      dmMediaInputRef.current.value =
        "";
    }
  }


  if (!user) {
    return (
      <Login
        onLogin={() => {}}
      />
    );
  }


  return (
    <div className="app-shell">

      <TopBar
  page={page}
  setPage={setPage}
  servers={topServers}
  onJoinCommunity={() => {
    setPage("community");

    setCommunityJoinSignal(
      (value) => value + 1
    );
  }}
/>


      <div className="app-body">

        {page ===
          "home" && (
          <HomeView
            profile={profile}
            setPage={setPage}
          />
        )}


        {page === "feed" && (
  <div className="main-layout">

    <UserSidebar
      page="feed"
      setPage={setPage}
      profile={profile}
      onEdit={() =>
        setEditingProfile(true)
      }
    />

    <Feed
      user={user}
      profile={profile}
      onMessageUser={openDM}
    />

  </div>
)}


        {page ===
          "messages" && (
          <MessagesView
            user={user}
            profile={profile}
            conversations={
              conversations
            }
            selectedConversationId={
              selectedConversationId
            }
            setSelectedConversationId={
              setSelectedConversationId
            }
            messages={
              messages
            }
            messageText={
              messageText
            }
            setMessageText={
              setMessageText
            }
            searchText={
              searchText
            }
            setSearchText={
              setSearchText
            }
            searchResults={
              searchResults
            }
            openDM={
              openDM
            }
            sendMessage={
              sendMessage
            }
            messagesEndRef={
              messagesEndRef
            }
            messageMedia={
              messageMedia
            }
            messageMediaPreview={
              messageMediaPreview
            }
            sendingMessage={
              sendingMessage
            }
            dmMediaInputRef={
              dmMediaInputRef
            }
            handleMessageMedia={
              handleMessageMedia
            }
            removeMessageMedia={
              removeMessageMedia
            }
            startCall={
              startCall
            }
            openSettings={() =>
              setPage("settings")
            }
          />
        )}


        {page === "community" && (
  <Community
  user={user}
  profile={profile}
  openJoinSignal={
    communityJoinSignal
  }
  onEditProfile={() =>
    setEditingProfile(true)
  }
  onStartCall={
    startCall
  }
  onOpenSettings={() =>
    setPage("settings")
  }
/>
)}


        {page ===
          "drive" && (
          <DriveView
            user={user}
            profile={profile}
            setPage={setPage}
          />
        )}


        {page ===
          "profile" && (
          <ProfileView
            profile={profile}
            setPage={setPage}
            onEdit={() =>
              setEditingProfile(
                true
              )
            }
          />
        )}


        {page ===
          "customize" && (
          <CustomizeView
            profile={profile}
            setPage={setPage}
          />
        )}


        {page ===
          "finance" && (
          <FinanceView
            profile={profile}
            setPage={setPage}
          />
        )}


        {page ===
          "settings" && (
          <SettingsView
            profile={profile}
            setPage={setPage}
          />
        )}


        {page ===
          "call" && (
          <CallView
            user={user}
            profile={profile}
            setPage={setPage}
            call={
              activeCall
            }
            onFinish={() => {
              const returnPage =
                activeCall
                  ?.returnPage ||
                "messages";

              setActiveCall(
                null
              );

              setPage(
                returnPage
              );
            }}
          />
        )}

      </div>


      {editingProfile &&
        profile && (
          <ProfileEditor
            user={profile}
            onClose={() =>
              setEditingProfile(
                false
              )
            }
            onSaved={
              setProfile
            }
          />
        )}

    </div>
  );
}


export default App;