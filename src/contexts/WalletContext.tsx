import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { createClient } from "genlayer-js";
import type { Address } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { genlayerAsimov } from "@/lib/appkit";

interface Transaction {
  id: string;
  type: "connect" | "bet" | "reward" | "payment" | "bounty" | "deploy" | "call";
  amount: number;
  description: string;
  timestamp: Date;
  hash?: string;
}

interface WalletContextType {
  address: string;
  balance: number;
  transactions: Transaction[];
  isConnecting: boolean;
  isConnected: boolean;
  client: ReturnType<typeof createClient> | null;
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, "id" | "timestamp">) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address: wagmiAddress, isConnected, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open } = useAppKit();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [client, setClient] = useState<ReturnType<typeof createClient> | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const lastLoggedAddress = useRef<string | null>(null);

  const address = wagmiAddress || "";

  const addTx = useCallback((tx: Omit<Transaction, "id" | "timestamp">) => {
    setTransactions((prev) => [
      { ...tx, id: Date.now().toString(), timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!client || !address) return;
    try {
      const bal = await client.getBalance({ address: address as Address });
      setBalance(Number(bal) / 1e18);
    } catch (e) {
      console.warn("[GenForge] Balance fetch failed (this is normal if RPC is unreachable):", e);
    }
  }, [client, address]);

  // Build the GenLayer client from whichever wallet Reown/wagmi connected.
  // The client signs through the real connector's EIP-1193 provider, so writes
  // actually prompt the wallet and settle on-chain.
  useEffect(() => {
    let cancelled = false;

    if (!isConnected || !wagmiAddress || !connector) {
      setClient(null);
      return;
    }

    setIsConnecting(true);
    (async () => {
      try {
        const provider = await connector.getProvider();
        const cl = createClient({ chain: genlayerAsimov, account: wagmiAddress, provider: provider as any });
        try {
          await cl.connect("testnetAsimov");
        } catch (switchErr) {
          console.warn("[GenForge] Could not auto-switch wallet network. Please switch to GenLayer Asimov Testnet manually.", switchErr);
        }
        if (cancelled) return;
        setClient(cl);

        if (lastLoggedAddress.current !== wagmiAddress) {
          lastLoggedAddress.current = wagmiAddress;
          addTx({ type: "connect", amount: 0, description: `Connected via ${connector.name} (Asimov Testnet)` });
        }
      } catch (e) {
        console.error("[GenForge] Failed to initialize GenLayer client:", e);
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isConnected, wagmiAddress, connector, addTx]);

  useEffect(() => {
    if (isConnected && client && address) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
    setBalance(0);
  }, [isConnected, client, address, refreshBalance]);

  const connect = useCallback(() => { open(); }, [open]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setClient(null);
    setBalance(0);
    setTransactions([]);
    lastLoggedAddress.current = null;
  }, [wagmiDisconnect]);

  return (
    <WalletContext.Provider
      value={{
        address, balance, transactions, isConnecting, isConnected: isConnected && !!client,
        client, connect, disconnect, refreshBalance, addTransaction: addTx,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
