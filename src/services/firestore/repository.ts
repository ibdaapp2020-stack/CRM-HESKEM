import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import type { PlannedWrite } from "./map";

/**
 * Server-side Firestore access for the later cutover.
 * Pages still read and write through Prisma until that cutover is approved.
 * Firestore has no SQL contains search: phone match is exact digits, and name match is a prefix.
 */
export function createFirestoreRepository(db: Firestore) {
  const leads = db.collection("leads");

  return {
    listLeads(stage?: string) {
      const query = stage && stage !== "ALL"
        ? leads.where("stage", "==", stage).orderBy("updatedAt", "desc")
        : leads.orderBy("updatedAt", "desc");
      return query.get();
    },

    async searchLeads(q: string) {
      const needle = q.trim().toLowerCase();
      const phone = q.replace(/\D/g, "");
      const snaps = [];
      if (phone.length >= 6) snaps.push(await leads.where("phoneDigits", "==", phone).get());
      if (needle) {
        snaps.push(
          await leads.where("nameLower", ">=", needle).where("nameLower", "<=", `${needle}\uf8ff`).limit(25).get(),
        );
      }
      const byId = new Map(snaps.flatMap((snap) => snap.docs.map((doc) => [doc.id, doc])));
      return [...byId.values()];
    },

    getLead(id: string) {
      return leads.doc(id).get();
    },

    getLeadForClient(clientUserId: string) {
      return leads.where("clientUserId", "==", clientUserId).limit(1).get();
    },

    createLead(id: string, data: Record<string, unknown>) {
      return leads.doc(id).create(data);
    },

    updateLead(id: string, data: Record<string, unknown>) {
      return leads.doc(id).update(data);
    },

    async deleteLeadTree(id: string) {
      await deleteTree(leads.doc(id));
    },

    getDocumentBySignToken(token: string) {
      return db.collectionGroup("documents").where("signToken", "==", token).limit(1).get();
    },

    listTemplatesByType(type: string) {
      return db.collection("documentTemplates").where("type", "==", type).orderBy("industry").orderBy("name").get();
    },

    async applyWrites(writes: PlannedWrite[]) {
      for (let index = 0; index < writes.length; index += 400) {
        const batch = db.batch();
        for (const write of writes.slice(index, index + 400)) {
          const ref = db.doc(write.path);
          batch.create(ref, write.data);
        }
        await batch.commit();
      }
    },
  };
}

async function deleteTree(ref: DocumentReference) {
  const collections = await ref.listCollections();
  for (const collection of collections) {
    const snap = await collection.limit(200).get();
    for (const doc of snap.docs) await deleteTree(doc.ref);
  }
  await ref.delete();
}
