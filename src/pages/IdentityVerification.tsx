import { useState } from "react";
import { Shield, CheckCircle2, Clock, AlertCircle, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

type VerificationStatus = "idle" | "pending" | "scanning" | "verifying" | "verified" | "failed";

interface VerificationRecord {
  id: string;
  platform: string;
  handle: string;
  status: VerificationStatus;
  timestamp: Date;
  txHash?: string;
  confidence?: number;
}

const platforms = [
  { value: "twitter", label: "Twitter/X", icon: "𝕏" },
  { value: "github", label: "GitHub", icon: "⌘" },
  { value: "linkedin", label: "LinkedIn", icon: "in" },
  { value: "instagram", label: "Instagram", icon: "📷" },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  idle: { color: "bg-muted", icon: Clock, label: "Ready" },
  pending: { color: "bg-yellow-500/20 text-yellow-400", icon: Clock, label: "Pending" },
  scanning: { color: "bg-blue-500/20 text-blue-400", icon: Search, label: "Scanning Profile" },
  verifying: { color: "bg-purple-500/20 text-purple-400", icon: Shield, label: "LLM Consensus" },
  verified: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2, label: "Verified" },
  failed: { color: "bg-red-500/20 text-red-400", icon: AlertCircle, label: "Failed" },
};

const IdentityVerification = () => {
  const [platform, setPlatform] = useState("");
  const [handle, setHandle] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [currentStatus, setCurrentStatus] = useState<VerificationStatus>("idle");

  const generateTxHash = () =>
    "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  const startVerification = async () => {
    if (!platform || !handle || !walletAddress) return;

    const id = Date.now().toString();
    const newRecord: VerificationRecord = {
      id,
      platform,
      handle,
      status: "pending",
      timestamp: new Date(),
    };

    setRecords((prev) => [newRecord, ...prev]);
    setCurrentStatus("pending");

    // Simulate verification pipeline
    const steps: { status: VerificationStatus; delay: number }[] = [
      { status: "scanning", delay: 1500 },
      { status: "verifying", delay: 2500 },
      { status: Math.random() > 0.15 ? "verified" : "failed", delay: 2000 },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.delay));
      setCurrentStatus(step.status);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: step.status,
                ...(step.status === "verified"
                  ? { txHash: generateTxHash(), confidence: 85 + Math.random() * 15 }
                  : {}),
              }
            : r
        )
      );
    }

    setCurrentStatus("idle");
    setHandle("");
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            On-chain Identity Verification
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify social media profile ownership on-chain. Intelligent Contracts browse your profile and confirm identity through AI consensus.
          </p>
        </div>

        {/* Verification Form */}
        <Card className="gradient-border">
          <CardHeader>
            <CardTitle>New Verification</CardTitle>
            <CardDescription>Link your social media identity to your wallet address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-center">{p.icon}</span>
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Handle / Username</label>
                <Input
                  placeholder="@username"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Wallet Address</label>
                <Input
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Status Pipeline */}
            {currentStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-secondary/50 rounded-lg p-4"
              >
                <div className="flex items-center gap-6">
                  {["pending", "scanning", "verifying", "verified"].map((step, i) => {
                    const config = statusConfig[step];
                    const Icon = config.icon;
                    const isActive = step === currentStatus;
                    const isPast =
                      ["pending", "scanning", "verifying", "verified"].indexOf(currentStatus) >
                      ["pending", "scanning", "verifying", "verified"].indexOf(step);
                    return (
                      <div key={step} className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground animate-pulse"
                              : isPast
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isActive ? "text-primary" : isPast ? "text-emerald-400" : "text-muted-foreground"
                          }`}
                        >
                          {config.label}
                        </span>
                        {i < 3 && <div className="w-8 h-px bg-border" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <Button
              onClick={startVerification}
              disabled={!platform || !handle || !walletAddress || currentStatus !== "idle"}
              className="bg-primary text-primary-foreground glow-cyan"
            >
              {currentStatus !== "idle" ? "Verifying..." : "Start Verification"}
            </Button>
          </CardContent>
        </Card>

        {/* Records */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Verification History</h2>
          <AnimatePresence>
            {records.length === 0 ? (
              <p className="text-muted-foreground text-sm">No verifications yet. Start one above.</p>
            ) : (
              records.map((record) => {
                const config = statusConfig[record.status];
                const Icon = config.icon;
                const platformInfo = platforms.find((p) => p.value === record.platform);
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                        {platformInfo?.icon}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {platformInfo?.label}: {record.handle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {record.confidence && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {record.confidence.toFixed(1)}% confidence
                        </span>
                      )}
                      <Badge className={config.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {record.txHash && (
                        <button className="text-primary hover:text-primary/80">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default IdentityVerification;
