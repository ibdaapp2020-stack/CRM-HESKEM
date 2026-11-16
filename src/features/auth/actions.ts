"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/services/firestore/crm";
import { signInWithFirebase, verifyFirebaseIdToken } from "./firebase-token";
import {
  clearSessionCookie,
  setSessionCookie,
  signSession,
  type SessionUser,
} from "@/lib/session";

function roleOf(value: unknown): SessionUser["role"] | null {
  return value === "STAFF" || value === "CLIENT" ? value : null;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  let session: SessionUser | null = null;
  let failure: "1" | "server" | null = null;

  try {
    const idToken = await signInWithFirebase(email, password);
    if (!idToken) {
      failure = "1";
    } else {
      const payload = await verifyFirebaseIdToken(idToken);
      const uid = typeof payload.sub === "string" ? payload.sub : "";
      let profile: Record<string, unknown> | null = null;
      try {
        profile = uid ? await getUser(uid) : null;
      } catch {
        profile = null;
      }
      const role = roleOf(payload.role) ?? roleOf(profile?.role);
      if (!uid || !role) {
        failure = "1";
      } else {
        session = {
          id: uid,
          email: typeof payload.email === "string" ? payload.email : email,
          name: String(profile?.name ?? payload.name ?? email),
          role,
        };
        await setSessionCookie(await signSession(session));
      }
    }
  } catch (error) {
    console.error("[login] server error:", error instanceof Error ? error.message : "login failed");
    failure = "server";
  }

  if (failure || !session) {
    redirect(`/login?error=${failure ?? "1"}`);
  }

  if (next.startsWith("/")) redirect(next);
  redirect(session.role === "STAFF" ? "/office" : "/portal");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
