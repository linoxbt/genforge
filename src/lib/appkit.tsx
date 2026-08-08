import { type ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { defineChain } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { testnetAsimov } from "genlayer-js/chains";

// GenLayer Asimov Testnet is not in Reown/viem's default chain list, so it needs
// a local definition. Built from genlayer-js's own canonical `testnetAsimov`
// (which carries GenLayer-specific fields like consensusMainContract and
// defaultNumberOfInitialValidators that genlayer-js's write path requires,
// and that a hand-rolled chain object won't have), plus the CAIP fields Reown
// needs for wallet-network-switching. One object serves both consumers instead
// of two chain definitions drifting apart.
export const genlayerAsimov = defineChain({
  ...testnetAsimov,
  caipNetworkId: "eip155:4221",
  chainNamespace: "eip155",
});

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "";

const metadata = {
  name: "GenForge",
  description: "Build & play on the GenLayer blockchain: Intelligent Contracts, on-chain AI, real GEN.",
  url: typeof window !== "undefined" ? window.location.origin : "https://genforge.app",
  icons: ["/favicon.ico"],
};

const networks: [typeof genlayerAsimov] = [genlayerAsimov];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

// Always initialize AppKit, even with an empty projectId. WalletContext calls
// useAppKit() unconditionally (it's a hook, it can't be called conditionally),
// and that hook throws synchronously during render if createAppKit() was never
// called. With no error boundary anywhere in the tree, that throw would blank
// the entire app rather than just failing to connect a wallet.
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  defaultNetwork: genlayerAsimov,
  features: { analytics: false, email: false, socials: false },
  themeMode: "dark",
});

if (!projectId) {
  console.warn(
    "[GenForge] VITE_REOWN_PROJECT_ID is not set. Wallet connection will not work. " +
    "Get a free project ID at https://cloud.reown.com and add it to your .env file."
  );
}

const queryClient = new QueryClient();

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
