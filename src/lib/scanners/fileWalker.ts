import fs from "fs";
import path from "path";

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".cache", "vendor",
]);

const IGNORED_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".ico", ".svg", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp4", ".mp3", ".wav", ".avi",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".lock", ".bin", ".exe", ".dll", ".so", ".dylib",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
]);

export const MAX_FILE_SIZE = 500_000; // 500KB

// Parcourt récursivement un dossier et retourne tous les fichiers texte analysables
export function walkDir(dir: string): string[] {
  const files: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...walkDir(path.join(dir, entry.name)));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!IGNORED_EXTS.has(ext)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files;
}
