import { useState } from "react";
import { Settings as SettingsIcon, Copy, Check, Wallet, ExternalLink, Droplets, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";

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
        body: JSON.stringify({
          address,
          network: "Genlayer Testnet",
          token: "GEN",
          turnstileToken: "",
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Faucet request failed");
      }
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
    <Button
      variant="outline"
      size="sm"
      onClick={requestTokens}
      disabled={loading || cooldown}
      className="text-xs gap-1.5"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Droplets className="w-3.5 h-3.5" />}
      {cooldown ? "Cooldown (60s)" : loading ? "Requesting..." : "Request Testnet GEN"}
    </Button>
  );
};

const Settings = () => {
  const { address, balance, isConnected, connect, disconnect, transactions } = useWallet();
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied` });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings & Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your wallet, view keys, and review transaction history.</p>
        </div>

        {/* Wallet Connection */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Wallet
            </CardTitle>
            <CardDescription>
              {isConnected ? "Connected to GenLayer Asimov Testnet" : "No wallet connected"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-mono mb-1">Balance</p>
                    <p className="text-xl font-bold text-foreground font-mono">{balance.toFixed(4)} GEN</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-mono mb-1">Connection</p>
                    <Badge variant="outline" className="text-xs">Browser Wallet</Badge>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Address</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-foreground break-all flex-1">{address}</p>
                    <button onClick={() => copyText(address, "Address")}>
                      {copied === "Address" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />}
                    </button>
                  </div>
                </div>

                <FaucetButton address={address} />

                <Button variant="destructive" size="sm" onClick={disconnect} className="text-xs">
                  Disconnect Wallet
                </Button>
              </>
            ) : (
              <Button onClick={connect} className="bg-primary text-primary-foreground">
                <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        {isConnected && transactions.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Transaction History</CardTitle>
              <CardDescription>Recent wallet activity during this session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{tx.type}</Badge>
                      <span className="text-xs text-foreground">{tx.description}</span>
                    </div>
                    <span className={`text-xs font-mono ${tx.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(4)} GEN
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Network Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chain</span>
              <span className="text-foreground font-mono">GenLayer Asimov Testnet</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">RPC</span>
              <span className="text-foreground font-mono text-xs">https://asimov.genlayer.com</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Token</span>
              <span className="text-foreground font-mono">GEN</span>
            </div>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
            >
              GenLayer Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
