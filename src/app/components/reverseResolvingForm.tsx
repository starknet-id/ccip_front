"use client";

import { TextField } from "@mui/material";
import { useMemo, useState } from "react";
import btnStyles from "../../../styles/button.module.css";
import { CallData, Provider, shortString } from "starknet";
import { utils } from "starknetid.js";
import { useIsValidAddr } from "../hooks/useIsValidAddr";

type DecodedData = {
  errorType: string;
  domain_slice: string;
  uris: string[];
};

export const ReverseResolvingForm = () => {
  const [domain, setDomain] = useState<string | null>("");
  const [address, setAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const isAddrValid = useIsValidAddr(address);

  const provider = useMemo(() => {
    return new Provider({
      rpc: {
        nodeUrl: process.env.NEXT_PUBLIC_RPC_URL as string,
      },
    });
  }, []);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value);
    setError(null);
    setDomain(null);
  };

  const submit = async () => {
    setError(null);
    if (!isAddrValid) return;
    try {
      const response = await getStarkName(address);
      setDomain(response);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // todo: call starknetid.js function instead of this function
  const getStarkName = async (addr: string): Promise<string> => {
    const contract = process.env.NEXT_PUBLIC_NAMING_CONTRACT as string;
    try {
      return await tryResolveAddressSID(contract, addr, []);
    } catch (error) {
      if (error instanceof Error) {
        // extract server uri from error message
        const data = extractArrayFromErrorMessageSID(String(error));
        if (!data || data?.errorType !== "offchain_resolving") {
          // if the error is not related to offchain resolving
          throw new Error("Could not get address from stark name");
        }

        // we try querying the server for each uri, and will stop once one is working
        for (const uri of data.uris) {
          try {
            const serverRes = await queryServerSID(uri, data.domain_slice);
            if (serverRes.error) {
              continue;
            }
            // try resolving with hint
            const hint: any[] = [
              serverRes.data.address,
              serverRes.data.r,
              serverRes.data.s,
              serverRes.data.max_validity,
            ];
            return await tryResolveAddressSID(contract, addr, hint);
          } catch (error: any) {
            throw new Error(
              `Could not resolve domain on URI ${uri} : ${error.message}`
            );
          }
        }
        throw new Error("Could not resolve domain with any provided URI");
      } else {
        throw new Error("Could not get address from domain");
      }
    }
  };

  const tryResolveAddressSID = async (
    contract: string,
    address: string,
    hint: any = []
  ): Promise<string> => {
    const domainData = await provider.callContract({
      contractAddress: contract,
      entrypoint: "address_to_domain",
      calldata: CallData.compile({ address, hint }),
    });

    const decimalDomain = domainData.result
      .map((element) => BigInt(element))
      .slice(1);
    const stringDomain = utils.decodeDomain(decimalDomain);

    if (!stringDomain) {
      throw new Error("Could not get stark name");
    }
    return stringDomain;
  };

  const extractArrayFromErrorMessageSID = (errorMsg: string) => {
    const pattern = /Execution failed\. Failure reason: \((.*?)\)\./;
    const match = errorMsg.match(pattern);

    if (match && match[1]) {
      const values = match[1].split(",").map((value) => value.trim());
      const res = values.map((entry) => {
        const hexMatch = entry.match(/(0x[0-9a-f]+)/i);
        if (hexMatch && hexMatch[1]) {
          return hexMatch[1];
        }
      });
      return decodeErrorMsgSID(res as string[]);
    }

    return null;
  };

  const decodeErrorMsgSID = (array: string[]): DecodedData | null => {
    try {
      let index = 0;
      const result: DecodedData = {
        errorType: shortString.decodeShortString(array[index++]),
        domain_slice: "",
        uris: [],
      };

      // Decode domain
      const domainSize: number = parseInt(array[index++], 16);
      for (let i = 0; i < domainSize; i++) {
        result.domain_slice += utils
          .decodeDomain([BigInt(array[index++])])
          .replace(".stark", "");
        if (i < domainSize - 1) result.domain_slice += ".";
      }

      // Decode URIs
      while (index < array.length) {
        let uriSize = parseInt(array[index++], 16);
        let uri = "";
        for (let i = 0; i < uriSize; i++) {
          uri += shortString.decodeShortString(array[index++]);
        }
        result.uris.push(uri);
      }

      console.log("result", result);

      return result;
    } catch (error) {
      console.error("Error decoding array:", error);
      return null;
    }
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
      <h2 className="mt-5 mb-3 font-bold">Reverse Offchain Resolving</h2>
      <TextField
        fullWidth
        value={address}
        variant="outlined"
        onChange={onChange}
        label={
          isAddrValid != true && address !== ""
            ? `"${address}" is not a valid starknet address`
            : "Your starknet address"
        }
        required={true}
        placeholder="0x02207.....571faf"
        className="mb-4"
      />
      <button
        className={btnStyles["nq-button"]}
        disabled={!isAddrValid}
        onClick={submit}
      >
        Resolve
      </button>
      <div className="mt-4">
        {error ? `Error while resolving address: ${error}` : null}
      </div>
      <div className="mt-4">
        {domain ? `${address} resolves to ${domain}` : null}
      </div>
    </>
  );
};
