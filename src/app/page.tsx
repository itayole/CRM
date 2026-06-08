"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function RootPage() {
  const { currentUser, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    router.replace(currentUser ? "/dashboard" : "/login");
  }, [currentUser, authLoading, router]);

  return null;
}
