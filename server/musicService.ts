import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseFile } from 'music-metadata';

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // segundos
  format: string;
  relativePath: string;
  fullPath: string;
  streamUrl: string;
}

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac']);

let inMemoryTracks: TrackMetadata[] = [];
let inMemoryTrackMap = new Map<string, TrackMetadata>();
let isInitialized = false;

/**
 * Retorna o caminho da biblioteca de música configurado.
 */
export function getMusicLibraryRoot(): string {
  const envPath = process.env.MUSIC_LIBRARY_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return path.resolve(envPath);
  }
  // Fallback local fora do Docker
  const localFallback = path.resolve(process.cwd(), 'media/music');
  if (!fs.existsSync(localFallback)) {
    fs.mkdirSync(localFallback, { recursive: true });
  }
  return localFallback;
}

/**
 * Verifica se um caminho relativo tenta realizar Path Traversal.
 */
function isSafeChildPath(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Percorre recursivamente um diretório procurando por arquivos de áudio válidos.
 */
async function scanDirectory(dirPath: string, rootDir: string, results: TrackMetadata[]): Promise<void> {
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (e) {
    console.warn(`[MusicService] Erro ao ler diretório ${dirPath}:`, e);
    return;
  }

  for (const entry of entries) {
    // Ignorar arquivos e pastas ocultos
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, rootDir, results);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        const relativePath = path.relative(rootDir, fullPath);
        const id = crypto.createHash('md5').update(relativePath).digest('hex');

        let title = path.basename(entry.name, ext);
        let artist = 'Artista Desconhecido';
        let album = 'Álbum Desconhecido';
        let duration = 0;

        try {
          const metadata = await parseFile(fullPath);
          if (metadata.common) {
            if (metadata.common.title) title = metadata.common.title;
            if (metadata.common.artist) artist = metadata.common.artist;
            if (metadata.common.album) album = metadata.common.album;
          }
          if (metadata.format && typeof metadata.format.duration === 'number') {
            duration = Math.round(metadata.format.duration);
          }
        } catch (e) {
          // Usar metadados baseados no nome do arquivo se a leitura de ID3 falhar
        }

        const track: TrackMetadata = {
          id,
          title,
          artist,
          album,
          duration,
          format: ext.replace('.', ''),
          relativePath,
          fullPath,
          streamUrl: `/api/music/stream/${id}`,
        };

        results.push(track);
      }
    }
  }
}

/**
 * Atualiza o índice da biblioteca de músicas em memória.
 */
export async function rescanMusicLibrary(): Promise<{ count: number; tracks: TrackMetadata[] }> {
  const rootDir = getMusicLibraryRoot();
  console.log(`[MusicService] Escaneando biblioteca de músicas em: ${rootDir}`);

  const tracks: TrackMetadata[] = [];
  await scanDirectory(rootDir, rootDir, tracks);

  inMemoryTracks = tracks;
  inMemoryTrackMap = new Map(tracks.map((t) => [t.id, t]));
  isInitialized = true;

  console.log(`[MusicService] Escaneamento concluído. Faixas encontradas: ${tracks.length}`);
  return { count: tracks.length, tracks };
}

/**
 * Inicializa a biblioteca se ainda não tiver sido inicializada.
 */
export async function ensureLibraryLoaded(): Promise<TrackMetadata[]> {
  if (!isInitialized) {
    await rescanMusicLibrary();
  }
  return inMemoryTracks;
}

/**
 * Retorna a lista de todas as músicas sem caminhos de arquivo absolutos.
 */
export async function getTrackList() {
  const tracks = await ensureLibraryLoaded();
  return tracks.map(({ fullPath, ...publicTrack }) => publicTrack);
}

/**
 * Busca uma música pelo ID com validação de segurança de caminho.
 */
export async function getTrackById(id: string): Promise<TrackMetadata | null> {
  await ensureLibraryLoaded();
  const track = inMemoryTrackMap.get(id);
  if (!track) return null;

  const rootDir = getMusicLibraryRoot();
  if (!isSafeChildPath(rootDir, track.fullPath)) {
    console.error(`[MusicService] Tentativa de Path Traversal bloqueada: ${track.fullPath}`);
    return null;
  }

  return track;
}

/**
 * Retorna informações gerais de status da biblioteca (sem caminhos sensíveis).
 */
export async function getLibraryStatus() {
  const tracks = await ensureLibraryLoaded();
  const formats = Array.from(new Set(tracks.map((t) => t.format)));

  return {
    libraryAvailable: fs.existsSync(getMusicLibraryRoot()),
    totalTracks: tracks.length,
    supportedFormats: Array.from(SUPPORTED_EXTENSIONS).map((ext) => ext.replace('.', '')),
    formatsFound: formats,
  };
}
