"use client";

import BN from "bn.js";

export function extractArrayFromErrorMessage(errorMsg: string) {
  const match = errorMsg.match(
    /Execution was reverted; failure reason: (\[.*?\])/
  );
  if (match && match[1]) {
    // Manually parse the elements as they are not valid JSON
    const arrayString = match[1].slice(1, -1); // Remove the surrounding brackets
    const elements = arrayString.split(", ").map((el) => el.trim());
    return elements;
  }
  return null;
}

export function decimalToHex(element: string | number | undefined): string {
  if (element === undefined) return "";

  return "0x" + new BN(element).toString(16);
}
