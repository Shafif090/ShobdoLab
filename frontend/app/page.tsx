"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/session";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAccessToken() ? "/home" : "/login");
  }, [router]);

  return null;
}
