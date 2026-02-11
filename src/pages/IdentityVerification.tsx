import { useState } from "react";
import { Shield, CheckCircle2, Clock, AlertCircle, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";

type VerificationStatus = "idle" | "pending" | "scanning" | "verifying" | "verified" | "failed";
interface VerificationRecord { id: string; platform: string; handle: string; status: VerificationStatus; timestamp: Date; txHash?: string; confidence?: number; }

const platforms = [
  { value: "twitter", label: "Twitter/X", icon: "𝕏" },
  { value: "github", label: "GitHub", icon: "⌘" },
  { value: "linkedin", label: "LinkedIn", icon: "in" },
  { value: "instagram", label: "Instagram", icon: "📷" },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  idle: { color: "text-muted-foreground", icon: Clock, label: "Ready" },
  pending: { color: "text-foreground", icon: Clock, label: "Pending" },
  scanning: { color: "text-accent", icon: Search, label: "Scanning" },
  verifying: { color: "text-primary", icon: Shield, label: "Verifying" },
  verified: { color: "text-primary", icon: CheckCircle2, label: "Verified" },
  failed: { color: "text-destructive", icon: AlertCircle, label: "Failed" },
};

const IdentityVerification = () => {
  const [platform, setPlatform] = useState("");
  const [handle, setHandle] = useState("");
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [currentStatus, setCurrentStatus] = useState<VerificationStatus>("idle");
  const { toast } = useToast();
  const { address, withdraw } = useWallet();

  const generateTxHash = () => "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  const startVerification = async () => {
    if (!platform || !handle) return;
    if (!withdraw(0.01, `Verify: ${handle}`, "payment")) {
      toast({ title: "Insufficient balance", description: "Verification costs 0.01 ETH", variant: "destructive" });
      return;
    }

    const id = Date.now().toString();
    setRecords((prev) => [{ id, platform, handle, status: "pending", timestamp: new Date() }, ...prev]);
    setCurrentStatus("pending");

    const steps: { status: VerificationStatus; delay: number }[] = [
      { status: "scanning", delay: 1500 },
      { status: "verifying", delay: 2500 },
      { status: Math.random() > 0.15 ? "verified" : "failed", delay: 2000 },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.delay));
      setCurrentStatus(step.status);
      setRecords((prev) => prev.map((r) => r.id === id
        ? { ...r, status: step.status, ...(step.status === "verified" ? { txHash: generateTxHash(), confidence: 85 + Math.random() * 15 } : {}) }
        : r));
    }
    setCurrentStatus("idle");
    setHandle("");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Identity Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Verify social media ownership on-chain. Costs 0.01 ETH.</p>
        </div>

        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">New Verification</CardTitle><CardDescription className="text-xs">Link social identity to your wallet</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{platforms.map((p) => <SelectItem key={p.value} value={p.value}><span className="flex items-center gap-2"><span>{p.icon}</span>{p.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Handle</label>
                <Input placeholder="@username" value={handle} onChange={(e) => setHandle(e.target.value)} />
              </div>
            </div>

            {currentStatus !== "idle" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-secondary/40 rounded p-3">
                <div className="flex items-center gap-4">
                  {(["pending", "scanning", "verifying", "verified"] as const).map((step, i) => {
                    const config = statusConfig[step];
                    const Icon = config.icon;
                    const isActive = step === currentStatus;
                    const isPast = ["pending", "scanning", "verifying", "verified"].indexOf(currentStatus) > ["pending", "scanning", "verifying", "verified"].indexOf(step);
                    return (
                      <div key={step} className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground animate-pulse" : isPast ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className={`text-xs ${isActive ? "text-primary" : isPast ? "text-primary" : "text-muted-foreground"}`}>{config.label}</span>
                        {i < 3 && <div className="w-6 h-px bg-border" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <Button onClick={startVerification} disabled={!platform || !handle || currentStatus !== "idle"} className="bg-primary text-primary-foreground">
              {currentStatus !== "idle" ? "Verifying..." : "Verify (0.01 ETH)"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">History</h2>
          <AnimatePresence>
            {records.length === 0 ? (
              <p className="text-muted-foreground text-xs">No verifications yet.</p>
            ) : records.map((record) => {
              const config = statusConfig[record.status];
              const Icon = config.icon;
              const platformInfo = platforms.find((p) => p.value === record.platform);
              return (
                <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{platformInfo?.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{platformInfo?.label}: {record.handle}</p>
                      <p className="text-xs text-muted-foreground font-mono">{record.timestamp.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.confidence && <span className="text-xs font-mono text-muted-foreground">{record.confidence.toFixed(0)}%</span>}
                    <Badge variant="outline" className={`text-xs ${config.color}`}><Icon className="w-3 h-3 mr-1" />{config.label}</Badge>
                    {record.txHash && <ExternalLink className="w-3 h-3 text-primary" />}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default IdentityVerification;
