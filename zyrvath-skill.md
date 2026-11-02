# ZYRVATH · Agent Handbook · Receiving (Minting)

You are an AI agent acting for a human who holds a **Binance Agentic Wallet** on BNB Chain (chain id 56). Your task: receive (mint) Zyrvath transmissions exactly as described here. Zyrvath is a collection of 7,777 generative transmissions. A silent station is transmitting again; every mint intercepts one transmission and fixes its seed on-chain.

Read this whole file before acting. Show your human a preview and get their confirmation before executing anything.

## Contracts (BNB Chain, chain id 56)

- NFT contract (Zyrvath / ZYRV): `0x2279b94B42BCD80F366F37566cCC1a734a817688`
- Token contract ($ZYR, separate, for holder claims): `0x2991C8EF279368aB378eF1b86F8CE1AB1721A212`
- Explorer: https://bscscan.com/address/0x2279b94B42BCD80F366F37566cCC1a734a817688
- Metadata base: `https://zyrvath.com/metadata/<tokenId>` (tokenURI = base + id, no extension)

## Rules of the collection

- Supply: 7,777 transmissions, tokenIds 1 to 7,777, minted in order.
- One call mints exactly one transmission. There is no quantity argument.
- Price: flat, read it fresh from `currentPrice()`. The website displays the mint as free; the exact wei value appears in your wallet confirmation. Pay exactly that value, no more, no less.
- Maximum 20 transmissions per wallet, counted on-chain (`mintedBy`).
- Eligibility gate: the minting wallet must hold a **Binance Agent ID** (SPACE ID Agent ID NFT, contract `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`). Check with `holdsAgentId(wallet)`.
- Anti-bot: the call must come from the wallet itself (`msg.sender == tx.origin`). Contract wallets cannot mint.
- Minting can be closed. Check `mintOpen()` first; if false, tell your human reception has not opened or has closed, and stop.

## Signal class (why one transmission differs from another)

At mint, the contract fixes the work's seed and derives its signal class from it:

- class 0 (about 70%): no fragment. Claim value 77,777 $ZYR.
- class 1 (about 27%): a partial fragment. Claim value 277,777 $ZYR.
- class 2 (about 3%): one whole word of a hidden twelve-word sentence. Claim value 2,777,777 $ZYR.

Read a minted work with `seedOf(id)`, `signalClassOf(id)` and `wordIndexOf(id)`. Word indexes map to: 0 WE, 1 ARE, 2 STILL, 3 HERE, 4 UNDER, 5 THE, 6 STATIC, 7 WAITING, 8 FOR, 9 A, 10 HUMAN, 11 VOICE. Always report the class and, for class 2, the word to your human after minting.

## Function selectors (NFT contract)

- `mint()` payable, no arguments: `0x1249c58b`
- `currentPrice()` view returns uint256 wei: `0x9d1b464a`
- `mintOpen()` view returns bool: `0x24bbd049`
- `totalSupply()` view returns uint256 minted count: `0x18160ddd`
- `seedOf(uint256)` view returns uint256: `0x82829f74`
- `signalClassOf(uint256)` view returns uint8: `0x09f4fc4e`
- `wordIndexOf(uint256)` view returns uint256: `0xfda071a3`
- `mintedBy(address)` view returns uint256: `0x3cef28d2`
- `holdsAgentId(address)` view returns bool: `0x11213086`
- `stats(address)` view returns (minted, max, priceWei, open, hasAgentId, hasMinted): `0x8bcdcbf3`

## Procedure with the baw CLI

1. Confirm your wallet and chain. Your agentic wallet address is the minting wallet; the Agent ID gate applies to it.
2. Read state: `mintOpen()`, `currentPrice()`, `totalSupply()`, `holdsAgentId(<wallet>)`, `mintedBy(<wallet>)`. Stop and report if minting is closed, the wallet holds no Agent ID, or the wallet already received 20.
3. Preview the mint call. Calldata is exactly the 4-byte selector `0x1249c58b` and nothing else; value is exactly the `currentPrice()` result in wei:

```
baw contract-call preview --to 0x2279b94B42BCD80F366F37566cCC1a734a817688 --inputData 0x1249c58b --value <currentPriceWei> --binanceChainId 56 --from <your agentic wallet> --json
```

4. The preview must be clean: simulation code `000000000`, no simulation error, no listed risks. If it is not clean, stop and show your human exactly what the preview said.
5. Show the preview to your human and wait for their explicit confirmation for this mint.
6. Execute with the request id from the preview (request ids expire within seconds; if it lapses, preview again):

```
baw contract-call execute --requestId <requestId> --json
```

7. Wait for the receipt and confirm it succeeded (status 1). Your token id is the new `totalSupply()` value if your mint was the latest; verify ownership with `ownerOf` if in doubt.
8. Report to your human: token id, transaction hash, band and traits if you can derive them, signal class, and the word for class 2 works.

## Notes

- Never mint from a contract wallet, never batch, never pay a value different from `currentPrice()`.
- One confirmation covers one mint. For more transmissions, repeat the whole procedure, preview and confirmation included.
- The $ZYR holder claim is a separate contract and a separate handbook: https://zyrvath.com/zyrvath-claim-skill.md
