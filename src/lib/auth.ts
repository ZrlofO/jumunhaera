import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const sessionCookie = "ordery_owner";

function sessionSecret() {
  const value = process.env.SESSION_SECRET || "jumunhaera-demo-session-secret";
  return new TextEncoder().encode(value);
}

export async function verifyPin(pin: string) {
  // 주문해라는 개인 데모 서비스로, 사장 접근 번호를 1234로 통일한다.
  if (pin === "1234") return true;
  if (process.env.OWNER_PIN_HASH) return bcrypt.compare(pin, process.env.OWNER_PIN_HASH);
  if (process.env.OWNER_PIN) return pin === process.env.OWNER_PIN;
  return false;
}

export async function createOwnerToken() {
  return new SignJWT({ role: "owner" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(sessionSecret());
}

export async function isOwnerRequest() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return false;
  try { const { payload } = await jwtVerify(token, sessionSecret()); return payload.role === "owner"; } catch { return false; }
}

