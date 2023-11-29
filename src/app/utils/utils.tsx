"use client";

import BN from "bn.js";

export function extractArrayFromErrorMessage(errorMsg: string) {
  const failureReasonPattern = /Failure reason: "(.*?)"/;
  const match = errorMsg.match(failureReasonPattern);

  if (match && match[1]) {
    const values = match[1].split(",").map((value) => value.trim());
    return values;
  }

  return null;
}

export function decimalToHex(element: string | number | undefined): string {
  if (element === undefined) return "";

  return "0x" + new BN(element).toString(16);
}
