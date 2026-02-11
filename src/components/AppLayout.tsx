import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Trophy, Brain, Gamepad2, Dice5, Home, Code2, Key, Eye, EyeOff, Copy, Check, ExternalLink } from "lucide-react";
import { useWallet, getAvailableWallets } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import genForgeLogo from "@/assets/genforge-logo.png";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/bounties", icon: Trophy, label: "Bounties" },
  { path: "/trivia", icon: Brain, label: "Trivia" },
  { path: "/rpg", icon: Gamepad2, label: "Game Master" },
  { path: "/betting", icon: Dice5, label: "Betting" },
  { path: "/deploy", icon: Code2, label: "Deploy" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { address, balance, isConnected, isConnecting, connectionMode, connectGenerated, connectInjected, disconnect, privateKey } = useWallet();
  const [showPK, setShowPK] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const { toast } = useToast();

  const copyPK = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Private key copied", description: "Keep it safe! Never share it." });
    }
  };

  const availableWallets = getAvailableWallets();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1">
        <aside className="w-56 border-r border-border bg-card/50 flex flex-col shrink-0 sticky top-0 h-screen">
          <div className="p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <img src={genForgeLogo} alt="GenForge" className="w-6 h-6 rounded" />
              <span className="font-mono font-bold text-foreground text-sm">GenForge</span>
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
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold text-foreground">{balance.toFixed(4)} GEN</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono px-2 truncate">{address}</p>
                <p className="text-xs text-muted-foreground font-mono px-2">Asimov Testnet</p>

                {/* Private Key Viewer for generated wallets */}
                {connectionMode === "generated" && privateKey && (
                  <div className="px-2 space-y-1">
                    <button
                      onClick={() => setShowPK(!showPK)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                    >
                      <Key className="w-3 h-3" />
                      {showPK ? "Hide" : "Show"} Private Key
                      {showPK ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    {showPK && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded p-1.5 relative">
                        <p className="text-[9px] text-destructive font-mono break-all pr-5">{privateKey}</p>
                        <button onClick={copyPK} className="absolute top-1 right-1">
                          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={disconnect} className="text-xs text-destructive hover:underline px-2 font-mono">
                  Disconnect
                </button>
              </>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={connectGenerated}
                  disabled={isConnecting}
                  className="w-full text-xs font-mono px-2 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Generate Wallet"}
                </button>

                {availableWallets.length > 0 ? (
                  <>
                    <button
                      onClick={() => setShowWalletPicker(!showWalletPicker)}
                      className="w-full text-xs font-mono px-2 py-1.5 rounded border border-border text-foreground hover:bg-secondary transition-colors"
                    >
                      Connect Wallet
                    </button>
                    {showWalletPicker && (
                      <div className="space-y-1 pl-1">
                        {availableWallets.map((w) => (
                          <button
                            key={w.name}
                            onClick={() => { connectInjected(w.name); setShowWalletPicker(false); }}
                            disabled={isConnecting}
                            className="w-full text-xs font-mono px-2 py-1 rounded hover:bg-secondary transition-colors text-left text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <span>{w.icon}</span> {w.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground px-2">No EVM wallets detected</p>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-mono">
            <img src={genForgeLogo} alt="GenForge" className="w-4 h-4 rounded" />
            <span>GenForge</span>
          </div>
          <a
            href="https://x.com/linoxbt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1"
          >
            Made by Lino <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
