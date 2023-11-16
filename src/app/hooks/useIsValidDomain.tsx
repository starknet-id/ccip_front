"use client";

export function useIsValidDomain(domain: string): boolean {
  if (domain.endsWith(".notion.stark")) {
    return true;
  } else {
    return false;
  }
}
