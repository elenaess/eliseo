import {useEffect, useMemo, useState} from "react";
import {ArrowLeft, BookOpen, ExternalLink, Heart, Search, X} from "lucide-react";

import {
  listenToLibraryFavorites,
  openLibraryCoverUrl,
  resolvePublicBookFile,
  searchOpenLibrary,
  setLibraryFavorite,
  type LibraryFavorite,
  type ResolvedBookFile,
} from "./libraryService";
import type {LibraryBook} from "./pure";

export function DesktopLibraryView({uid, onBack}: {uid: string; onBack: () => void}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryBook[]>([]);
  const [favorites, setFavorites] = useState<LibraryFavorite[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingKey, setOpeningKey] = useState("");
  const [reader, setReader] = useState<{book: LibraryBook; file: ResolvedBookFile} | null>(null);
  const [error, setError] = useState("");

  useEffect(() => listenToLibraryFavorites(uid, setFavorites), [uid]);
  const favoriteKeys = useMemo(() => new Set(favorites.map(item => item.key)), [favorites]);

  async function search() {
    const clean = query.trim(); if (!clean || searching) return;
    try { setSearching(true); setError(""); setResults(await searchOpenLibrary(clean)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível pesquisar."); }
    finally { setSearching(false); }
  }

  async function openBook(book: LibraryBook) {
    if (openingKey) return;
    try {
      setOpeningKey(book.key); setError("");
      const file = await resolvePublicBookFile(book);
      if (!file) throw new Error("Não encontramos PDF/EPUB público para este livro.");
      if (file.type === "pdf") setReader({book, file});
      else window.open(file.url, "_blank", "noopener,noreferrer");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível abrir o livro."); }
    finally { setOpeningKey(""); }
  }

  const cards = results.length ? results : favorites;

  return (
    <main className="desktop-parity-page desktop-library-page">
      <header className="desktop-page-header"><button className="desktop-icon-button" onClick={onBack}><ArrowLeft size={20}/></button><div><h1>Biblioteca</h1><p>Open Library + Internet Archive, integrada aos favoritos da sua conta.</p></div></header>
      <section className="desktop-library-search"><Search size={20}/><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {if (event.key === "Enter") void search();}} placeholder="Buscar título, autor ou assunto"/><button onClick={() => void search()} disabled={searching}>{searching ? "Buscando…" : "Buscar"}</button></section>
      {!results.length && favorites.length > 0 && <div className="desktop-library-label"><Heart size={16}/> Seus favoritos</div>}
      <section className="desktop-book-grid">{cards.map(book => {
        const favorite = favoriteKeys.has(book.key);
        return <article key={book.key} className="desktop-book-card"><div className="desktop-book-cover">{book.coverId ? <img src={openLibraryCoverUrl(book.coverId, "M")} alt=""/> : <BookOpen/>}</div><div className="desktop-book-copy"><strong>{book.title}</strong><span>{book.author}</span>{book.firstPublishYear && <small>{book.firstPublishYear}</small>}</div><div className="desktop-book-actions"><button className={favorite ? "favorite" : ""} title={favorite ? "Remover favorito" : "Favoritar"} onClick={() => void setLibraryFavorite(uid, book, !favorite)}><Heart size={17} fill={favorite ? "currentColor" : "none"}/></button><button onClick={() => void openBook(book)} disabled={openingKey === book.key}><ExternalLink size={16}/>{openingKey === book.key ? "Abrindo…" : "Ler"}</button></div></article>;
      })}</section>
      {!cards.length && <div className="desktop-empty-state"><BookOpen/><strong>Sua biblioteca está pronta</strong><span>Faça uma busca para encontrar livros públicos.</span></div>}
      {error && <p className="desktop-error">{error}</p>}

      {reader && <div className="desktop-reader-modal"><div className="desktop-reader-window"><header><div><strong>{reader.book.title}</strong><span>PDF público</span></div><button onClick={() => setReader(null)}><X/></button></header><iframe title={reader.book.title} src={reader.file.url}/></div></div>}
    </main>
  );
}
