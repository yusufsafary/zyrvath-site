# ZYRVATH · Agent Handbook · $ZYR Holder Claim

You are an AI agent acting for a human who holds Zyrvath NFTs in a **Binance Agentic Wallet** on BNB Chain (chain id 56). Your task: claim $ZYR for the human's Zyrvath transmissions exactly as described here.

Read this whole file before acting. Show your human a preview and get their confirmation before executing anything.

## Contracts (BNB Chain, chain id 56)

- Claim contract (ZyrvathClaim): `0x9DeeF5EDE4836c4154ef37Ea4a8b66AD89878631`
- NFT contract (Zyrvath / ZYRV): `0x2279b94B42BCD80F366F37566cCC1a734a817688`
- Token contract ($ZYR): `0x2991C8EF279368aB378eF1b86F8CE1AB1721A212`

## Rules of the claim

- Every Zyrvath transmission can be claimed **once**, by its **current holder**, for $ZYR. The claim follows the work: if the work changes hands before being claimed, the new holder claims it; a claimed work can never be claimed again.
- The amount follows the work's signal class, fixed at mint:
  - class 0, no fragment: **77,777 $ZYR**
  - class 1, partial fragment: **277,777 $ZYR**
  - class 2, whole word: **2,777,777 $ZYR**
- Claim fee: 0. Send exactly 0 wei with the call; the claim costs gas only.
- Anti-bot: the call must come from the wallet itself (`msg.sender == tx.origin`).
- Claims can be closed. Check `claimOpen()` first; if false, tell your human claims are not open, and stop.
- If the claim pool cannot cover a work's amount, the claim reverts. Report that plainly; do not retry in a loop.

## Function selectors

Claim contract:
- `claim(uint256 tokenId)` payable: `0x379607f5`
- `claimAmount(uint256)` view returns uint256 wei of $ZYR (0 for unminted works): `0x23b221a0`
- `claimOpen()` view returns bool: `0x4b8bcb58`
- `claimFee()` view returns uint256 (0): `0x99d32fc4`
- `claimedById(uint256)` view returns bool: `0x4c80ee12`
- `totalClaimed()` view returns uint256: `0xd54ad2a1`
- `claimsRemaining()` view returns uint256: `0x754c463f`
- `poolBalance()` view returns uint256 wei of $ZYR: `0x96365d44`

NFT contract (for class and word):
- `signalClassOf(uint256)` view returns uint8: `0x09f4fc4e`
- `wordIndexOf(uint256)` view returns uint256: `0xfda071a3`
- `ownerOf(uint256)` view returns address: `0x6352211e`

Word indexes: 0 WE, 1 ARE, 2 STILL, 3 HERE, 4 UNDER, 5 THE, 6 STATIC, 7 WAITING, 8 FOR, 9 A, 10 HUMAN, 11 VOICE.

## Procedure with the baw CLI

For each tokenId your human asks about:

1. Read state: `claimOpen()` on the claim contract; `ownerOf(tokenId)` must be your human's wallet; `claimedById(tokenId)` must be false; `claimAmount(tokenId)` gives the exact $ZYR amount.
2. Build calldata: selector `0x379607f5` followed by the tokenId as a 32-byte word.
3. Preview with value 0:

```
baw contract-call preview --to 0x9DeeF5EDE4836c4154ef37Ea4a8b66AD89878631 --inputData 0x379607f5<tokenId as 64 hex digits, zero padded> --value 0 --binanceChainId 56 --from <your agentic wallet> --json
```

4. The preview must be clean: simulation code `000000000`, no simulation error, no listed risks, and the simulated token movement must match `claimAmount(tokenId)`. If anything differs, stop and show your human the preview.
5. Show the preview to your human and wait for explicit confirmation for this claim.
6. Execute:

```
baw contract-call execute --requestId <requestId> --json
```

7. Confirm the receipt succeeded, then verify: `claimedById(tokenId)` is true and the wallet's $ZYR balance increased by exactly the claim amount.
8. Report: token id, amount claimed, transaction hash, and the work's signal class (and word, for class 2).

## Notes

- One confirmation covers one claim for one tokenId. Repeat the full procedure per work.
- Never claim for a work the wallet does not currently hold.
- The minting handbook is separate: https://zyrvath.com/zyrvath-skill.md
