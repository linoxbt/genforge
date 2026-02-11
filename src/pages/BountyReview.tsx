import { useState } from "react";
import { Trophy, Plus, Star, Upload, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

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

const sampleFeedback = [
  "Excellent implementation. Clean code architecture with proper error handling. All acceptance criteria met.",
  "Good effort but missing key requirements: no input validation and error states are not handled.",
  "Outstanding work. Performance optimized, well-documented, and includes comprehensive test coverage.",
  "Partial completion. The core functionality works but the UI doesn't match specifications.",
  "Meets all criteria. Efficient solution with thoughtful edge case handling.",
];

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

  const createBounty = () => {
    if (!title || !description || !reward || !criteria) return;
    const newBounty: Bounty = {
      id: Date.now().toString(),
      title,
      description,
      reward: Number(reward),
      criteria,
      status: "open",
      submissions: [],
      createdAt: new Date(),
    };
    setBounties((prev) => [newBounty, ...prev]);
    setShowCreate(false);
    setTitle(""); setDescription(""); setReward(""); setCriteria("");
  };

  const submitWork = (bountyId: string) => {
    if (!subDescription || !subLink || !subAddress) return;
    const submission: Submission = {
      id: Date.now().toString(),
      submitter: subAddress,
      description: subDescription,
      link: subLink,
      score: null,
      feedback: "",
      status: "pending",
      submittedAt: new Date(),
    };
    setBounties((prev) =>
      prev.map((b) =>
        b.id === bountyId ? { ...b, submissions: [...b.submissions, submission] } : b
      )
    );
    setShowSubmit(null);
    setSubDescription(""); setSubLink(""); setSubAddress("");
  };

  const reviewSubmission = async (bountyId: string, submissionId: string) => {
    setBounties((prev) =>
      prev.map((b) =>
        b.id === bountyId
          ? {
              ...b,
              status: "reviewing" as const,
              submissions: b.submissions.map((s) =>
                s.id === submissionId ? { ...s, status: "reviewing" as const } : s
              ),
            }
          : b
      )
    );

    await new Promise((r) => setTimeout(r, 3000));

    const score = Math.floor(40 + Math.random() * 60);
    const accepted = score >= 70;
    const feedback = sampleFeedback[Math.floor(Math.random() * sampleFeedback.length)];

    setBounties((prev) =>
      prev.map((b) =>
        b.id === bountyId
          ? {
              ...b,
              status: accepted ? "completed" : "open",
              submissions: b.submissions.map((s) =>
                s.id === submissionId
                  ? { ...s, score, feedback, status: accepted ? "accepted" : "rejected" }
                  : s
              ),
            }
          : b
      )
    );
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              Bounty Review & Payout
            </h1>
            <p className="text-muted-foreground mt-2">
              Post bounties, receive submissions, and let AI evaluate work quality for automatic payouts.
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground glow-cyan">
            <Plus className="w-4 h-4 mr-2" /> Post Bounty
          </Button>
        </div>

        {/* Create Bounty */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="gradient-border">
                <CardHeader>
                  <CardTitle>Create Bounty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Bounty Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Describe the work needed..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  <Textarea placeholder="Acceptance criteria (AI will evaluate against these)..." value={criteria} onChange={(e) => setCriteria(e.target.value)} />
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-foreground block mb-2">Reward (ETH)</label>
                      <Input type="number" step="0.01" placeholder="0.5" value={reward} onChange={(e) => setReward(e.target.value)} />
                    </div>
                    <Button onClick={createBounty} className="bg-primary text-primary-foreground">Deploy Bounty</Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bounties */}
        <div className="space-y-6">
          {bounties.length === 0 && !showCreate && (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No bounties posted yet. Create your first bounty above.</p>
            </div>
          )}
          {bounties.map((bounty) => (
            <Card key={bounty.id} className="gradient-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{bounty.title}</CardTitle>
                      <Badge className={bounty.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : bounty.status === "reviewing" ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-400"}>
                        {bounty.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">{bounty.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{bounty.reward} ETH</p>
                    <p className="text-xs text-muted-foreground">{bounty.submissions.length} submissions</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Acceptance Criteria</p>
                  <p className="text-sm text-foreground">{bounty.criteria}</p>
                </div>

                {/* Submissions */}
                <div className="space-y-3">
                  {bounty.submissions.map((sub) => (
                    <div key={sub.id} className={`border rounded-lg p-4 ${sub.status === "accepted" ? "border-emerald-500/30 bg-emerald-500/5" : sub.status === "rejected" ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{sub.submitter.slice(0, 10)}...</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{sub.submittedAt.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.score !== null && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-400" />
                              <span className={`font-bold text-sm ${sub.score >= 70 ? "text-emerald-400" : "text-red-400"}`}>{sub.score}/100</span>
                            </div>
                          )}
                          {sub.status === "reviewing" ? (
                            <Badge className="bg-primary/20 text-primary"><Clock className="w-3 h-3 mr-1 animate-spin" /> AI Reviewing</Badge>
                          ) : sub.status === "accepted" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1" /> Accepted & Paid</Badge>
                          ) : sub.status === "rejected" ? (
                            <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" /> Below Threshold</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => reviewSubmission(bounty.id, sub.id)}>
                              <Star className="w-3 h-3 mr-1" /> AI Review
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{sub.description}</p>
                      <a href={sub.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">{sub.link}</a>
                      {sub.feedback && (
                        <div className="mt-2 bg-secondary/30 rounded p-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">AI Feedback</p>
                          <p className="text-sm text-foreground">{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {bounty.status !== "completed" && (
                  showSubmit === bounty.id ? (
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <Input placeholder="Your Wallet (0x...)" value={subAddress} onChange={(e) => setSubAddress(e.target.value)} />
                      <Textarea placeholder="Describe your submission..." value={subDescription} onChange={(e) => setSubDescription(e.target.value)} />
                      <Input placeholder="Link to work (GitHub, demo, etc.)" value={subLink} onChange={(e) => setSubLink(e.target.value)} />
                      <div className="flex gap-2">
                        <Button onClick={() => submitWork(bounty.id)} className="bg-primary text-primary-foreground">
                          <Upload className="w-4 h-4 mr-2" /> Submit
                        </Button>
                        <Button variant="outline" onClick={() => setShowSubmit(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowSubmit(bounty.id)} className="w-full">
                      <Upload className="w-4 h-4 mr-2" /> Submit Work
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
