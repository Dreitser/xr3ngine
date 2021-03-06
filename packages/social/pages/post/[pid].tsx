import React from "react";
import { useRouter } from "next/router";
import AppHeader from "@xr3ngine/client-core/components/social/Header";

export default function PostPage() {
  const router = useRouter();
  const { pid } = router.query;

  return (
    <div className="container">
    <AppHeader user={pid} />
          <div>{pid}</div>
    </div>
  );
}
