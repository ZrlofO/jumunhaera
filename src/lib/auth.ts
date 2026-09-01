import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const sessionCookie = "ordery_owner";

function sessionSecret() {
  const value = process.env.SESSION_SECRET || (process.env.NODE_ENV !== "production" ? "local-demo-secret-change-before-deploy" : "");
  if (!value) throw new Error("SESSION_SECRET이 설정되지 않았습니다.");
  return new TextEncoder().encode(value);
}

export async function verifyPin(pin: string) {
  if (process.env.OWNER_PIN_HASH) return bcrypt.compare(pin, process.env.OWNER_PIN_HASH);
  if (process.env.OWNER_PIN) return pin === process.env.OWNER_PIN;
  return process.env.NODE_ENV !== "production" && pin === "1234";
}

export async function createOwnerToken() {
  return new SignJWT({ role: "owner" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(sessionSecret());
}

export async function isOwnerRequest() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return false;
  try { const { payload } = await jwtVerify(token, sessionSecret()); return payload.role === "owner"; } catch { return false; }
}

