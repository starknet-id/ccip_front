"use client";

import { TextField } from "@mui/material";
import { useMemo, useState } from "react";
import btnStyles from "../../../styles/button.module.css";
import { useIsValidDomain } from "../hooks/useIsValidDomain";
import { Abi, Contract, Provider, constants, shortString } from "starknet";
import naming_abi from "../../../abi/naming.json";
import { utils } from "starknetid.js";
import { decimalToHex, extractArrayFromErrorMessage } from "../utils/utils";

type CallResponse = {
  address?: any;
  res?: any;
  error?: any;
};

export const ResolvingForm = () => {
  const [domain, setDomain] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDomainValid = useIsValidDomain(domain);

  // We use Sequencer for now as the RPC provider is not returning detailed error messages
  const provider = useMemo(() => {
    return new Provider({
      sequencer: {
        network:
          process.env.NEXT_PUBLIC_IS_TESTNET === "true"
            ? constants.NetworkName.SN_GOERLI
            : constants.NetworkName.SN_MAIN,
      },
    });
  }, []);

  const contract = useMemo(() => {
    return new Contract(
      naming_abi.abi as Abi,
      process.env.NEXT_PUBLIC_NAMING_CONTRACT as string,
      provider
    );
  }, [provider]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(event.target.value);
    setError(null);
    setAddress(null);
  };

  const submit = async () => {
    if (!isDomainValid) return;
    const encoded = domain
      ? utils.encodeDomain(domain).map((elem) => elem.toString())
      : [];

    const callResponse = await callContract(contract, encoded, []);

    if (callResponse.res) {
      const failureReason = shortString.decodeShortString(callResponse.res[0]);
      if (failureReason === "offchain_resolving") {
        const serverRes = await queryServer(
          shortString.decodeShortString(callResponse.res[1]) +
            shortString.decodeShortString(callResponse.res[2]),
          domain
        );
        if (serverRes.data) {
          const callResponse2 = await callContract(contract, encoded, [
            serverRes.data.address,
            serverRes.data.r,
            serverRes.data.s,
          ]);
          if (callResponse2.address)
            setAddress(decimalToHex(callResponse2.address as string));
          else if (callResponse2.error) setError(String(callResponse2.error));
          else setError("Error while resolving domain");
        } else if (serverRes.error) {
          setError(String(serverRes.error));
        } else {
          setError("Error while querying server");
        }
      } else {
        console.log("err from call");
      }
    }
  };

  const callContract = async (
    contract: Contract,
    encoded: string[],
    hint: string[]
  ): Promise<CallResponse> => {
    try {
      const res = await contract.call("resolve", [
        encoded,
        shortString.encodeShortString("starknet"),
        hint,
      ]);
      return { address: res };
    } catch (err) {
      const data = extractArrayFromErrorMessage(String(err));
      if (data) return { res: data };
      else return { error: err };
    }
  };

  const queryServer = async (serverUri: string, domain: string) => {
    try {
      const response = await fetch(`${serverUri}/resolve?domain=${domain}`);
      if (!response.ok) {
        throw new Error("Error while querying server");
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
