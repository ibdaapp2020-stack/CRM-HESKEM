import { receiveMetaWebhook, verifyMetaWebhook } from "@/features/inbox/meta/receive";

export function GET(request: Request) {
  return verifyMetaWebhook(request);
}

export function POST(request: Request) {
  return receiveMetaWebhook(request);
}