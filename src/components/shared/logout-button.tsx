import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost">
        יציאה
      </Button>
    </form>
  );
}
