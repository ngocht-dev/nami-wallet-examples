import React, { useEffect, useState } from "react";
import { Buffer } from "buffer";
import cardano from "./nami-js/index";
import "./App.css";
import AssetFingerprint from "@emurgo/cip14-js";

// Helper functions
const hexToAscii = (hex) => {
  // connverts hex to ascii string
  var _hex = hex.toString();
  var str = "";
  for (var i = 0; i < _hex.length && _hex.substr(i, 2) !== "00"; i += 2)
    str += String.fromCharCode(parseInt(_hex.substr(i, 2), 16));
  return str;
};

export default function App() {
  const [connected, setConnected] = useState();
  const [address, setAddress] = useState();
  const [nfts, setNfts] = useState([]);
  const [balance, setBalance] = useState();
  const [err, setErr] = useState();
  const [res, setRes] = useState();

  useEffect(() => {
    checkConnection();
  }, []);

  // Nami functionalities
  const checkConnection = async () => {
    // Checks if nami wallet is already connected to website
    await window.cardano.isEnabled().then((result) => {
      setConnected(result);
    });
  };
  const connect = async () => {
    // Connects nami wallet to current website
    await window.cardano
      .enable()
      .then((result) => {
        console.log("enable result:>>", JSON.stringify(result));
        setConnected(result);
      })
      .catch((e) => console.log(e));
  };

  const getAddress = async () => {
    // retrieve address of nami wallet
    try {
      setErr(null);
      setRes(null);
      if (!connected) {
        await connect();
      }
      const loader = await cardano();

      const response = await window.cardano.getUsedAddresses();
      setRes(response);
      const addressHex = Buffer.from(response[0], "hex");

      const address = loader.BaseAddress.from_address(
        loader.Address.from_bytes(addressHex)
      )
        .to_address()
        .to_bech32();

      setAddress(address);
    } catch (error) {
      console.error("get address has an error:>>", error);
      setErr(error);
    }
  };

  const getBalance = async () => {
    // get balance of Nami Wallet
    if (!connected) {
      await connect();
    }
    const loader = await cardano();
    const valueCBOR = await window.cardano.getBalance();
    const value = loader.Value.from_bytes(Buffer.from(valueCBOR, "hex"));
    const lovelace = parseInt(value.coin().to_str());

    const nfts = [];
    if (value.multiasset()) {
      const multiAssets = value.multiasset().keys();
      for (let j = 0; j < multiAssets.len(); j++) {
        const policy = multiAssets.get(j);
        const policyAssets = value.multiasset().get(policy);
        const assetNames = policyAssets.keys();
        for (let k = 0; k < assetNames.len(); k++) {
          const policyAsset = assetNames.get(k);
          const quantity = policyAssets.get(policyAsset);
          const asset =
            Buffer.from(policy.to_bytes(), "hex").toString("hex") +
            Buffer.from(policyAsset.name(), "hex").toString("hex");
          const _policy = asset.slice(0, 56);
          const _name = asset.slice(56);
          const fingerprint = new AssetFingerprint(
            Buffer.from(_policy, "hex"),
            Buffer.from(_name, "hex")
          ).fingerprint();
          nfts.push({
            unit: asset,
            quantity: quantity.to_str(),
            policy: _policy,
            name: hexToAscii(_name),
            fingerprint,
          });
        }
      }
    }

    setBalance(lovelace);
    setNfts(nfts);
  };

  return (
    <>
      <div className="container">
        <h1 style={{ textAlign: "center" }}>
          Introduction to basic Nami wallet functionalities
        </h1>
        <p>
          In these small examples we demonstrate basic Nami wallet
          functionalities.
        </p>
        <p>
          If you do not have Nami Wallet installed you can download Nami Wallet{" "}
          <a href="https://namiwallet.io/" target="_blank">
            {" "}
            here
          </a>
          .
        </p>
        <div className="">
          <div className="flex justify-center">
            <button
              className={`button my-4 flex ${connected ? "success" : ""}`}
              onClick={connect}
            >
              {" "}
              {connected ? "Connected" : "Connect to Nami"}{" "}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className={`button btn-light`} onClick={getAddress}>
              {" "}
              Get Your Address{" "}
            </button>
            <button className={`button btn-light`} onClick={getBalance}>
              {" "}
              Get Your Balance and NFTs{" "}
            </button>
          </div>
        </div>
        <div
          className={`w-full mt-8 flex justify-start break-all p-4 border border-solid border-transparent rounded ${
            res ? "success" : "error"
          }`}
        >
          {res ? res : err}
        </div>
      </div>
    </>
  );
}
