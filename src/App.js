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

const convertHexToBench32 = (hex) => {
  const addressHex = Buffer.from(hex, "hex");

  const address = CardanoWasm.BaseAddress.from_address(
    CardanoWasm.Address.from_bytes(addressHex)
  )
    .to_address()
    .to_bech32();
  return address;
};

var CardanoWasm = null;
const makeLoader = async () => {
  CardanoWasm = await cardano();
};

makeLoader();

export default function App() {
  const [connected, setConnected] = useState();
  const [address, setAddress] = useState();
  //   const [changeAddress, setChangeAddress] = useState();
  const [unusedAddress, setUnusedAddress] = useState();
  const [nfts, setNfts] = useState([]);
  const [balance, setBalance] = useState();
  const [tx, setTx] = useState();
  const [utxos, setUtxos] = useState();
  const [signature, setSignature] = useState();
  const [error, setError] = useState();
  const [response, setResponse] = useState();

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
        setResponse(JSON.stringify(result));
        setConnected(result);
      })
      .catch((e) => {
        console.error(e);
        setError(JSON.stringify(e));
      });
  };

  const getUsedAddresses = async () => {
    // retrieve address of nami wallet
    try {
      if (!connected) {
        await connect();
      }
      const response = await window.cardano.getUsedAddresses();
      console.log("getting used addresses response:>>", response);
      setResponse(JSON.stringify(response));
      setAddress(convertHexToBench32(response[0]));
    } catch (e) {
      console.error("get address has an error:>>", e);
      setError(JSON.stringify(e));
    }
  };

  const getUtxos = async () => {
    try {
      if (!connected) {
        await connect();
      }
      const response = await window.cardano.getUtxos();
      console.log("getting used addresses response:>>", response);
      setUtxos(response);
      setResponse(JSON.stringify(response));
    } catch (e) {
      console.error("getting utxos has an error:>>", e);
      setError(JSON.stringify(e));
    }
  };

  const getChangeAddress = async () => {
    try {
      if (!connected) {
        await connect();
      }
      const response = await window.cardano.getChangeAddress();
      setAddress(convertHexToBench32(response));
      setResponse(JSON.stringify(response));
    } catch (e) {
      console.error("getting change address has an error:>>", e);
      setError(JSON.stringify(e));
    }
  };

  const signTx = async () => {
    try {
      if (!connected) {
        await connect();
      }
      if (!utxos) {
        return alert("Should request utxos first");
      }

      if (!address) {
        return alert("Should request change address first");
      }

      const tx =
        "83a4008182582063dfb3a817214708ea76ff6e740458a85c3fdd6e42f5d9417cb449800051784d00018282583901fc9f23dd22a85f022de47936457333e74bb8aec0e9c9ade2104ca5a7e296d940f1326c737fb50f6fa3f313a0948bbc3e5487c91e42d3be181a000f424082583901830b1efa312210a4939ba31e9592f5ca94395757d55e0da1424382e62dd1d0536ed34809595f2ea9f41df6fd6f608975d7189d3ba1b3ea541a001e20e2021a00029151031a02e568a6a0f6";
      const response = await window.cardano.signTx(tx, true);
      setResponse(JSON.stringify(response));
    } catch (e) {
      console.error("signing transaction has an error:>>", e);
      setError(JSON.stringify(e));
    }
  };

  const getUnusedAddresses = async () => {
    try {
      console.log("get unused addresses....");
      if (!connected) {
        await connect();
      }
      const response = await window.cardano.getUnusedAddresses();
      setUnusedAddress(response);
      setResponse(JSON.stringify(response));
    } catch (e) {
      console.error("getting unused address has an error:>>", e);
      setError(JSON.stringify(e));
    }
  };

  const getBalance = async () => {
    // get balance of Nami Wallet
    try {
      if (!connected) {
        await connect();
      }

      setError(null);
      setResponse(null);

      const valueCBOR = await window.cardano.getBalance();
      setResponse(JSON.stringify(valueCBOR));
      const value = CardanoWasm.Value.from_bytes(Buffer.from(valueCBOR, "hex"));
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
    } catch (e) {
      console.error("get balance has an error:>>", e);
      setError(JSON.stringify(e));
    }
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
            <button className={`button btn-light`} onClick={getBalance}>
              {" "}
              Get Your Balance and NFTs{" "}
            </button>
            <button className={`button btn-light`} onClick={getUnusedAddresses}>
              {" "}
              Get Unused Addresses{" "}
            </button>
            <button className={`button btn-light`} onClick={getUsedAddresses}>
              {" "}
              Get Used Addresses{" "}
            </button>
            <button className={`button btn-light`} onClick={getChangeAddress}>
              {" "}
              Get Change Address{" "}
            </button>
            <button className={`button btn-light`} onClick={getUtxos}>
              {" "}
              Get Utxos{" "}
            </button>
            <button className={`button btn-light`} onClick={getUtxos}>
              {" "}
              Submit Tx{" "}
            </button>
            <button className={`button btn-light`} onClick={signTx}>
              {" "}
              Sign Tx{" "}
            </button>
            <button className={`button btn-light`} onClick={getUtxos}>
              {" "}
              Sign Data{" "}
            </button>
          </div>
        </div>
        <div
          className={`w-full mt-8 flex justify-start break-all p-4 border border-solid border-transparent rounded ${
            response ? "success" : "error"
          }`}
        >
          {response ? response : error}
        </div>
      </div>
    </>
  );
}
