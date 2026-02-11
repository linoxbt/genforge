import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createClient, createAccount, generatePrivateKey, formatStakingAmount } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import type { Account, Address } from "viem";

interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "reward" | "payment" | "bounty" | "deploy" | "call";
  amount: number;
  description: string;
  timestamp: Date;
  hash?: string;
}

type ConnectionMode = "none" | "generated" | "metamask";

interface WalletContextType {
  address: string;
  balance: number;
  transactions: Transaction[];
  connectionMode: ConnectionMode;
  isConnecting: boolean;
  isConnected: boolean;
  client: ReturnType<typeof createClient> | null;
  account: ReturnType<typeof createAccount> | null;
  connectGenerated: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  deposit: (amount: number) => void;
  withdraw: (amount: number, description: string, type?: Transaction["type"]) => boolean;
  reward: (amount: number, description: string) => void;
  addTransaction: (tx: Omit<Transaction, "id" | "timestamp">) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

const PRIVATE_KEY_STORAGE = "genlayer_pk";

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("none");
  const [isConnecting, setIsConnecting] = useState(false);
  const [client, setClient] = useState<ReturnType<typeof createClient> | null>(null);
  const [account, setAccount] = useState<ReturnType<typeof createAccount> | null>(null);

  const isConnected = connectionMode !== "none";

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
      // bal is in wei, convert to GEN (18 decimals)
      setBalance(Number(bal) / 1e18);
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, [client, address]);

  const connectGenerated = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Reuse or generate private key
      let pk = localStorage.getItem(PRIVATE_KEY_STORAGE) as `0x${string}` | null;
      if (!pk) {
        pk = generatePrivateKey();
        localStorage.setItem(PRIVATE_KEY_STORAGE, pk);
      }

      const acc = createAccount(pk);
      const cl = createClient({
        chain: testnetAsimov,
        account: acc,
      });

      setAccount(acc);
      setClient(cl);
      setAddress(acc.address);
      setConnectionMode("generated");
      addTx({ type: "deposit", amount: 0, description: "Connected to GenLayer Asimov Testnet (generated wallet)" });
    } catch (e) {
      console.error("Generated wallet connection failed:", e);
    } finally {
      setIsConnecting(false);
    }
  }, [addTx]);

  const connectMetaMask = useCallback(async () => {
    setIsConnecting(true);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask.");
      }

      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0] as Address;

      const cl = createClient({
        chain: testnetAsimov,
        account: addr,
        provider: ethereum,
      });

      setClient(cl);
      setAccount(null); // MetaMask manages signing
      setAddress(addr);
      setConnectionMode("metamask");
      addTx({ type: "deposit", amount: 0, description: "Connected to GenLayer Asimov Testnet (MetaMask)" });
    } catch (e) {
      console.error("MetaMask connection failed:", e);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [addTx]);

  const disconnect = useCallback(() => {
    setClient(null);
    setAccount(null);
    setAddress("");
    setBalance(0);
    setConnectionMode("none");
    setTransactions([]);
  }, []);

  // Refresh balance when connected
  useEffect(() => {
    if (isConnected && client && address) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, client, address, refreshBalance]);

  const deposit = (amount: number) => {
    setBalance((b) => b + amount);
    addTx({ type: "deposit", amount, description: "Deposit" });
  };

  const withdraw = (amount: number, description: string, type: Transaction["type"] = "withdraw") => {
    if (balance < amount) return false;
    setBalance((b) => b - amount);
    addTx({ type, amount: -amount, description });
    return true;
  };

  const reward = (amount: number, description: string) => {
    setBalance((b) => b + amount);
    addTx({ type: "reward", amount, description });
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        transactions,
        connectionMode,
        isConnecting,
        isConnected,
        client,
        account,
        connectGenerated,
        connectMetaMask,
        disconnect,
        refreshBalance,
        deposit,
        withdraw,
        reward,
        addTransaction: addTx,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
