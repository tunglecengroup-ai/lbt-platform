import "server-only";
import { randomInt } from "node:crypto";

// Bỏ 0/O, 1/I/L để khách gõ không nhầm
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Chuẩn hóa mã khách gõ: IN HOA, bỏ khoảng trắng và dấu gạch */
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** "AB3K9XQ2MP" -> "AB3K-9XQ2-MP" cho dễ đọc */
export const formatCode = (code: string) => code.match(/.{1,4}/g)?.join("-") ?? code;

/** Mã ngẫu nhiên 10 ký tự (~30^10 khả năng — không đoán mò được) */
export function newActivationCode() {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}
