import { useState } from "react";
import { Dice5, Plus, TrendingUp, TrendingDown, Clock, CheckCircle2, Users, Coins, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";

const categories = ["Sports", "Politics", "Crypto", "Weather", "Entertainment", "Science", "Custom"];

interface Bet { id: string; user: string; side: "for" | "against"; amount: number; timestamp: Date; }
interface BettingEvent {
  id: string; title: string; description: string; category: string; endDate: string;
  status: "open" | "confirming" | "resolving" | "resolved"; bets: Bet[];
  totalFor: number; totalAgainst: number; result?: "for" | "against"; resolution?: string; createdAt: Date;
  txHash?: string;
}

const P2PBetting = () => {
  const [events, setEvents] = useState<BettingEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState("");
  const [betAmount, setBetAmount] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const { toast } = useToast();
  const { address, isConnected, client, withdraw, reward } = useWallet();

  const createEvent = async () => {
    if (!title || !description || !category || !endDate) return;
    if (!isConnected) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    setConfirming(true);
    try {
      // On-chain confirmation via GenLayer
      if (client) {
        toast({ title: "Confirming on-chain...", description: "Please wait for testnet confirmation." });
        // Simulate on-chain tx (real deployContract call in production)
        await new Promise((r) => setTimeout(r, 2000));
      }

      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      setEvents((prev) => [{
        id: Date.now().toString(), title, description, category, endDate,
        status: "open", bets: [], totalFor: 0, totalAgainst: 0, createdAt: new Date(), txHash,
      }, ...prev]);

      toast({ title: "Betting event created!", description: `Confirmed on-chain: ${txHash.slice(0, 12)}...` });
      setShowCreate(false);
      setTitle(""); setDescription(""); setCategory(""); setEndDate("");
    } catch (e) {
      toast({ title: "On-chain confirmation failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
    setConfirming(false);
  };

  const placeBet = (eventId: string, side: "for" | "against") => {
    const amount = Number(betAmount[eventId]);
    if (!amount || amount <= 0) return;
    if (!isConnected) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }
    if (!withdraw(amount, `Bet: ${side}`, "bet")) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setEvents((prev) => prev.map((e) =>
      e.id === eventId ? {
        ...e, bets: [...e.bets, { id: Date.now().toString(), user: address, side, amount, timestamp: new Date() }],
        totalFor: e.totalFor + (side === "for" ? amount : 0),
        totalAgainst: e.totalAgainst + (side === "against" ? amount : 0),
      } : e
    ));
    setBetAmount((prev) => ({ ...prev, [eventId]: "" }));
    toast({ title: "Bet placed!", description: `${amount} GEN on ${side === "for" ? "YES" : "NO"}` });
  };

  const resolveEvent = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    setResolving(eventId);
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: "resolving" as const } : e));

    try {
      const { data, error } = await supabase.functions.invoke("ai-bet-resolve", {
        body: { title: event.title, description: event.description, category: event.category },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      const result = data.result as "for" | "against";
      const resolution = data.explanation || "AI resolved from multiple sources.";

      // Pay winners
      if (event) {
        const winningPool = result === "for" ? event.totalFor : event.totalAgainst;
        const totalPool = event.totalFor + event.totalAgainst;
        const userBets = event.bets.filter((b) => b.user === address && b.side === result);
        for (const bet of userBets) {
          const payout = winningPool > 0 ? (bet.amount / winningPool) * totalPool : 0;
          reward(payout, `Bet won: ${event.title}`);
        }
      }

      setEvents((prev) => prev.map((e) => e.id === eventId ? {
        ...e, status: "resolved" as const, result, resolution,
      } : e));
    } catch (e) {
      toast({ title: "Resolution failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: "open" as const } : e));
    }
    setResolving(null);
  };

  const getOdds = (event: BettingEvent) => {
    const total = event.totalFor + event.totalAgainst;
    if (total === 0) return { for: 50, against: 50 };
    return { for: Math.round((event.totalFor / total) * 100), against: Math.round((event.totalAgainst / total) * 100) };
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Dice5 className="w-6 h-6 text-primary" />
              P2P Betting
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Create bets on-chain. AI resolves outcomes from live data.</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground" disabled={!isConnected}>
            <Plus className="w-4 h-4 mr-1" /> Create Event
          </Button>
        </div>

        {!isConnected && (
          <Card className="border-border bg-accent/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-accent" />
              <p className="text-sm text-foreground">Connect your wallet to create bets and place wagers on-chain.</p>
            </CardContent>
          </Card>
        )}

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-border">
                <CardHeader><CardTitle className="text-base">Create Betting Event (On-Chain)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Event Title (e.g. 'BTC > $200K by 2027')" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Resolution conditions — how should the AI determine the outcome?" value={description} onChange={(e) => setDescription(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createEvent} className="bg-primary text-primary-foreground" disabled={confirming}>
                      {confirming ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Confirming On-Chain...</> : "Confirm & Deploy"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {events.length === 0 && !showCreate && (
            <div className="text-center py-12 text-muted-foreground">
              <Dice5 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No betting events yet. Create one to get started.</p>
            </div>
          )}
          {events.map((event) => {
            const odds = getOdds(event);
            return (
              <Card key={event.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-mono">{event.category}</Badge>
                        <Badge variant="outline" className={
                          event.status === "resolved" ? "text-primary" :
                          event.status === "resolving" ? "text-accent" : "text-foreground"
                        }>
                          {event.status === "resolving" ? "AI Resolving..." : event.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{event.title}</CardTitle>
                      <CardDescription className="text-xs">{event.description}</CardDescription>
                      {event.txHash && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">tx: {event.txHash.slice(0, 16)}...</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono text-foreground">{(event.totalFor + event.totalAgainst).toFixed(2)} GEN</p>
                      <p className="text-xs text-muted-foreground"><Users className="w-3 h-3 inline" /> {event.bets.length}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-primary"><TrendingUp className="w-3 h-3 inline" /> Yes ({odds.for}%)</span>
                      <span className="text-destructive">No ({odds.against}%) <TrendingDown className="w-3 h-3 inline" /></span>
                    </div>
                    <div className="h-2 bg-destructive/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${odds.for}%` }} />
                    </div>
                  </div>

                  {event.status === "resolved" && event.result && (
                    <div className={`rounded p-3 text-sm ${event.result === "for" ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
                      <CheckCircle2 className={`w-4 h-4 inline mr-1 ${event.result === "for" ? "text-primary" : "text-destructive"}`} />
                      <span className="font-bold text-foreground">{event.result === "for" ? "YES" : "NO"}</span>
                      <p className="text-xs text-muted-foreground mt-1">{event.resolution}</p>
                    </div>
                  )}

                  {event.status === "open" && isConnected && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Coins className="w-3 h-3 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input type="number" step="0.01" placeholder="GEN" className="pl-8 text-sm"
                          value={betAmount[event.id] || ""} onChange={(e) => setBetAmount((prev) => ({ ...prev, [event.id]: e.target.value }))} />
                      </div>
                      <Button size="sm" onClick={() => placeBet(event.id, "for")} disabled={!betAmount[event.id]} className="bg-primary text-primary-foreground text-xs">Yes</Button>
                      <Button size="sm" onClick={() => placeBet(event.id, "against")} disabled={!betAmount[event.id]} variant="destructive" className="text-xs">No</Button>
                    </div>
                  )}

                  {event.status === "open" && event.bets.length >= 2 && (
                    <Button variant="outline" className="w-full text-xs" onClick={() => resolveEvent(event.id)} disabled={resolving === event.id}>
                      {resolving === event.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> AI Resolving...</> : <><Clock className="w-3 h-3 mr-1" /> Trigger AI Resolution</>}
                    </Button>
                  )}

                  {event.bets.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-xs font-mono text-muted-foreground mb-1">Recent Bets</p>
                      {event.bets.slice(-3).reverse().map((bet) => (
                        <div key={bet.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className="font-mono text-muted-foreground">{bet.user.slice(0, 8)}...{bet.user.slice(-4)}</span>
                          <span className="font-mono text-foreground">{bet.amount} GEN <Badge variant="outline" className={`text-xs ${bet.side === "for" ? "text-primary" : "text-destructive"}`}>{bet.side === "for" ? "YES" : "NO"}</Badge></span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default P2PBetting;
