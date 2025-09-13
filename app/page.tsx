"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect page - redirects from "/" to "/home"
export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /home
    router.push('/home');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
