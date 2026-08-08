import { type ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { defineChain } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

// GenLayer Asimov Testnet — not in Reown/viem's default chain list.
export const genlayerAsimov = defineChain({
  id: 4221,
  caipNetworkId: "eip155:4221",
  chainNamespace: "eip155",
  name: "GenLayer Asimov Testnet",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://zksync-os-testnet-genlayer.zksync.dev"] },
  },
  blockExplorers: {
    default: { name: "GenLayer Asimov Explorer", url: "https://explorer-asimov.genlayer.com/" },
  },
  testnet: true,
});

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined;

const metadata = {
  name: "GenForge",
  description: "Build & play on the GenLayer blockchain — Intelligent Contracts, on-chain AI, real GEN.",
  url: typeof window !== "undefined" ? window.location.origin : "https://genforge.app",
  icons: ["/favicon.ico"],
};

const networks: [typeof genlayerAsimov] = [genlayerAsimov];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: projectId || "",
  ssr: false,
});

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    defaultNetwork: genlayerAsimov,
    features: { analytics: false, email: false, socials: false },
    themeMode: "dark",
  });
} else {
  console.warn(
    "[GenForge] VITE_REOWN_PROJECT_ID is not set — wallet connection will not work. " +
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
