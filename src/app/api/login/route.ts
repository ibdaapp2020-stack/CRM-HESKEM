import { loginAction } from "@/features/auth/actions";

export async function POST(request: Request) {
  const formData = await request.formData();
  await loginAction(formData);
  return new Response(null, { status: 302, headers: { Location: "/login?error=server" } });
}
