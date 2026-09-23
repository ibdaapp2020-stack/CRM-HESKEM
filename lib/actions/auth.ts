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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }

  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "STAFF" ? "STAFF" : "CLIENT",
  };
  const token = await signSession(session);
  await setSessionCookie(token);

  if (next.startsWith("/")) {
    redirect(next);
  }
  redirect(session.role === "STAFF" ? "/office" : "/portal");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
