import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".next", "cache", "signalflow");

export function getFileCache<T>(key: string, ttlMs: number): { data: T; isExpired: boolean } | null {
  try {
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
    if (!fs.existsSync(filePath)) return null;

    const stats = fs.statSync(filePath);
    const age = Date.now() - stats.mtimeMs;
    const isExpired = age > ttlMs;

    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as T;

    return { data, isExpired };
  } catch {
    return null;
  }
}

export function setFileCache<T>(key: string, data: T): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
  } catch (err) {
    console.error("Failed to write file cache:", err);
  }
}
