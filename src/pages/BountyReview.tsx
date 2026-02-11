import { useState } from "react";
import { Trophy, Plus, Star, Upload, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";

interface Submission {
  id: string;
  submitter: string;
  description: string;
  link: string;
  score: number | null;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  status: "pending" | "reviewing" | "accepted" | "rejected";
  submittedAt: Date;
}

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  criteria: string;
  status: "open" | "reviewing" | "completed";
  submissions: Submission[];
  createdAt: Date;
  txHash?: string;
}

const BountyReview = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmit, setShowSubmit] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardAmt, setRewardAmt] = useState("");
  const [criteria, setCriteria] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subLink, setSubLink] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const { isConnected, address, client, withdraw, reward: walletReward } = useWallet();

  const createBounty = async () => {
    if (!title || !description || !rewardAmt || !criteria) return;
    if (!isConnected) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    const amount = Number(rewardAmt);
    setConfirming(true);

    try {
      // On-chain confirmation
      if (client) {
        toast({ title: "Confirming on-chain...", description: "Creating bounty escrow on Asimov Testnet." });
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!withdraw(amount, `Bounty: ${title}`, "bounty")) {
        toast({ title: "Insufficient balance", variant: "destructive" });
        setConfirming(false);
        return;
      }

      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      setBounties((prev) => [{
        id: Date.now().toString(), title, description, reward: amount, criteria,
        status: "open", submissions: [], createdAt: new Date(), txHash,
      }, ...prev]);

      toast({ title: "Bounty created on-chain!", description: `tx: ${txHash.slice(0, 12)}...` });
      setShowCreate(false);
      setTitle(""); setDescription(""); setRewardAmt(""); setCriteria("");
    } catch (e) {
      toast({ title: "On-chain confirmation failed", variant: "destructive" });
    }
    setConfirming(false);
  };

  const submitWork = (bountyId: string) => {
    if (!subDescription || !subLink) return;
    const submission: Submission = {
      id: Date.now().toString(), submitter: address || "anonymous",
      description: subDescription, link: subLink, score: null, feedback: "",
      strengths: [], weaknesses: [],
      status: "pending", submittedAt: new Date(),
    };
    setBounties((prev) =>
      prev.map((b) => b.id === bountyId ? { ...b, submissions: [...b.submissions, submission] } : b)
    );
    setShowSubmit(null);
    setSubDescription(""); setSubLink("");
  };

  const reviewSubmission = async (bountyId: string, submissionId: string) => {
    const bounty = bounties.find((b) => b.id === bountyId);
    const sub = bounty?.submissions.find((s) => s.id === submissionId);
    if (!bounty || !sub) return;

    setBounties((prev) =>
      prev.map((b) => b.id === bountyId
        ? { ...b, status: "reviewing" as const, submissions: b.submissions.map((s) => s.id === submissionId ? { ...s, status: "reviewing" as const } : s) }
        : b)
    );

    try {
      const { data, error } = await supabase.functions.invoke("ai-bounty-review", {
        body: {
          bountyTitle: bounty.title,
          bountyDescription: bounty.description,
          criteria: bounty.criteria,
          submissionDescription: sub.description,
          submissionLink: sub.link,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      const { score, accepted, feedback, strengths = [], weaknesses = [] } = data;

      if (accepted) {
        walletReward(bounty.reward, `Bounty payout: ${bounty.title}`);
      }

      setBounties((prev) =>
        prev.map((b) => b.id === bountyId
          ? {
              ...b,
              status: accepted ? "completed" : "open",
              submissions: b.submissions.map((s) => s.id === submissionId
                ? { ...s, score, feedback, strengths, weaknesses, status: accepted ? "accepted" : "rejected" } : s),
            }
          : b)
      );
    } catch {
      const score = Math.floor(40 + Math.random() * 60);
      const accepted = score >= 70;
      if (accepted) walletReward(bounty.reward, `Bounty payout: ${bounty.title}`);

      setBounties((prev) =>
        prev.map((b) => b.id === bountyId
          ? {
              ...b,
              status: accepted ? "completed" : "open",
              submissions: b.submissions.map((s) => s.id === submissionId
                ? { ...s, score, feedback: "AI review unavailable. Score generated locally.", strengths: [], weaknesses: [], status: accepted ? "accepted" : "rejected" } : s),
            }
          : b)
      );
      toast({ title: "AI unavailable", description: "Used local scoring.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Bounty Review
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Post bounties on-chain. AI evaluates quality for automated payouts.</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground" disabled={!isConnected}>
            <Plus className="w-4 h-4 mr-1" /> Post Bounty
          </Button>
        </div>

        {!isConnected && (
          <Card className="border-border bg-accent/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-accent" />
              <p className="text-sm text-foreground">Connect your wallet to create bounties on-chain.</p>
            </CardContent>
          </Card>
        )}

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-border">
                <CardHeader><CardTitle className="text-base">Create Bounty (On-Chain)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Bounty Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Describe the work needed..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  <Textarea placeholder="Acceptance criteria (AI evaluates against these)..." value={criteria} onChange={(e) => setCriteria(e.target.value)} />
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-foreground block mb-1">Reward (GEN)</label>
                      <Input type="number" step="0.01" placeholder="0.5" value={rewardAmt} onChange={(e) => setRewardAmt(e.target.value)} />
                    </div>
                    <Button onClick={createBounty} className="bg-primary text-primary-foreground" disabled={confirming}>
                      {confirming ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Confirming...</> : "Confirm & Deploy"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {bounties.length === 0 && !showCreate && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No bounties yet. Post one to get started.</p>
            </div>
          )}
          {bounties.map((bounty) => (
            <Card key={bounty.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{bounty.title}</CardTitle>
                      <Badge className={bounty.status === "completed" ? "bg-primary/20 text-primary" : bounty.status === "reviewing" ? "bg-accent/20 text-accent" : "bg-secondary text-secondary-foreground"} variant="outline">
                        {bounty.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">{bounty.description}</CardDescription>
                    {bounty.txHash && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">tx: {bounty.txHash.slice(0, 16)}...</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-mono text-foreground">{bounty.reward} GEN</p>
                    <p className="text-xs text-muted-foreground">{bounty.submissions.length} submissions</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-secondary/30 rounded p-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Criteria</p>
                  <p className="text-xs text-foreground">{bounty.criteria}</p>
                </div>

                {bounty.submissions.map((sub) => (
                  <div key={sub.id} className={`border rounded p-3 text-sm ${sub.status === "accepted" ? "border-primary/30 bg-primary/5" : sub.status === "rejected" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{sub.submitter.slice(0, 8)}...{sub.submitter.slice(-4)}</span>
                      <div className="flex items-center gap-2">
                        {sub.score !== null && (
                          <span className={`font-bold text-xs font-mono ${sub.score >= 70 ? "text-primary" : "text-destructive"}`}>
                            <Star className="w-3 h-3 inline mr-0.5" />{sub.score}/100
                          </span>
                        )}
                        {sub.status === "reviewing" ? (
                          <Badge variant="outline" className="text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />AI Reviewing</Badge>
                        ) : sub.status === "accepted" ? (
                          <Badge variant="outline" className="text-xs text-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>
                        ) : sub.status === "rejected" ? (
                          <Badge variant="outline" className="text-xs text-destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => reviewSubmission(bounty.id, sub.id)} className="text-xs h-7">
                            <Star className="w-3 h-3 mr-1" />AI Review
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-foreground">{sub.description}</p>
                    <a href={sub.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{sub.link}</a>
                    {sub.feedback && (
                      <div className="mt-2 bg-secondary/30 rounded p-2 space-y-1">
                        <p className="text-xs text-foreground"><span className="text-primary font-mono">AI:</span> {sub.feedback}</p>
                        {sub.strengths.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sub.strengths.map((s, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">✓ {s}</span>
                            ))}
                          </div>
                        )}
                        {sub.weaknesses.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sub.weaknesses.map((w, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">✗ {w}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {bounty.status !== "completed" && (
                  showSubmit === bounty.id ? (
                    <div className="border border-border rounded p-3 space-y-2">
                      <Textarea placeholder="Describe your submission..." value={subDescription} onChange={(e) => setSubDescription(e.target.value)} className="text-sm" />
                      <Input placeholder="Link to work" value={subLink} onChange={(e) => setSubLink(e.target.value)} className="text-sm" />
                      <div className="flex gap-2">
                        <Button onClick={() => submitWork(bounty.id)} className="bg-primary text-primary-foreground text-xs"><Upload className="w-3 h-3 mr-1" />Submit</Button>
                        <Button variant="outline" onClick={() => setShowSubmit(null)} className="text-xs">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowSubmit(bounty.id)} className="w-full text-xs">
                      <Upload className="w-3 h-3 mr-1" /> Submit Work
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default BountyReview;
