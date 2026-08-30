import {useEffect, useMemo, useRef, useState} from "react";
import type {User as FirebaseUser} from "firebase/auth";
import {
  ArrowLeft,
  BookOpen,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import {
  createDriveFileRecord,
  createDriveFolder,
  ELISEO_DRIVE_LIMIT_BYTES,
  listenToDriveFiles,
  listenToDriveFolders,
  listenToDriveUsage,
  releaseDriveBytes,
  reserveDriveBytes,
  type EliseoDriveFile,
  type EliseoDriveFolder,
} from "../firestore";
import {deleteStoredFile, uploadDriveFile} from "../storage";
import {
  deleteDriveFileRecord,
  fileKind,
  formatBytes,
  isAllowedDriveUpload,
  listenToDriveFavorites,
  toggleDriveFileFavorite,
} from "./driveExtras";

function FileGlyph({file}: {file: EliseoDriveFile}) {
  const kind = fileKind(file);
  if (kind === "image") return <FileImage/>;
  if (kind === "pdf" || kind === "document" || kind === "ebook") return <FileText/>;
  if (kind === "sheet") return <FileSpreadsheet/>;
  if (kind === "code") return <FileCode2/>;
  if (kind === "archive") return <FileArchive/>;
  return <File/>;
}

export function DesktopDriveView({user, onOpenLibrary}: {user: FirebaseUser; onOpenLibrary: () => void}) {
  const [folders, setFolders] = useState<EliseoDriveFolder[]>([]);
  const [files, setFiles] = useState<EliseoDriveFile[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tab, setTab] = useState<"files" | "favorites">("files");
  const [search, setSearch] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<EliseoDriveFile | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => listenToDriveFolders(user.uid, setFolders), [user.uid]);
  useEffect(() => listenToDriveFiles(user.uid, setFiles), [user.uid]);
  useEffect(() => listenToDriveUsage(user.uid, setUsedBytes), [user.uid]);
  useEffect(() => listenToDriveFavorites(user.uid, setFavorites), [user.uid]);

  const currentFolder = folders.find(folder => folder.id === folderId) ?? null;
  const clean = search.trim().toLowerCase();
  const visibleFolders = useMemo(() => folders.filter(folder => tab === "files" && folder.parentId === folderId && (!clean || folder.name.toLowerCase().includes(clean))), [folders, folderId, clean, tab]);
  const visibleFiles = useMemo(() => files.filter(file => (tab === "favorites" ? favorites.includes(file.id) : file.folderId === folderId) && (!clean || file.name.toLowerCase().includes(clean))), [files, favorites, folderId, clean, tab]);
  const usage = Math.min(100, usedBytes / ELISEO_DRIVE_LIMIT_BYTES * 100);

  async function createFolder() {
    if (!newFolder.trim() || busy) return;
    try { setBusy(true); setError(""); await createDriveFolder(user.uid, newFolder, folderId); setNewFolder(""); setShowCreate(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível criar a pasta."); }
    finally { setBusy(false); }
  }

  async function upload(file: File) {
    if (!isAllowedDriveUpload(file.name, file.type)) { setError("Esse tipo de arquivo ainda não é aceito no Drive."); return; }
    try {
      setBusy(true); setError(""); await reserveDriveBytes(user.uid, file.size);
      try {
        const uploaded = await uploadDriveFile(user.uid, file);
        await createDriveFileRecord(user.uid, folderId, {name: file.name, key: uploaded.key, url: uploaded.url, size: uploaded.size, contentType: uploaded.contentType});
      } catch (caught) { await releaseDriveBytes(user.uid, file.size).catch(() => {}); throw caught; }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível enviar o arquivo."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function remove(file: EliseoDriveFile) {
    if (!window.confirm(`Apagar ${file.name}?`)) return;
    try { setBusy(true); setError(""); await deleteStoredFile(file.key); await deleteDriveFileRecord(file.id); await releaseDriveBytes(user.uid, file.size); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível apagar o arquivo."); }
    finally { setBusy(false); }
  }

  function open(file: EliseoDriveFile) {
    const kind = fileKind(file);
    if (kind === "image" || kind === "pdf") { setPreview(file); return; }
    else { const anchor = document.createElement("a"); anchor.href = file.url; anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; anchor.click(); }
  }

  return (
    <main className="desktop-parity-page desktop-drive-page">
      <header className="desktop-page-header desktop-page-header-spread"><div><h1>Drive</h1><p>Pastas, favoritos e Biblioteca no mesmo espaço.</p></div><div className="desktop-header-actions"><input ref={inputRef} type="file" hidden onChange={event => {const file = event.target.files?.[0]; if (file) void upload(file);}}/><button className="desktop-secondary-button" onClick={() => setShowCreate(value => !value)}><FolderPlus size={17}/> Nova pasta</button><button className="desktop-primary-button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={17}/> Enviar arquivo</button></div></header>

      <section className="desktop-drive-toolbar"><div className="desktop-drive-tabs"><button className={tab === "files" ? "active" : ""} onClick={() => setTab("files")}><Folder size={17}/> Pastas</button><button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}><Star size={17}/> Favoritos</button><button onClick={onOpenLibrary}><BookOpen size={17}/> Biblioteca</button></div><label><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar arquivos"/></label></section>

      <section className="desktop-drive-usage"><HardDrive size={18}/><div><span><strong>{formatBytes(usedBytes)}</strong> de 5 GB usados</span><i><b style={{width: `${usage}%`}}/></i></div></section>

      {showCreate && <section className="desktop-inline-create"><input autoFocus value={newFolder} onChange={event => setNewFolder(event.target.value)} onKeyDown={event => {if (event.key === "Enter") void createFolder();}} placeholder="Nome da pasta"/><button onClick={() => void createFolder()} disabled={busy}>Criar</button></section>}

      {tab === "files" && currentFolder && <button className="desktop-breadcrumb-back" onClick={() => setFolderId(currentFolder.parentId)}><ArrowLeft size={16}/> {currentFolder.name}</button>}

      <section className="desktop-drive-grid">{visibleFolders.map(folder => <button className="desktop-drive-item folder" key={folder.id} onClick={() => setFolderId(folder.id)}><div className="desktop-drive-icon"><Folder/></div><strong>{folder.name}</strong><span>Pasta</span></button>)}{visibleFiles.map(file => {const favorite = favorites.includes(file.id); return <article className="desktop-drive-item" key={file.id}><button className="desktop-drive-open" onClick={() => open(file)}><div className="desktop-drive-icon"><FileGlyph file={file}/></div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></button><div className="desktop-drive-item-actions"><button className={favorite ? "active" : ""} onClick={() => void toggleDriveFileFavorite(user.uid, file.id, !favorite)} title="Favoritar"><Star size={15} fill={favorite ? "currentColor" : "none"}/></button><button className="danger" onClick={() => void remove(file)} title="Excluir"><Trash2 size={15}/></button></div></article>;})}</section>
      {!visibleFolders.length && !visibleFiles.length && <div className="desktop-empty-state"><HardDrive/><strong>{tab === "favorites" ? "Nenhum favorito" : "Esta pasta está vazia"}</strong><span>{tab === "favorites" ? "Marque arquivos com a estrela para encontrá-los aqui." : "Crie uma pasta ou envie um arquivo."}</span></div>}
      {error && <p className="desktop-error">{error}</p>}
      {preview && <div className="desktop-reader-modal"><div className="desktop-reader-window"><header><div><strong>{preview.name}</strong><span>{fileKind(preview) === "pdf" ? "PDF" : "Imagem"}</span></div><button onClick={() => setPreview(null)}>×</button></header>{fileKind(preview) === "image" ? <img className="desktop-drive-preview-image" src={preview.url} alt={preview.name}/> : <iframe title={preview.name} src={preview.url}/>}</div></div>}
    </main>
  );
}
