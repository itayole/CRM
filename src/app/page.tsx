"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function RootPage() {
  const { currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    router.replace(currentUser ? "/dashboard" : "/login");
  }, [currentUser, router]);

  return null;
}
