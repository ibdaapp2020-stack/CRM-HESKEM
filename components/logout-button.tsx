import { logoutAction } from "@/lib/actions/auth";
import { Button } from "./ui";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost">
        יציאה
      </Button>
    </form>
  );
}
