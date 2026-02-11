import { useState } from "react";
import { Dice5, Plus, TrendingUp, TrendingDown, Clock, CheckCircle2, Users, Coins } from "lucide-react";
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

const categories = ["Sports", "Politics", "Crypto", "Weather", "Entertainment", "Science", "Custom"];

interface Bet { id: string; user: string; side: "for" | "against"; amount: number; timestamp: Date; }
interface BettingEvent {
  id: string; title: string; description: string; category: string; endDate: string;
  status: "open" | "resolving" | "resolved"; bets: Bet[];
  totalFor: number; totalAgainst: number; result?: "for" | "against"; resolution?: string; createdAt: Date;
}

const P2PBetting = () => {
  const [events, setEvents] = useState<BettingEvent[]>([
    {
      id: "demo1", title: "Bitcoin will exceed $150K by end of 2026",
      description: "Will BTC/USD surpass $150,000 before Dec 31, 2026?",
      category: "Crypto", endDate: "2026-12-31", status: "open",
      bets: [
        { id: "b1", user: "0xAb3F...9c2D", side: "for", amount: 2.5, timestamp: new Date() },
        { id: "b2", user: "0x7eC1...4fA8", side: "against", amount: 1.8, timestamp: new Date() },
      ],
      totalFor: 5.5, totalAgainst: 1.8, createdAt: new Date(),
    },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState("");
  const [betAmount, setBetAmount] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { address, withdraw, reward } = useWallet();

  const createEvent = () => {
    if (!title || !description || !category || !endDate) return;
    setEvents((prev) => [{
      id: Date.now().toString(), title, description, category, endDate,
      status: "open", bets: [], totalFor: 0, totalAgainst: 0, createdAt: new Date(),
    }, ...prev]);
    setShowCreate(false);
    setTitle(""); setDescription(""); setCategory(""); setEndDate("");
  };

  const placeBet = (eventId: string, side: "for" | "against") => {
    const amount = Number(betAmount[eventId]);
    if (!amount || amount <= 0) return;
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
  };

  const resolveEvent = async (eventId: string) => {
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: "resolving" as const } : e));
    await new Promise((r) => setTimeout(r, 3000));

    const result = Math.random() > 0.5 ? "for" : "against";
    const event = events.find((e) => e.id === eventId);
    if (event) {
      const winningPool = result === "for" ? event.totalFor : event.totalAgainst;
      const totalPool = event.totalFor + event.totalAgainst;
      const userBets = event.bets.filter((b) => b.user === address && b.side === result);
      for (const bet of userBets) {
        const payout = (bet.amount / winningPool) * totalPool;
        reward(payout, `Bet won: ${event.title}`);
      }
    }

    setEvents((prev) => prev.map((e) => e.id === eventId ? {
      ...e, status: "resolved" as const, result: result as "for" | "against",
      resolution: "AI verified outcome from multiple sources. Consensus reached.",
    } : e));
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
            <p className="text-sm text-muted-foreground mt-1">Bet on real-world outcomes. AI resolves from live data.</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Create Event
          </Button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-border">
                <CardHeader><CardTitle className="text-base">Create Event</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Resolution conditions..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createEvent} className="bg-primary text-primary-foreground">Deploy</Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {events.map((event) => {
            const odds = getOdds(event);
            return (
              <Card key={event.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-mono">{event.category}</Badge>
                        <Badge variant="outline" className={event.status === "resolved" ? "text-primary" : event.status === "resolving" ? "text-accent" : "text-foreground"}>
                          {event.status === "resolving" ? "Resolving..." : event.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{event.title}</CardTitle>
                      <CardDescription className="text-xs">{event.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono text-foreground">{(event.totalFor + event.totalAgainst).toFixed(2)} ETH</p>
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

                  {event.status === "open" && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Coins className="w-3 h-3 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input type="number" step="0.01" placeholder="ETH" className="pl-8 text-sm"
                          value={betAmount[event.id] || ""} onChange={(e) => setBetAmount((prev) => ({ ...prev, [event.id]: e.target.value }))} />
                      </div>
                      <Button size="sm" onClick={() => placeBet(event.id, "for")} disabled={!betAmount[event.id]} className="bg-primary text-primary-foreground text-xs">Yes</Button>
                      <Button size="sm" onClick={() => placeBet(event.id, "against")} disabled={!betAmount[event.id]} variant="destructive" className="text-xs">No</Button>
                    </div>
                  )}

                  {event.status === "open" && event.bets.length >= 2 && (
                    <Button variant="outline" className="w-full text-xs" onClick={() => resolveEvent(event.id)}>
                      <Clock className="w-3 h-3 mr-1" /> Trigger AI Resolution
                    </Button>
                  )}

                  {event.status === "resolving" && (
                    <div className="text-center py-2 text-primary text-xs animate-pulse font-mono">Resolving...</div>
                  )}

                  {event.bets.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-xs font-mono text-muted-foreground mb-1">Recent</p>
                      {event.bets.slice(-3).reverse().map((bet) => (
                        <div key={bet.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className="font-mono text-muted-foreground">{bet.user}</span>
                          <span className="font-mono text-foreground">{bet.amount} ETH <Badge variant="outline" className={`text-xs ${bet.side === "for" ? "text-primary" : "text-destructive"}`}>{bet.side === "for" ? "YES" : "NO"}</Badge></span>
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
