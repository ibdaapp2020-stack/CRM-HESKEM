"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import {
  clearSessionCookie,
  setSessionCookie,
  signSession,
  type SessionUser,
} from "../session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  let session: SessionUser | null = null;
  let failure: "1" | "server" | null = null;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      failure = "1";
    } else {
      session = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role === "STAFF" ? "STAFF" : "CLIENT",
      };
      const token = await signSession(session);
      await setSessionCookie(token);
    }
  } catch (error) {
    // Typically: DATABASE_URL missing/unreachable, tables not created, or AUTH_SECRET missing.
    console.error("[login] server error:", error);
    failure = "server";
  }

  // redirect() throws internally, so it must stay outside the try/catch.
  if (failure || !session) {
    redirect(`/login?error=${failure ?? "1"}`);
  }

  if (next.startsWith("/")) {
    redirect(next);
  }
  redirect(session.role === "STAFF" ? "/office" : "/portal");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
