"use client";

import { TextField } from "@mui/material";
import { useMemo, useState } from "react";
import btnStyles from "../../../styles/button.module.css";
import { Provider, constants } from "starknet";
import { StarknetIdNavigator } from "starknetid.js";
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

  const starknetIdNavigator = useMemo(() => {
    return new StarknetIdNavigator(
      provider,
      constants.StarknetChainId.SN_SEPOLIA
    );
  }, [provider]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value);
    setError(null);
    setDomain(null);
  };

  const submit = async () => {
    setError(null);
    if (!isAddrValid) return;
    try {
      const response = await starknetIdNavigator.getStarkName(address);
      setDomain(response);
    } catch (error: any) {
      setError(error.message);
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
