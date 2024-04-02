"use client";

import { TextField } from "@mui/material";
import { useMemo, useState } from "react";
import btnStyles from "../../../styles/button.module.css";
import { useIsValidDomain } from "../hooks/useIsValidDomain";
import { CallData, Provider, shortString } from "starknet";
import { utils } from "starknetid.js";

export const ResolvingForm = () => {
  const [domain, setDomain] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDomainValid = useIsValidDomain(domain);

  const provider = useMemo(() => {
    return new Provider({
      rpc: {
        nodeUrl: process.env.NEXT_PUBLIC_RPC_URL as string,
      },
    });
  }, []);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(event.target.value);
    setError(null);
    setAddress(null);
  };

  const submit = async () => {
    setError(null);
    if (!isDomainValid) return;
    const response = await getAddressFromStarkName(domain);
    setAddress(response);
  };

  // todo: call starknetid.js function instead of this function
  const getAddressFromStarkName = async (domain: string): Promise<string> => {
    const contract = process.env.NEXT_PUBLIC_NAMING_CONTRACT as string;
    const encodedDomain = utils
      .encodeDomain(domain)
      .map((elem) => elem.toString(10));

    try {
      return await tryResolveDomainSID(contract, encodedDomain, []);
    } catch (error) {
      if (error instanceof Error) {
        // extract server uri from error message
        const data = extractArrayFromErrorMessageSID(String(error));
        if (!data?.includes("offchain_resolving")) {
          // if the error is not related to offchain resolving
          throw new Error("Could not get address from stark name");
        }
        const uri = data.slice(1).join("");

        // Query server
        try {
          const serverRes = await queryServerSID(uri, domain);
          if (serverRes.error) {
            throw new Error("Could not resolve domain");
          }
          // try resolving with hint
          const hint: any[] = [
            serverRes.data.address,
            serverRes.data.r,
            serverRes.data.s,
            serverRes.data.max_validity,
          ];
          return await tryResolveDomainSID(contract, encodedDomain, hint);
        } catch (error: any) {
          throw new Error(`Could not resolve domain : ${error.message}`);
        }
      } else {
        throw new Error("Could not get address from stark name");
      }
    }
  };

  const tryResolveDomainSID = async (
    contract: string,
    encodedDomain: string[],
    hint: any = []
  ): Promise<string> => {
    const addressData = await provider.callContract({
      contractAddress: contract,
      entrypoint: "domain_to_address",
      calldata: CallData.compile({ domain: encodedDomain, hint }),
    });
    return addressData.result[0];
  };

  const extractArrayFromErrorMessageSID = (errorMsg: string) => {
    const pattern = /Execution failed\. Failure reason: \((.*?)\)\./;
    const match = errorMsg.match(pattern);

    if (match && match[1]) {
      const values = match[1].split(",").map((value) => value.trim());
      const res = values.map((entry) => {
        const hexMatch = entry.match(/(0x[0-9a-f]+)/i);
        if (hexMatch && hexMatch[1]) {
          return shortString.decodeShortString(hexMatch[1]);
        }
      });
      return res;
    }

    return null;
  };

  const queryServerSID = async (serverUri: string, domain: string) => {
    try {
      const response = await fetch(`${serverUri}${domain}`);

      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(errorResponse || "Error while querying server");
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error };
    }
  };

  return (
    <>
      <TextField
        fullWidth
        value={domain}
        variant="outlined"
        onChange={onChange}
        label={
          isDomainValid != true
            ? `"${domain}" is not a valid subdomain of notion.stark`
            : "Your domain name"
        }
        required={true}
        placeholder="test.notion.stark"
      />
      <button
        className={btnStyles["nq-button"]}
        disabled={!isDomainValid}
        onClick={submit}
      >
        Resolve
      </button>
      <div>{error ? error : null}</div>
      <div>{address ? address : null}</div>
    </>
  );
};
