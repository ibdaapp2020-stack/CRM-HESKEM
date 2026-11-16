import { getClientBundle } from "@/services/firestore/crm";
import type { SessionUser } from "@/lib/session";

export async function getClientLead(user: SessionUser) {
  return getClientBundle(user.id);
}
