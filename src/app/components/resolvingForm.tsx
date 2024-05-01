"use client";

import { TextField } from "@mui/material";
import { useMemo, useState } from "react";
import btnStyles from "../../../styles/button.module.css";
import { useIsValidDomain } from "../hooks/useIsValidDomain";
import { Provider, constants } from "starknet";
import { StarknetIdNavigator } from "starknetid.js";

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

  const starknetIdNavigator = useMemo(() => {
    return new StarknetIdNavigator(
      provider,
      constants.StarknetChainId.SN_SEPOLIA
    );
  }, [provider]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(event.target.value);
    setError(null);
    setAddress(null);
  };

  const submit = async () => {
    setError(null);
    if (!isDomainValid) return;
    try {
      const response = await starknetIdNavigator.getAddressFromStarkName(
        domain
      );
      setAddress(response);
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <>
      <h2 className="mb-3 font-bold">Offchain Resolving</h2>
      <TextField
        fullWidth
        value={domain}
        variant="outlined"
        onChange={onChange}
        label={
          isDomainValid != true && domain !== ""
            ? `"${domain}" is not a valid subdomain of notion.stark`
            : "Your domain name: test.notion.stark"
        }
        required={true}
        placeholder="test.notion.stark"
        className="mb-4"
      />
      <button
        className={btnStyles["nq-button"]}
        disabled={!isDomainValid}
        onClick={submit}
      >
        Resolve
      </button>
      <div className="mt-4">
        {error ? `Error while resolving domain: ${error}` : null}
      </div>
      <div className="mt-4">
        {address ? `${domain} resolves to ${address}` : null}
      </div>
    </>
  );
};
