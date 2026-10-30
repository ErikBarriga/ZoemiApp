import { supabase } from './supabase'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav'
}
const KIND_EXT = {
  image: ['png', 'jpg', 'jpeg', 'webp'],
  audio: ['mp3', 'm4a', 'aac', 'wav']
}
const MAX_BYTES = { image: 3 * 1024 * 1024, audio: 10 * 1024 * 1024 }

export const ACCEPT = {
  image: '.png,.jpg,.jpeg,.webp',
  audio: '.mp3,.m4a,.aac,.wav'
}

export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

/** Valida y sube un archivo al bucket "media". Devuelve la ruta guardada. */
export async function uploadMedia(file: File, kind: 'image' | 'audio'): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!KIND_EXT[kind].includes(ext)) {
    throw new Error(
      kind === 'image' ? 'La imagen debe ser PNG, JPG o WebP.' : 'El audio debe ser MP3, M4A, AAC o WAV.'
    )
  }
  if (file.size > MAX_BYTES[kind]) {
    throw new Error(kind === 'image' ? 'La imagen pesa más de 3 MB.' : 'El audio pesa más de 10 MB.')
  }
  const path = `${kind}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: MIME_BY_EXT[ext], cacheControl: '31536000', upsert: false })
  if (error) throw error
  return path
}

/** Rutas de `before` que ya no están en `after` (archivos que quedaron sin uso). */
export function unusedPaths(before: (string | null)[], after: (string | null)[]): string[] {
  const keep = new Set(after)
  return before.filter((p): p is string => Boolean(p) && !keep.has(p))
}

/**
 * Borra archivos del bucket "media". Se llama DESPUÉS de que la base de datos confirmó el cambio.
 * Si falla no interrumpe nada: a lo más queda un archivo sin uso.
 */
export async function removeMedia(paths: (string | null | undefined)[]): Promise<void> {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  if (list.length === 0) return
  try {
    await supabase.storage.from('media').remove(list)
  } catch {
    /* sin acciones: el borrado es una limpieza, no parte del guardado */
  }
}
