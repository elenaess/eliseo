import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import {db} from './firebase';

export type LibraryBook = {
  key: string;
  title: string;
  author: string;
  firstPublishYear?: number;
  coverId?: number;
  ebookAccess?: string;
  ia: string[];
};

export type LibraryFavorite = LibraryBook & {
  provider: 'openlibrary';
  savedAt?: any;
};

export type ResolvedBookFile = {
  identifier: string;
  type: 'pdf' | 'epub';
  url: string;
};

export function openLibraryCoverUrl(coverId?: number, size: 'S'|'M'|'L' = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : '';
}

export function normalizeOpenLibraryDoc(docData: any): LibraryBook | null {
  const key = typeof docData?.key === 'string' ? docData.key : '';
  const title = typeof docData?.title === 'string' ? docData.title.trim() : '';
  if (!key || !title) return null;
  const authors = Array.isArray(docData?.author_name) ? docData.author_name.filter(Boolean) : [];
  const ia = Array.isArray(docData?.ia) ? docData.ia.filter((x: unknown) => typeof x === 'string') : [];
  return {
    key,
    title,
    author: authors.join(', ') || 'Autor desconhecido',
    firstPublishYear: Number.isFinite(Number(docData?.first_publish_year)) ? Number(docData.first_publish_year) : undefined,
    coverId: Number.isFinite(Number(docData?.cover_i)) ? Number(docData.cover_i) : undefined,
    ebookAccess: typeof docData?.ebook_access === 'string' ? docData.ebook_access : undefined,
    ia,
  };
}

export async function searchOpenLibrary(search: string): Promise<LibraryBook[]> {
  const q = search.trim();
  if (!q) return [];
  const fields = 'key,title,author_name,first_publish_year,cover_i,ebook_access,ia';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&limit=30`;
  const response = await fetch(url, {headers: {'User-Agent': 'EliseoApp/1.0'}});
  if (!response.ok) throw new Error('Não foi possível consultar a Open Library.');
  const body = await response.json();
  return (Array.isArray(body?.docs) ? body.docs : [])
    .map(normalizeOpenLibraryDoc)
    .filter((book: LibraryBook | null): book is LibraryBook => !!book);
}

function allowedArchiveFile(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('_bw.pdf') || lower.endsWith('_text.pdf')) return false;
  if (lower.includes('scandata') || lower.endsWith('.xml') || lower.endsWith('.sqlite')) return false;
  return lower.endsWith('.pdf') || lower.endsWith('.epub');
}

export async function resolvePublicBookFile(book: LibraryBook): Promise<ResolvedBookFile | null> {
  if (book.ebookAccess !== 'public' || !book.ia.length) return null;
  for (const identifier of book.ia.slice(0, 4)) {
    const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
    if (!response.ok) continue;
    const metadata = await response.json();
    const files = Array.isArray(metadata?.files) ? metadata.files : [];
    const names = files
      .map((file: any) => typeof file?.name === 'string' ? file.name : '')
      .filter(allowedArchiveFile);
    const epub = names.find((name: string) => name.toLowerCase().endsWith('.epub'));
    const pdf = names.find((name: string) => name.toLowerCase().endsWith('.pdf'));
    const name = epub || pdf;
    if (!name) continue;
    return {
      identifier,
      type: name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf',
      url: `https://archive.org/download/${encodeURIComponent(identifier)}/${name.split('/').map(encodeURIComponent).join('/')}`,
    };
  }
  return null;
}

function favoriteRef(uid: string, key: string) {
  return doc(db, 'users', uid, 'libraryFavorites', encodeURIComponent(key));
}

export function listenToLibraryFavorites(uid: string, callback: (items: LibraryFavorite[]) => void) {
  return onSnapshot(collection(db, 'users', uid, 'libraryFavorites'), snapshot => {
    callback(snapshot.docs.map(item => item.data() as LibraryFavorite));
  });
}

export async function setLibraryFavorite(uid: string, book: LibraryBook, favorite: boolean) {
  const ref = favoriteRef(uid, book.key);
  if (!favorite) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, {
    provider: 'openlibrary',
    ...book,
    savedAt: serverTimestamp(),
  });
}
