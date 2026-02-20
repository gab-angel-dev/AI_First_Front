import path from "path";
import fs from "fs";

const FILES_BASE_DIR = process.env.FILES_BASE_DIR || "./public/files";
const FILES_BASE_URL = process.env.FILES_BASE_URL || "";

const MEDIA_TYPE_MAP: Record<string, string> = {
  ".pdf": "document",
  ".docx": "document",
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".mp4": "video",
  ".mp3": "audio",
};

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export function getMediaType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MEDIA_TYPE_MAP[ext] ?? "document";
}

export function getPublicUrl(categoria: string, filename: string): string {
  if (!FILES_BASE_URL) {
    throw new Error("FILES_BASE_URL não configurada no .env");
  }
  return `${FILES_BASE_URL.replace(/\/$/, "")}/${categoria}/${filename}`;
}

export function validateFileSize(size: number): string | null {
  if (size > MAX_FILE_SIZE) {
    return `Arquivo muito grande. Limite: 16MB. Tamanho enviado: ${(size / 1024 / 1024).toFixed(1)}MB`;
  }
  return null;
}

export function validateExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  if (!MEDIA_TYPE_MAP[ext]) {
    return `Extensão não suportada: ${ext}. Use: pdf, docx, jpg, jpeg, png, mp4, mp3`;
  }
  return null;
}

export function saveFile(buffer: Buffer, categoria: string, filename: string): string {
  const dirPath = path.resolve(FILES_BASE_DIR, categoria);
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, filename);
  if (fs.existsSync(filePath)) {
    throw new Error(
      `CONFLICT:Arquivo '${filename}' já existe na categoria '${categoria}'. Delete o existente antes de substituir.`
    );
  }

  fs.writeFileSync(filePath, buffer);
  return getPublicUrl(categoria, filename);
}

export function deleteFile(categoria: string, filename: string): void {
  const filePath = path.resolve(FILES_BASE_DIR, categoria, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove diretório se vazio
  const dirPath = path.resolve(FILES_BASE_DIR, categoria);
  if (fs.existsSync(dirPath)) {
    const remaining = fs.readdirSync(dirPath);
    if (remaining.length === 0) {
      fs.rmdirSync(dirPath);
    }
  }
}