"use client";

import { useSyncExternalStore } from "react";
import { getAuthSnapshot, getServerAuthSnapshot, subscribeAuth, type AuthSnapshot } from "./tokens";

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
}
