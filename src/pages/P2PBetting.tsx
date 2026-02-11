import { useState } from "react";
import { Dice5, Plus, TrendingUp, TrendingDown, Clock, CheckCircle2, Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

interface Bet {
  id: string;
  user: string;
  side: "for" | "against";
  amount: number;
  timestamp: Date;
}

interface BettingEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  endDate: string;
  status: "open" | "resolving" | "resolved";
  bets: Bet[];
  totalFor: number;
  totalAgainst: number;
  result?: "for" | "against";
  resolution?: string;
  createdAt: Date;
}

const categories = ["Sports", "Politics", "Crypto", "Weather", "Entertainment", "Science", "Custom"];

const P2PBetting = () => {
  const [events, setEvents] = useState<BettingEvent[]>([
    {
      id: "demo1",
      title: "Bitcoin will exceed $150K by end of 2026",
      description: "Will BTC/USD trading price surpass $150,000 before December 31, 2026?",
      category: "Crypto",
      endDate: "2026-12-31",
      status: "open",
      bets: [
        { id: "b1", user: "0xAb3F...9c2D", side: "for", amount: 2.5, timestamp: new Date() },
        { id: "b2", user: "0x7eC1...4fA8", side: "against", amount: 1.8, timestamp: new Date() },
        { id: "b3", user: "0xD92a...1bE5", side: "for", amount: 3.0, timestamp: new Date() },
      ],
      totalFor: 5.5,
      totalAgainst: 1.8,
      createdAt: new Date(),
    },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState("");
  const [betAmount, setBetAmount] = useState<Record<string, string>>({});
  const [userWallet] = useState("0xYour...Wallet");

  const createEvent = () => {
    if (!title || !description || !category || !endDate) return;
    const newEvent: BettingEvent = {
      id: Date.now().toString(),
      title,
      description,
      category,
      endDate,
      status: "open",
      bets: [],
      totalFor: 0,
      totalAgainst: 0,
      createdAt: new Date(),
    };
    setEvents((prev) => [newEvent, ...prev]);
    setShowCreate(false);
    setTitle(""); setDescription(""); setCategory(""); setEndDate("");
  };

  const placeBet = (eventId: string, side: "for" | "against") => {
    const amount = Number(betAmount[eventId]);
    if (!amount || amount <= 0) return;

    const bet: Bet = {
      id: Date.now().toString(),
      user: userWallet,
      side,
      amount,
      timestamp: new Date(),
    };

    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              bets: [...e.bets, bet],
              totalFor: e.totalFor + (side === "for" ? amount : 0),
              totalAgainst: e.totalAgainst + (side === "against" ? amount : 0),
            }
          : e
      )
    );
    setBetAmount((prev) => ({ ...prev, [eventId]: "" }));
  };

  const resolveEvent = async (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: "resolving" as const } : e))
    );

    // Simulate AI resolution
    await new Promise((r) => setTimeout(r, 3000));

    const result = Math.random() > 0.5 ? "for" : "against";
    const resolutions = [
      "AI verified outcome from multiple news sources and data feeds. Consensus reached with 95% validator agreement.",
      "Intelligent Contract browsed real-time data sources. LLM jury confirmed the result with high confidence.",
      "Cross-referenced 12 independent sources. Optimistic Democracy consensus achieved. Result is final.",
    ];

    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: "resolved" as const,
              result: result as "for" | "against",
              resolution: resolutions[Math.floor(Math.random() * resolutions.length)],
            }
          : e
      )
    );
  };

  const getOdds = (event: BettingEvent) => {
    const total = event.totalFor + event.totalAgainst;
    if (total === 0) return { for: 50, against: 50 };
    return {
      for: Math.round((event.totalFor / total) * 100),
      against: Math.round((event.totalAgainst / total) * 100),
    };
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Dice5 className="w-8 h-8 text-red-400" />
              P2P Gambling & Betting
            </h1>
            <p className="text-muted-foreground mt-2">
              Bet on real-world outcomes. AI verifies results from live data sources using LLM consensus.
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground glow-cyan">
            <Plus className="w-4 h-4 mr-2" /> Create Event
          </Button>
        </div>

        {/* Create Event */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="gradient-border">
                <CardHeader><CardTitle>Create Betting Event</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Event Title (e.g. 'Team X wins championship')" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder="Describe the exact conditions for resolution..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">Resolution Date</label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createEvent} className="bg-primary text-primary-foreground">Deploy Event</Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Events */}
        <div className="space-y-6">
          {events.length === 0 && !showCreate && (
            <div className="text-center py-16 text-muted-foreground">
              <Dice5 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No events yet. Create your first betting event.</p>
            </div>
          )}
          {events.map((event) => {
            const odds = getOdds(event);
            return (
              <Card key={event.id} className="gradient-border overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{event.category}</Badge>
                        <Badge className={
                          event.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : event.status === "resolving"
                            ? "bg-primary/20 text-primary"
                            : "bg-amber-500/20 text-amber-400"
                        }>
                          {event.status === "resolving" ? "AI Resolving..." : event.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{(event.totalFor + event.totalAgainst).toFixed(2)} ETH</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Users className="w-3 h-3" /> {event.bets.length} bets
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Odds bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Yes ({odds.for}%)
                      </span>
                      <span className="text-red-400 flex items-center gap-1">
                        No ({odds.against}%)
                        <TrendingDown className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="h-3 bg-red-500/30 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${odds.for}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{event.totalFor.toFixed(2)} ETH</span>
                      <span>{event.totalAgainst.toFixed(2)} ETH</span>
                    </div>
                  </div>

                  {/* Resolution */}
                  {event.status === "resolved" && event.result && (
                    <div className={`rounded-lg p-4 ${event.result === "for" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className={`w-5 h-5 ${event.result === "for" ? "text-emerald-400" : "text-red-400"}`} />
                        <span className="font-bold text-foreground">
                          Result: {event.result === "for" ? "YES ✓" : "NO ✗"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.resolution}</p>
                    </div>
                  )}

                  {/* Bet actions */}
                  {event.status === "open" && (
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Coins className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount (ETH)"
                          className="pl-9"
                          value={betAmount[event.id] || ""}
                          onChange={(e) => setBetAmount((prev) => ({ ...prev, [event.id]: e.target.value }))}
                        />
                      </div>
                      <Button
                        onClick={() => placeBet(event.id, "for")}
                        disabled={!betAmount[event.id]}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" /> Yes
                      </Button>
                      <Button
                        onClick={() => placeBet(event.id, "against")}
                        disabled={!betAmount[event.id]}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <TrendingDown className="w-4 h-4 mr-1" /> No
                      </Button>
                    </div>
                  )}

                  {/* Resolve button */}
                  {event.status === "open" && event.bets.length >= 2 && (
                    <Button variant="outline" className="w-full" onClick={() => resolveEvent(event.id)}>
                      <Clock className="w-4 h-4 mr-2" /> Trigger AI Resolution
                    </Button>
                  )}

                  {event.status === "resolving" && (
                    <div className="text-center py-2 text-primary text-sm animate-pulse">
                      🔮 AI browsing live data sources for resolution...
                    </div>
                  )}

                  {/* Recent bets */}
                  {event.bets.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Bets</p>
                      <div className="space-y-1">
                        {event.bets.slice(-5).reverse().map((bet) => (
                          <div key={bet.id} className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground">{bet.user}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{bet.amount} ETH</span>
                              <Badge className={bet.side === "for" ? "bg-emerald-500/20 text-emerald-400 text-xs" : "bg-red-500/20 text-red-400 text-xs"}>
                                {bet.side === "for" ? "YES" : "NO"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Resolves: {event.endDate}
                  </p>
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
