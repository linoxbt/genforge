import { useState } from "react";
import { FileCheck, Plus, CheckCircle2, Circle, DollarSign, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  completed: boolean;
  verifying: boolean;
  paid: boolean;
}

interface Contract {
  id: string;
  title: string;
  client: string;
  contractor: string;
  totalAmount: number;
  milestones: Milestone[];
  createdAt: Date;
}

const PerformanceContracting = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [contractor, setContractor] = useState("");
  const [milestones, setMilestones] = useState<{ title: string; description: string; amount: string }[]>([
    { title: "", description: "", amount: "" },
  ]);

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { title: "", description: "", amount: "" }]);
  };

  const updateMilestone = (index: number, field: string, value: string) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const createContract = () => {
    if (!title || !client || !contractor || milestones.some((m) => !m.title || !m.amount)) return;

    const newContract: Contract = {
      id: Date.now().toString(),
      title,
      client,
      contractor,
      totalAmount: milestones.reduce((sum, m) => sum + Number(m.amount), 0),
      milestones: milestones.map((m, i) => ({
        id: `${Date.now()}-${i}`,
        title: m.title,
        description: m.description,
        amount: Number(m.amount),
        completed: false,
        verifying: false,
        paid: false,
      })),
      createdAt: new Date(),
    };

    setContracts((prev) => [newContract, ...prev]);
    setShowForm(false);
    setTitle("");
    setClient("");
    setContractor("");
    setMilestones([{ title: "", description: "", amount: "" }]);
  };

  const submitMilestone = async (contractId: string, milestoneId: string) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              milestones: c.milestones.map((m) =>
                m.id === milestoneId ? { ...m, verifying: true } : m
              ),
            }
          : c
      )
    );

    // Simulate AI verification
    await new Promise((r) => setTimeout(r, 2000));

    const passed = Math.random() > 0.1;

    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              milestones: c.milestones.map((m) =>
                m.id === milestoneId
                  ? { ...m, verifying: false, completed: passed, paid: passed }
                  : m
              ),
            }
          : c
      )
    );
  };

  const getProgress = (contract: Contract) => {
    const completed = contract.milestones.filter((m) => m.completed).length;
    return (completed / contract.milestones.length) * 100;
  };

  const getPaidAmount = (contract: Contract) => {
    return contract.milestones.filter((m) => m.paid).reduce((sum, m) => sum + m.amount, 0);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-emerald-400" />
              Performance-Based Contracting
            </h1>
            <p className="text-muted-foreground mt-2">
              Create contracts with milestones. AI verifies task completion and auto-releases payments.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground glow-cyan">
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Button>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="gradient-border">
                <CardHeader>
                  <CardTitle>Create Contract</CardTitle>
                  <CardDescription>Define milestones with payment amounts. Each milestone is auto-paid upon AI verification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Contract Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Client Wallet (0x...)" value={client} onChange={(e) => setClient(e.target.value)} />
                    <Input placeholder="Contractor Wallet (0x...)" value={contractor} onChange={(e) => setContractor(e.target.value)} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Milestones</h3>
                      <Button variant="ghost" size="sm" onClick={addMilestone}>
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>
                    {milestones.map((m, i) => (
                      <div key={i} className="flex gap-3 items-start bg-secondary/30 p-3 rounded-lg">
                        <span className="text-xs font-mono text-muted-foreground mt-3 w-6">#{i + 1}</span>
                        <div className="flex-1 space-y-2">
                          <Input placeholder="Milestone title" value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)} />
                          <Textarea placeholder="Acceptance criteria..." value={m.description} onChange={(e) => updateMilestone(i, "description", e.target.value)} className="min-h-[60px]" />
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="relative">
                            <DollarSign className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
                            <Input placeholder="ETH" value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)} className="pl-7 w-28" type="number" step="0.01" />
                          </div>
                          {milestones.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeMilestone(i)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="text-foreground font-semibold">{milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0).toFixed(2)} ETH</span>
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                      <Button onClick={createContract} className="bg-primary text-primary-foreground">Deploy Contract</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contracts List */}
        <div className="space-y-6">
          {contracts.length === 0 && !showForm && (
            <div className="text-center py-16 text-muted-foreground">
              <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No contracts yet. Create your first performance-based contract.</p>
            </div>
          )}
          {contracts.map((contract) => (
            <Card key={contract.id} className="gradient-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{contract.title}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {contract.client.slice(0, 10)}... → {contract.contractor.slice(0, 10)}...
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Paid: <span className="text-emerald-400 font-semibold">{getPaidAmount(contract).toFixed(2)}</span> / {contract.totalAmount.toFixed(2)} ETH
                    </p>
                    <Progress value={getProgress(contract)} className="mt-2 h-2 w-40" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {contract.milestones.map((milestone, i) => (
                  <div
                    key={milestone.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      milestone.paid ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {milestone.paid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : milestone.verifying ? (
                        <Clock className="w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-foreground text-sm">#{i + 1} — {milestone.title}</p>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-foreground">{milestone.amount} ETH</span>
                      {milestone.paid ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">Paid ✓</Badge>
                      ) : milestone.verifying ? (
                        <Badge className="bg-primary/20 text-primary">Verifying...</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => submitMilestone(contract.id, milestone.id)}>
                          Submit for Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default PerformanceContracting;
