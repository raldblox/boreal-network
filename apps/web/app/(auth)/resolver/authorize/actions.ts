"use server";

import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import {
  approveResolverAuthorizationByUserCode,
  denyResolverAuthorizationByUserCode,
} from "@/lib/resolver-server";

export async function approveResolverAuthorizationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.type !== "regular") {
    redirect("/login");
  }

  const userCode = String(formData.get("userCode") ?? "").trim().toUpperCase();
  await approveResolverAuthorizationByUserCode({
    userCode,
    approverUserId: session.user.id,
  });

  redirect(`/resolver/authorize?user_code=${encodeURIComponent(userCode)}&state=approved`);
}

export async function denyResolverAuthorizationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.type !== "regular") {
    redirect("/login");
  }

  const userCode = String(formData.get("userCode") ?? "").trim().toUpperCase();
  await denyResolverAuthorizationByUserCode({
    userCode,
    approverUserId: session.user.id,
  });

  redirect(`/resolver/authorize?user_code=${encodeURIComponent(userCode)}&state=denied`);
}
