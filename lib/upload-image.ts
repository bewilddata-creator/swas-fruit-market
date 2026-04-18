'use client';

export async function compressAndUpload(file: File): Promise<string> {
  const { default: imageCompression } = await import('browser-image-compression');
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp',
  });
  const fd = new FormData();
  fd.append('file', compressed, (file.name.replace(/\.[^.]+$/, '') || 'image') + '.webp');
  const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  if (!r.ok) throw new Error('upload failed');
  const d = await r.json();
  return d.url as string;
}
