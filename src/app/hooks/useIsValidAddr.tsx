"use client";

export function useIsValidAddr(address: string): boolean {
  if (/^0x[0123456789abcdefABCDEF]+$/.test(address)) {
    return true;
  } else {
    return false;
  }
}
