"use server";

import { redirect } from "next/navigation";
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

function staffEmails() {
  return (process.env.STAFF_EMAILS || "office@ibda.co.il,admin@ibda.co.il")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
        if (uid) {
          const { getUser } = await import("@/services/firestore/crm");
          profile = await getUser(uid);
        }
      } catch {
        profile = null;
      }
      const tokenEmail = (typeof payload.email === "string" ? payload.email : email).toLowerCase();
      const role =
        roleOf(payload.role) ??
        roleOf(profile?.role) ??
        (staffEmails().includes(tokenEmail) ? "STAFF" : null);
      if (!uid || !role) {
        failure = "1";
      } else {
        session = {
          id: uid,
          email: tokenEmail,
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
