import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Trophy, Brain, Gamepad2, Dice5, Home, Code2, Wallet, Settings, BookOpen, Droplets, Loader2 } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import genForgeLogo from "@/assets/genforge-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/bounties", icon: Trophy, label: "Bounties" },
  { path: "/trivia", icon: Brain, label: "Trivia" },
  { path: "/rpg", icon: Gamepad2, label: "Game Master" },
  { path: "/betting", icon: Dice5, label: "Betting" },
  { path: "/deploy", icon: Code2, label: "Deploy" },
  { path: "/docs", icon: BookOpen, label: "Docs" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const FaucetButton = ({ address }: { address: string }) => {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const { toast } = useToast();
  const { refreshBalance } = useWallet();

  const requestTokens = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch("https://genlayer-faucet.vercel.app/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, network: "Genlayer Testnet", token: "GEN", turnstileToken: "" }),
      });
      if (!res.ok) throw new Error(await res.text() || "Faucet request failed");
      toast({ title: "Tokens requested!", description: "GEN tokens should arrive shortly." });
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60000);
      setTimeout(() => refreshBalance(), 5000);
    } catch (e: any) {
      toast({ title: "Faucet error", description: e.message || "Try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={requestTokens}
      disabled={loading || cooldown}
      className="flex items-center gap-1.5 text-xs font-mono px-2 py-1.5 rounded bg-sidebar-accent text-sidebar-accent-foreground hover:brightness-110 transition-all disabled:opacity-50 w-full justify-center"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Droplets className="w-3 h-3" />}
      {cooldown ? "Cooldown..." : loading ? "Requesting..." : "Get Testnet GEN"}
    </button>
  );
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { address, balance, isConnected, connect, disconnect } = useWallet();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-sidebar-border">
          <SidebarHeader className="border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
              <img src={genForgeLogo} alt="GenForge" className="w-6 h-6 rounded shrink-0" />
              <span className="font-mono font-bold text-sidebar-foreground text-sm group-data-[collapsible=icon]:hidden">GenForge</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link to={item.path}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:items-center">
            {isConnected ? (
              <div className="space-y-2 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                  <span className="text-sm font-bold text-sidebar-foreground truncate">{balance.toFixed(4)} GEN</span>
                </div>
                <p className="text-xs text-sidebar-foreground/60 font-mono px-2 truncate">{address}</p>
                <p className="text-xs text-sidebar-foreground/60 font-mono px-2">Asimov Testnet</p>
                <FaucetButton address={address} />
                <button onClick={disconnect} className="text-xs text-destructive hover:underline px-2 font-mono">
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                title="Connect Wallet"
                className="w-full flex items-center justify-center gap-2 text-xs font-mono px-2 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Connect Wallet</span>
              </button>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="flex items-center h-14 shrink-0 border-b border-border px-4 gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            {isConnected ? (
              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">{balance.toFixed(4)} GEN</span>
            ) : (
              <button onClick={connect} className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Connect Wallet
              </button>
            )}
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-border py-4 px-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-mono">
                <img src={genForgeLogo} alt="GenForge" className="w-4 h-4 rounded" />
                <span>GenForge</span>
              </div>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
