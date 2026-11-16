import { decodeProtectedHeader, importX509, jwtVerify, type JWTPayload } from "jose";

let certificates: Record<string, string> | null = null;

export async function verifyFirebaseIdToken(idToken: string): Promise<JWTPayload> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is missing");
  const header = decodeProtectedHeader(idToken);
  if (!certificates) {
    const response = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    );
    if (!response.ok) throw new Error("Firebase token certificates are unavailable");
    certificates = (await response.json()) as Record<string, string>;
  }
  const pem = certificates[String(header.kid ?? "")];
  if (!pem) throw new Error("Firebase token certificate was not found");
  const key = await importX509(pem, "RS256");
  const { payload } = await jwtVerify(idToken, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}

export async function signInWithFirebase(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase web config is incomplete");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { idToken?: string };
  return body.idToken ?? null;
}
