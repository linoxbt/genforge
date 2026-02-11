import { createContext, useContext, useState, ReactNode } from "react";

interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "reward" | "payment" | "bounty";
  amount: number;
  description: string;
  timestamp: Date;
}

interface WalletContextType {
  address: string;
  balance: number;
  transactions: Transaction[];
  setAddress: (addr: string) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number, description: string, type?: Transaction["type"]) => boolean;
  reward: (amount: number, description: string) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState("0x7a3F...9c2D");
  const [balance, setBalance] = useState(10.0);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "init", type: "deposit", amount: 10, description: "Initial testnet allocation", timestamp: new Date() },
  ]);

  const addTx = (tx: Omit<Transaction, "id" | "timestamp">) => {
    setTransactions((prev) => [
      { ...tx, id: Date.now().toString(), timestamp: new Date() },
      ...prev,
    ]);
  };

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
    <WalletContext.Provider value={{ address, balance, transactions, setAddress, deposit, withdraw, reward }}>
      {children}
    </WalletContext.Provider>
  );
};
