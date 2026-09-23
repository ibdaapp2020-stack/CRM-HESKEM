import { redirect } from "next/navigation";
import { readSession, type SessionUser } from "./session";

export async function getSession() {
  return readSession();
}

export async function requireSession(): Promise<SessionUser> {
  const session = await readSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireStaff(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "STAFF") redirect("/portal");
  return session;
}

export async function requireClient(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "CLIENT") redirect("/office");
  return session;
}
