"use client";

import { useSyncExternalStore } from "react";
import { can, type Capability } from "@/lib/permissions";
import { getAuthSnapshot, getServerAuthSnapshot, subscribeAuth, type AuthSnapshot } from "./tokens";

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
}

export function useCan(capability: Capability): boolean {
  const { user } = useAuth();
  return can(user?.role, capability);
}
