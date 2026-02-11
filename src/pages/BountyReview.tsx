import { useState } from "react";
import { Trophy, Plus, Star, Upload, Clock, CheckCircle2, XCircle } from "lucide-react";
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
}

const BountyReview = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmit, setShowSubmit] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [criteria, setCriteria] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subLink, setSubLink] = useState("");
  const [subAddress, setSubAddress] = useState("");
  const { toast } = useToast();
  const { withdraw, reward: walletReward } = useWallet();

  const createBounty = () => {
    if (!title || !description || !reward || !criteria) return;
    const amount = Number(reward);
    if (!withdraw(amount, `Bounty: ${title}`, "bounty")) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    const newBounty: Bounty = {
      id: Date.now().toString(), title, description, reward: amount, criteria,
      status: "open", submissions: [], createdAt: new Date(),
    };
    setBounties((prev) => [newBounty, ...prev]);
    setShowCreate(false);
    setTitle(""); setDescription(""); setReward(""); setCriteria("");
  };

  const submitWork = (bountyId: string) => {
    if (!subDescription || !subLink || !subAddress) return;
    const submission: Submission = {
      id: Date.now().toString(), submitter: subAddress, description: subDescription,
      link: subLink, score: null, feedback: "", status: "pending", submittedAt: new Date(),
    };
    setBounties((prev) =>
      prev.map((b) => b.id === bountyId ? { ...b, submissions: [...b.submissions, submission] } : b)
    );
    setShowSubmit(null);
    setSubDescription(""); setSubLink(""); setSubAddress("");
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

      const { score, accepted, feedback } = data;

      if (accepted) {
        walletReward(bounty.reward, `Bounty payout: ${bounty.title}`);
      }

      setBounties((prev) =>
        prev.map((b) => b.id === bountyId
          ? {
              ...b,
              status: accepted ? "completed" : "open",
              submissions: b.submissions.map((s) => s.id === submissionId
                ? { ...s, score, feedback, status: accepted ? "accepted" : "rejected" } : s),
            }
          : b)
      );
    } catch {
      // Fallback
      const score = Math.floor(40 + Math.random() * 60);
      const accepted = score >= 70;
      if (accepted) walletReward(bounty.reward, `Bounty payout: ${bounty.title}`);

      setBounties((prev) =>
        prev.map((b) => b.id === bountyId
          ? {
              ...b,
              status: accepted ? "completed" : "open",
              submissions: b.submissions.map((s) => s.id === submissionId
                ? { ...s, score, feedback: "AI review unavailable. Score generated locally.", status: accepted ? "accepted" : "rejected" } : s),
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
            <p className="text-sm text-muted-foreground mt-1">Post bounties, receive submissions, AI evaluates quality for payouts.</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Post Bounty
          </Button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-border">
                <CardHeader><CardTitle className="text-base">Create Bounty</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Bounty Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Describe the work needed..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  <Textarea placeholder="Acceptance criteria (AI evaluates against these)..." value={criteria} onChange={(e) => setCriteria(e.target.value)} />
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-foreground block mb-1">Reward (ETH)</label>
                      <Input type="number" step="0.01" placeholder="0.5" value={reward} onChange={(e) => setReward(e.target.value)} />
                    </div>
                    <Button onClick={createBounty} className="bg-primary text-primary-foreground">Deploy</Button>
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
              <p className="text-sm">No bounties yet.</p>
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
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-mono text-foreground">{bounty.reward} ETH</p>
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
                      <span className="font-mono text-xs text-muted-foreground">{sub.submitter.slice(0, 10)}...</span>
                      <div className="flex items-center gap-2">
                        {sub.score !== null && (
                          <span className={`font-bold text-xs font-mono ${sub.score >= 70 ? "text-primary" : "text-destructive"}`}>
                            <Star className="w-3 h-3 inline mr-0.5" />{sub.score}/100
                          </span>
                        )}
                        {sub.status === "reviewing" ? (
                          <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1 animate-spin" />Reviewing</Badge>
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
                      <div className="mt-1 bg-secondary/30 rounded p-1.5">
                        <p className="text-xs text-foreground"><span className="text-primary font-mono">AI:</span> {sub.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}

                {bounty.status !== "completed" && (
                  showSubmit === bounty.id ? (
                    <div className="border border-border rounded p-3 space-y-2">
                      <Input placeholder="Your Wallet (0x...)" value={subAddress} onChange={(e) => setSubAddress(e.target.value)} className="text-sm" />
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
