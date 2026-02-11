import { useState } from "react";
import { FileCheck, Plus, CheckCircle2, Circle, DollarSign, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";

interface Milestone { id: string; title: string; description: string; amount: number; completed: boolean; verifying: boolean; paid: boolean; }
interface Contract { id: string; title: string; client: string; contractor: string; totalAmount: number; milestones: Milestone[]; createdAt: Date; }

const PerformanceContracting = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [contractor, setContractor] = useState("");
  const [milestones, setMilestones] = useState<{ title: string; description: string; amount: string }[]>([{ title: "", description: "", amount: "" }]);
  const { toast } = useToast();
  const { withdraw, reward } = useWallet();

  const addMilestone = () => setMilestones((prev) => [...prev, { title: "", description: "", amount: "" }]);
  const updateMilestone = (i: number, field: string, value: string) => setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  const removeMilestone = (i: number) => { if (milestones.length > 1) setMilestones((prev) => prev.filter((_, idx) => idx !== i)); };

  const createContract = () => {
    if (!title || !client || !contractor || milestones.some((m) => !m.title || !m.amount)) return;
    const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    if (!withdraw(totalAmount, `Contract: ${title}`, "payment")) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setContracts((prev) => [{
      id: Date.now().toString(), title, client, contractor, totalAmount,
      milestones: milestones.map((m, i) => ({ id: `${Date.now()}-${i}`, title: m.title, description: m.description, amount: Number(m.amount), completed: false, verifying: false, paid: false })),
      createdAt: new Date(),
    }, ...prev]);
    setShowForm(false);
    setTitle(""); setClient(""); setContractor(""); setMilestones([{ title: "", description: "", amount: "" }]);
  };

  const submitMilestone = async (contractId: string, milestoneId: string) => {
    setContracts((prev) => prev.map((c) => c.id === contractId
      ? { ...c, milestones: c.milestones.map((m) => m.id === milestoneId ? { ...m, verifying: true } : m) } : c));
    await new Promise((r) => setTimeout(r, 2000));
    const passed = Math.random() > 0.1;
    const contract = contracts.find((c) => c.id === contractId);
    const milestone = contract?.milestones.find((m) => m.id === milestoneId);
    if (passed && milestone) reward(milestone.amount, `Milestone paid: ${milestone.title}`);
    setContracts((prev) => prev.map((c) => c.id === contractId
      ? { ...c, milestones: c.milestones.map((m) => m.id === milestoneId ? { ...m, verifying: false, completed: passed, paid: passed } : m) } : c));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-primary" />
              Performance Contracts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Milestone-based auto-pay. AI verifies completion.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> New Contract
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-border">
                <CardHeader><CardTitle className="text-base">Create Contract</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Contract Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Client Wallet (0x...)" value={client} onChange={(e) => setClient(e.target.value)} />
                    <Input placeholder="Contractor Wallet (0x...)" value={contractor} onChange={(e) => setContractor(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground">Milestones</h3>
                      <Button variant="ghost" size="sm" onClick={addMilestone} className="text-xs"><Plus className="w-3 h-3 mr-1" />Add</Button>
                    </div>
                    {milestones.map((m, i) => (
                      <div key={i} className="flex gap-2 items-start bg-secondary/30 p-2 rounded">
                        <span className="text-xs font-mono text-muted-foreground mt-2 w-5">#{i + 1}</span>
                        <div className="flex-1 space-y-1">
                          <Input placeholder="Title" value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)} className="text-sm" />
                          <Textarea placeholder="Criteria..." value={m.description} onChange={(e) => updateMilestone(i, "description", e.target.value)} className="text-sm min-h-[40px]" />
                        </div>
                        <div className="flex items-start gap-1">
                          <div className="relative">
                            <DollarSign className="w-3 h-3 absolute left-2 top-2.5 text-muted-foreground" />
                            <Input placeholder="ETH" value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)} className="pl-6 w-24 text-sm" type="number" step="0.01" />
                          </div>
                          {milestones.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeMilestone(i)} className="h-8 w-8"><Trash2 className="w-3 h-3" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-mono">Total: {milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0).toFixed(2)} ETH</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
                      <Button onClick={createContract} className="bg-primary text-primary-foreground text-xs">Deploy</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {contracts.length === 0 && !showForm && (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No contracts yet.</p>
            </div>
          )}
          {contracts.map((contract) => (
            <Card key={contract.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{contract.title}</CardTitle>
                    <CardDescription className="font-mono text-xs">{contract.client.slice(0, 10)}... → {contract.contractor.slice(0, 10)}...</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary font-mono">{contract.milestones.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0).toFixed(2)}</span> / {contract.totalAmount.toFixed(2)} ETH
                    </p>
                    <Progress value={(contract.milestones.filter((m) => m.completed).length / contract.milestones.length) * 100} className="mt-1 h-1.5 w-32" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contract.milestones.map((milestone, i) => (
                  <div key={milestone.id} className={`flex items-center justify-between p-2 rounded border text-sm ${milestone.paid ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-center gap-2">
                      {milestone.paid ? <CheckCircle2 className="w-4 h-4 text-primary" /> : milestone.verifying ? <Clock className="w-4 h-4 text-accent animate-spin" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="text-xs font-medium text-foreground">#{i + 1} — {milestone.title}</p>
                        {milestone.description && <p className="text-xs text-muted-foreground">{milestone.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground">{milestone.amount} ETH</span>
                      {milestone.paid ? <Badge variant="outline" className="text-xs text-primary">Paid</Badge>
                       : milestone.verifying ? <Badge variant="outline" className="text-xs">Verifying...</Badge>
                       : <Button size="sm" variant="outline" onClick={() => submitMilestone(contract.id, milestone.id)} className="text-xs h-7">Submit</Button>}
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
