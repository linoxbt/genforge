import { useState, useEffect } from "react";
import { Trophy, Plus, Star, Upload, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { parseEther, formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { readClient, isExecutionSuccess, executionErrorMessage, WAIT_STATUS } from "@/lib/genlayer";
import { CONTRACTS } from "@/config/contracts";

interface Submission {
  id: string;
  submitter_address: string;
  description: string;
  link: string;
  score: number | null;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  status: string;
}

interface Bounty {
  id: string;
  title: string;
  description: string;
  criteria: string;
  reward: string; // atto-GEN
  status: string;
  creator_address: string;
  submissions: Submission[];
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
  const [submitting, setSubmitting] = useState(false);
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isConnected, client } = useWallet();

  const fetchBounties = async () => {
    try {
      const data = await readClient.readContract({
        address: CONTRACTS.bountyBoard,
        functionName: "list_bounties",
        args: [],
      });
      setBounties((data as unknown as Bounty[]) || []);
    } catch (e) {
      console.error("[GenForge] Failed to fetch bounties:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBounties(); }, []);

  const createBounty = async () => {
    if (!title || !description || !rewardAmt || !criteria) return;
    if (!isConnected || !client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    let value: bigint;
    try {
      value = parseEther(rewardAmt);
      if (value <= 0n) throw new Error("Reward must be greater than zero");
    } catch {
      toast({ title: "Invalid reward amount", variant: "destructive" });
      return;
    }

    setConfirming(true);
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.bountyBoard,
        functionName: "create_bounty",
        args: [title, description, criteria],
        value,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 90, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      toast({ title: "Bounty created on-chain!", description: `tx: ${String(txHash).slice(0, 14)}...` });
      setShowCreate(false);
      setTitle(""); setDescription(""); setRewardAmt(""); setCriteria("");
      fetchBounties();
    } catch (e: any) {
      toast({ title: "Failed to create bounty", description: e.message, variant: "destructive" });
    }
    setConfirming(false);
  };

  const submitWork = async (bountyId: string) => {
    if (!subDescription || !subLink) return;
    if (!isConnected || !client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.bountyBoard,
        functionName: "submit_work",
        args: [BigInt(bountyId), subDescription, subLink],
        value: 0n,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 90, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      setShowSubmit(null);
      setSubDescription(""); setSubLink("");
      fetchBounties();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const reviewSubmission = async (bountyId: string, submissionId: string) => {
    if (!client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    setReviewingIds((prev) => new Set(prev).add(submissionId));
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.bountyBoard,
        functionName: "review_submission",
        args: [BigInt(bountyId), BigInt(submissionId)],
        value: 0n,
      });
      // AI review + validator consensus can take a while: this is a real on-chain
      // Intelligent Contract call, not an instant API response.
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 150, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));
      fetchBounties();
    } catch (e: any) {
      toast({ title: "AI review failed", description: e.message, variant: "destructive" });
    }
    setReviewingIds((prev) => { const next = new Set(prev); next.delete(submissionId); return next; });
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
            <p className="text-sm text-muted-foreground mt-1">Post bounties on-chain. A GenLayer Intelligent Contract evaluates quality for automated payouts.</p>
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

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-4">
            {bounties.length === 0 && !showCreate && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No bounties yet. Post one to get started.</p>
              </div>
            )}
            {bounties.map((bounty) => {
              const submissions = bounty.submissions || [];
              return (
                <Card key={bounty.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{bounty.title}</CardTitle>
                          <Badge className={bounty.status === "completed" ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"} variant="outline">
                            {bounty.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1">{bounty.description}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold font-mono text-foreground">{formatEther(BigInt(bounty.reward))} GEN</p>
                        <p className="text-xs text-muted-foreground">{submissions.length} submissions</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-secondary/30 rounded p-2">
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Criteria</p>
                      <p className="text-xs text-foreground">{bounty.criteria}</p>
                    </div>

                    {submissions.map((sub) => {
                      const isReviewing = reviewingIds.has(sub.id);
                      return (
                        <div key={sub.id} className={`border rounded p-3 text-sm ${sub.status === "accepted" ? "border-primary/30 bg-primary/5" : sub.status === "rejected" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{sub.submitter_address.slice(0, 8)}...{sub.submitter_address.slice(-4)}</span>
                            <div className="flex items-center gap-2">
                              {sub.score !== null && (
                                <span className={`font-bold text-xs font-mono ${sub.score >= 70 ? "text-primary" : "text-destructive"}`}>
                                  <Star className="w-3 h-3 inline mr-0.5" />{sub.score}/100
                                </span>
                              )}
                              {isReviewing ? (
                                <Badge variant="outline" className="text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />AI Reviewing (on-chain)</Badge>
                              ) : sub.status === "accepted" ? (
                                <Badge variant="outline" className="text-xs text-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>
                              ) : sub.status === "rejected" ? (
                                <Badge variant="outline" className="text-xs text-destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => reviewSubmission(bounty.id, sub.id)} className="text-xs h-7" disabled={!isConnected}>
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
                              {sub.strengths && sub.strengths.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {sub.strengths.map((s, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">✓ {s}</span>
                                  ))}
                                </div>
                              )}
                              {sub.weaknesses && sub.weaknesses.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {sub.weaknesses.map((w, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">✗ {w}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {bounty.status !== "completed" && (
                      showSubmit === bounty.id ? (
                        <div className="border border-border rounded p-3 space-y-2">
                          <Textarea placeholder="Describe your submission..." value={subDescription} onChange={(e) => setSubDescription(e.target.value)} className="text-sm" />
                          <Input placeholder="Link to work" value={subLink} onChange={(e) => setSubLink(e.target.value)} className="text-sm" />
                          <div className="flex gap-2">
                            <Button onClick={() => submitWork(bounty.id)} className="bg-primary text-primary-foreground text-xs" disabled={submitting}>
                              {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}Submit
                            </Button>
                            <Button variant="outline" onClick={() => setShowSubmit(null)} className="text-xs">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => setShowSubmit(bounty.id)} className="w-full text-xs" disabled={!isConnected}>
                          <Upload className="w-3 h-3 mr-1" /> Submit Work
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BountyReview;
