/** Firestore document shapes prepared for the approved migration. */

export type UserRole = "STAFF" | "CLIENT";

export type FirestoreUser = {
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  /** Filled only after a verified Firebase Auth link. Never a bcrypt hash. */
  authUid: string | null;
  legacyUserId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type FirestoreLead = {
  fullName: string;
  nameLower: string;
  phone: string;
  phoneDigits: string;
  email: string | null;
  company: string | null;
  companyLower: string | null;
  source: string;
  campaignId: string | null;
  campaignName: string | null;
  campaignHeadline: string | null;
  campaignHeadlineLower: string | null;
  ctwaClid: string | null;
  industry: string;
  locale: string;
  stage: string;
  score: number;
  tags: string[];
  notes: string | null;
  lostReason: string | null;
  ownerId: string | null;
  clientUserId: string | null;
  /** Firebase Auth uid. Empty until a verified Auth link exists. */
  authUid: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MoneyFields = {
  amount: number | null;
  agorot: number | null;
};
