"use client";

import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const [user, setUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!data.session) {
      router.push("/login");
      return;
    }
    
    // Save logged user's email so we can display
      setUser(data.session.user.email ?? null)
    };

    checkSession();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">Signed in as: {user}</p>
          <Button onClick={logout} variant="outline" className="w-full">
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
