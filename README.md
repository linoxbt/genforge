# GenForge

GenForge is a suite of five applications built entirely on [GenLayer](https://www.genlayer.com/) Intelligent Contracts — Python smart contracts that call LLMs directly and settle on real multi-validator consensus (GenLayer's Optimistic Democracy). There is no off-chain database standing in for the blockchain: escrow, AI scoring, bet resolution, and RPG state all live in on-chain contract storage, and every AI decision has to be independently agreed on by validators before it's accepted.

**Live on GenLayer Asimov Testnet.**

## What's in the box

| Tool | Route | What it does |
|---|---|---|
| **Bounty Review** | `/bounties` | Post a bounty with a real GEN reward escrowed in the contract. Anyone can submit work; anyone can trigger an on-chain AI review that scores the submission and pays the winner atomically. |
| **P2P Betting** | `/betting` | Create a prediction market, wager GEN on either side, and trigger an on-chain AI resolution that pays out the winning side proportionally from the pool. |
| **Trivia Games** | `/trivia` | Questions and their answer keys are generated live by validator consensus. Answering is a fast deterministic on-chain check; correct answers pay a small GEN reward. |
| **Game Master** | `/rpg` | A text RPG narrated turn-by-turn by an on-chain LLM call — HP, gold, and XP all change based on a consensus-verified outcome. Leveling up pays a GEN reward. |
| **Deploy Contracts** | `/deploy` | Write a Python Intelligent Contract in the browser and deploy it straight to Asimov testnet. |

## Architecture

```
contracts/                  Python Intelligent Contracts (source of truth for on-chain state)
  bounty_board.py
  prediction_market.py
  trivia_rewards.py
  dungeon_master.py

src/
  config/contracts.ts       Deployed contract addresses (Asimov testnet)
  lib/appkit.tsx            Reown AppKit + wagmi wallet configuration
  lib/genlayer.ts           Shared genlayer-js read client + tx-status helpers
  contexts/WalletContext.tsx  Bridges the connected wallet into a genlayer-js client
  pages/                    One page per tool, each calling its contract directly
```

There's no backend. The frontend talks to the deployed contracts directly via [`genlayer-js`](https://github.com/genlayerlabs/genlayer-js); wallet connection and signing are handled by [Reown AppKit](https://reown.com/appkit) — GenForge itself never generates, stores, or has access to a private key.

Each contract calls its LLM through `gl.nondet.exec_prompt`, and every non-deterministic result (a score, a resolved bet, a narrated turn) is subject to a custom validator-agreement check before it's written to storage — see the contract source for the exact equivalence-principle logic used in each case.

### Deployed contracts (Asimov testnet)

| Contract | Address |
|---|---|
| `BountyBoard` | [`0x7eF217F1A3a05D9f93cA64DDDB0d2B3B3c661249`](https://explorer-asimov.genlayer.com/address/0x7eF217F1A3a05D9f93cA64DDDB0d2B3B3c661249) |
| `PredictionMarket` | [`0xE1acC4AD01609E77235c0D61854589905444A713`](https://explorer-asimov.genlayer.com/address/0xE1acC4AD01609E77235c0D61854589905444A713) |
| `TriviaRewards` | [`0x28dA35D4Dc3388805dB23bCDc469707360650acE`](https://explorer-asimov.genlayer.com/address/0x28dA35D4Dc3388805dB23bCDc469707360650acE) |
| `DungeonMaster` | [`0x7ba49B8a80B10EDc84ff6AB04E04B8ffbC92B7Da`](https://explorer-asimov.genlayer.com/address/0x7ba49B8a80B10EDc84ff6AB04E04B8ffbC92B7Da) |

`trivia_rewards` and `dungeon_master` pay small GEN rewards from their own contract balance — each exposes a `fund_rewards()` payable method to top up the pool; if it's empty, correct answers and level-ups are still recorded, just without a payout.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Chain**: GenLayer Asimov Testnet, via `genlayer-js`
- **Wallet**: Reown AppKit + wagmi (MetaMask, Coinbase Wallet, WalletConnect-compatible wallets, and any injected EVM provider)
- **Contracts**: Python (GenVM), linted with `genvm-linter`

## Getting started

### Prerequisites

- Node.js 20+ and npm (or [bun](https://bun.sh))
- A free [Reown Cloud](https://cloud.reown.com) project ID (required for wallet connection)
- A browser wallet (MetaMask, Coinbase Wallet, Rabby, etc.) with GenLayer Asimov testnet GEN — get some from the [testnet faucet](https://testnet-faucet.genlayer.foundation/)

### Setup

```sh
git clone https://github.com/linoxbt/genforge.git
cd genforge
npm install

cp .env.example .env
# then edit .env and set VITE_REOWN_PROJECT_ID

npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the test suite (Vitest) |
| `npm run preview` | Preview the production build locally |

## Working on the contracts

The Python contracts under `contracts/` are independent of the frontend build — deploying a new version doesn't require touching the app beyond updating its address in `src/config/contracts.ts`.

```sh
pip install genvm-linter
genvm-lint check contracts/bounty_board.py    # lint + validate
genvm-lint typecheck contracts/bounty_board.py

npm install -g genlayer                        # GenLayer CLI
genlayer network set testnet-asimov
genlayer account create --name deploy
# fund the printed address via the testnet faucet, then:
genlayer deploy --contract contracts/bounty_board.py
```

Every contract pins a concrete GenVM runner version in its `# { "Depends": ... }` header — unpinned or `:latest`/`:test` runner aliases are rejected by the network.

## Deployment

The app is a static Vite build with no server component. A [`netlify.toml`](./netlify.toml) is included (build command, SPA redirect, cache headers) for one-click Netlify deploys — set `VITE_REOWN_PROJECT_ID` in the site's environment variables. Any static host (Vercel, Cloudflare Pages, GitHub Pages) works the same way: `npm run build` and serve `dist/` with an SPA fallback to `index.html`.

## Security notes

- This is a **testnet application**. Do not send real funds to any of these contracts or to a wallet used only for testing.
- GenForge never has access to your private keys — connection and signing happen entirely inside your wallet via Reown.
- Escrowed GEN lives in each contract's own on-chain balance; there's no off-chain ledger that could drift from what's actually on-chain.

## Learn more

- [GenLayer documentation](https://docs.genlayer.com)
- [GenLayer Asimov Explorer](https://explorer-asimov.genlayer.com/)
- [Reown AppKit documentation](https://docs.reown.com/appkit/overview)
