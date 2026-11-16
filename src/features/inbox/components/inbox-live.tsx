"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { getClientAuth, getClientFirestore } from "@/lib/firebase/client";

export function InboxLive() {
  const router = useRouter();

  useEffect(() => {
    let timer = 0;
    const poll = () => {
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, 12000);
    };

    let unsubscribe = () => {};
    try {
      const user = getClientAuth().currentUser;
      if (!user) {
        poll();
      } else {
        let firstSnapshot = true;
        unsubscribe = onSnapshot(
          collection(getClientFirestore(), "messages"),
          (snap) => {
            if (firstSnapshot) {
              firstSnapshot = false;
              return;
            }
            const incoming = snap.docChanges().some((change) => {
              return change.type === "added" && change.doc.data().direction === "inbound";
            });
            if (incoming && Notification.permission === "granted") {
              new Notification("מרכז הודעות", { body: "התקבלה הודעה חדשה" });
            }
            router.refresh();
          },
          () => poll(),
        );
      }
    } catch {
      poll();
    }

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }

    return () => {
      unsubscribe();
      if (timer) window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
