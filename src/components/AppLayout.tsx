import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, FileCheck, Trophy, Brain, Gamepad2, Dice5, Home, Wallet, Terminal, History } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/identity", icon: Shield, label: "Identity" },
  { path: "/contracts", icon: FileCheck, label: "Contracts" },
  { path: "/bounties", icon: Trophy, label: "Bounties" },
  { path: "/trivia", icon: Brain, label: "Trivia" },
  { path: "/rpg", icon: Gamepad2, label: "Game Master" },
  { path: "/betting", icon: Dice5, label: "Betting" },
  { path: "/wallet", icon: History, label: "Wallet" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { address, balance } = useWallet();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 border-r border-border bg-card/50 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-mono font-bold text-foreground text-sm">GenLayer</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{balance.toFixed(2)} ETH</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono px-2 truncate">{address}</p>
          <p className="text-xs text-muted-foreground font-mono px-2">Asimov Testnet</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
