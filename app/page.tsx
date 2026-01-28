import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center gap-3">
      {/* Link is Next's client-side navigation */}
      <Link href="/login">
        <Button>Login</Button>
      </Link>

      <Link href="/dashboard">
        <Button variant="outline">Dashboard</Button>
      </Link>
    </main>
  );
}
