import { useState, useEffect } from "react";
import { Dice5, Plus, TrendingUp, TrendingDown, Clock, CheckCircle2, Users, Coins, Loader2, AlertTriangle, Info, ExternalLink, Copy, Check, Calendar } from "lucide-react";
import { parseEther, formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { readClient, isExecutionSuccess, executionErrorMessage, WAIT_STATUS } from "@/lib/genlayer";
import { CONTRACTS } from "@/config/contracts";

const categories = ["Sports", "Politics", "Crypto", "Weather", "Entertainment", "Science", "Custom"];

interface Bet { id: string; user_address: string; side: string; amount: string; }
interface BettingEvent {
  id: string; title: string; description: string; category: string; end_date: string;
  source_url: string | null;
  status: string; result: string | null; resolution: string | null;
  total_for: string; total_against: string;
  creator_address: string;
  bets: Bet[];
}

const P2PBetting = () => {
  const [events, setEvents] = useState<BettingEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [betAmount, setBetAmount] = useState<Record<string, string>>({});
  const [placingBet, setPlacingBet] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { isConnected, client } = useWallet();

  const fetchEvents = async () => {
    try {
      const data = await readClient.readContract({
        address: CONTRACTS.predictionMarket,
        functionName: "list_events",
        args: [],
      });
      setEvents((data as unknown as BettingEvent[]) || []);
    } catch (e) {
      console.error("[GenForge] Failed to fetch betting events:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const createEvent = async () => {
    if (!title || !description || !category || !endDate) return;
    if (!isConnected || !client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    setConfirming(true);
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.predictionMarket,
        functionName: "create_event",
        args: [title, description, category, endDate, sourceUrl],
        value: 0n,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 90, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      toast({ title: "Betting event created on-chain!", description: `tx: ${String(txHash).slice(0, 14)}...` });
      setShowCreate(false);
      setTitle(""); setDescription(""); setCategory(""); setEndDate(""); setSourceUrl("");
      fetchEvents();
    } catch (e: any) {
      toast({ title: "Failed to create event", description: e.message, variant: "destructive" });
    }
    setConfirming(false);
  };

  const placeBet = async (eventId: string, side: "for" | "against") => {
    const amountStr = betAmount[eventId];
    if (!amountStr) return;
    if (!isConnected || !client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    let value: bigint;
    try {
      value = parseEther(amountStr);
      if (value <= 0n) throw new Error("invalid");
    } catch {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    setPlacingBet(eventId);
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.predictionMarket,
        functionName: "place_bet",
        args: [BigInt(eventId), side],
        value,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 90, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      setBetAmount((prev) => ({ ...prev, [eventId]: "" }));
      toast({ title: "Bet placed!", description: `${amountStr} GEN on ${side === "for" ? "YES" : "NO"}` });
      fetchEvents();
    } catch (e: any) {
      toast({ title: "Bet failed", description: e.message, variant: "destructive" });
    }
    setPlacingBet(null);
  };

  const resolveEvent = async (eventId: string) => {
    if (!client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    setResolving(eventId);
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.predictionMarket,
        functionName: "resolve_event",
        args: [BigInt(eventId)],
        value: 0n,
      });
      // Real on-chain AI resolution + validator consensus, slower than an API call.
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 150, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));
      fetchEvents();
    } catch (e: any) {
      toast({ title: "Resolution failed", description: e.message, variant: "destructive" });
    }
    setResolving(null);
  };

  const getOdds = (event: BettingEvent) => {
    const forAmt = Number(formatEther(BigInt(event.total_for)));
    const againstAmt = Number(formatEther(BigInt(event.total_against)));
    const total = forAmt + againstAmt;
    if (total === 0) return { for: 50, against: 50 };
    return { for: Math.round((forAmt / total) * 100), against: Math.round((againstAmt / total) * 100) };
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <p className="text-sm text-muted-foreground mt-1">Create bets on-chain. A GenLayer Intelligent Contract resolves outcomes from live reasoning.</p>
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
                  <Textarea placeholder="Resolution conditions: how should the AI determine the outcome?" value={description} onChange={(e) => setDescription(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <Input
                    placeholder="Source URL for resolution (optional, e.g. official results page)"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, the AI resolver fetches and grounds its decision in this source instead of relying on unaided recall.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={createEvent} className="bg-primary text-primary-foreground" disabled={confirming}>
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
            {events.length === 0 && !showCreate && (
              <div className="text-center py-12 text-muted-foreground">
                <Dice5 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No betting events yet. Create one to get started.</p>
              </div>
            )}
            {events.map((event) => {
              const odds = getOdds(event);
              const bets = event.bets || [];
              const totalPool = Number(formatEther(BigInt(event.total_for))) + Number(formatEther(BigInt(event.total_against)));
              return (
                <Card key={event.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-mono">{event.category}</Badge>
                          <Badge variant="outline" className={event.status === "resolved" ? "text-primary" : "text-foreground"}>
                            {resolving === event.id ? "AI Resolving..." : event.status}
                          </Badge>
                        </div>
                        <button
                          onClick={() => setSelectedEventId(event.id)}
                          className="text-left group/title"
                        >
                          <CardTitle className="text-base group-hover/title:text-primary transition-colors">{event.title}</CardTitle>
                        </button>
                        <CardDescription className="text-xs">{event.description}</CardDescription>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold font-mono text-foreground">{totalPool.toFixed(4)} GEN</p>
                        <p className="text-xs text-muted-foreground"><Users className="w-3 h-3 inline" /> {bets.length}</p>
                        <button
                          onClick={() => setSelectedEventId(event.id)}
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 ml-auto"
                        >
                          <Info className="w-3 h-3" /> Details
                        </button>
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
                        <Button size="sm" onClick={() => placeBet(event.id, "for")} disabled={!betAmount[event.id] || placingBet === event.id} className="bg-primary text-primary-foreground text-xs">Yes</Button>
                        <Button size="sm" onClick={() => placeBet(event.id, "against")} disabled={!betAmount[event.id] || placingBet === event.id} variant="destructive" className="text-xs">No</Button>
                      </div>
                    )}

                    {event.status === "open" && bets.length >= 1 && isConnected && (
                      <Button variant="outline" className="w-full text-xs" onClick={() => resolveEvent(event.id)} disabled={resolving === event.id}>
                        {resolving === event.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> AI Resolving (on-chain)...</> : <><Clock className="w-3 h-3 mr-1" /> Trigger AI Resolution</>}
                      </Button>
                    )}

                    {bets.length > 0 && (
                      <div className="border-t border-border pt-2">
                        <p className="text-xs font-mono text-muted-foreground mb-1">Recent Bets</p>
                        {bets.slice(-3).reverse().map((bet) => (
                          <div key={bet.id} className="flex items-center justify-between text-xs py-0.5">
                            <span className="font-mono text-muted-foreground">{bet.user_address.slice(0, 8)}...{bet.user_address.slice(-4)}</span>
                            <span className="font-mono text-foreground">{formatEther(BigInt(bet.amount))} GEN <Badge variant="outline" className={`text-xs ${bet.side === "for" ? "text-primary" : "text-destructive"}`}>{bet.side === "for" ? "YES" : "NO"}</Badge></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedEvent && (() => {
            const odds = getOdds(selectedEvent);
            const bets = selectedEvent.bets || [];
            const forAmt = Number(formatEther(BigInt(selectedEvent.total_for)));
            const againstAmt = Number(formatEther(BigInt(selectedEvent.total_against)));
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">{selectedEvent.category}</Badge>
                    <Badge variant="outline" className={selectedEvent.status === "resolved" ? "text-primary" : "text-foreground"}>
                      {resolving === selectedEvent.id ? "AI Resolving..." : selectedEvent.status}
                    </Badge>
                  </div>
                  <DialogTitle className="text-lg">{selectedEvent.title}</DialogTitle>
                  <DialogDescription className="text-sm text-foreground/80">{selectedEvent.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-primary"><TrendingUp className="w-3 h-3 inline" /> Yes ({odds.for}%) · {forAmt.toFixed(4)} GEN</span>
                      <span className="text-destructive">{againstAmt.toFixed(4)} GEN · No ({odds.against}%) <TrendingDown className="w-3 h-3 inline" /></span>
                    </div>
                    <div className="h-2 bg-destructive/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${odds.for}%` }} />
                    </div>
                  </div>

                  {selectedEvent.status === "resolved" && selectedEvent.result && (
                    <div className={`rounded p-3 text-sm ${selectedEvent.result === "for" ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
                      <CheckCircle2 className={`w-4 h-4 inline mr-1 ${selectedEvent.result === "for" ? "text-primary" : "text-destructive"}`} />
                      <span className="font-bold text-foreground">Resolved: {selectedEvent.result === "for" ? "YES" : "NO"}</span>
                      <p className="text-xs text-muted-foreground mt-1">{selectedEvent.resolution}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-secondary/30 rounded p-2">
                      <p className="text-muted-foreground font-mono uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> End Date</p>
                      <p className="text-foreground font-mono">{selectedEvent.end_date || "N/A"}</p>
                    </div>
                    <div className="bg-secondary/30 rounded p-2">
                      <p className="text-muted-foreground font-mono uppercase mb-1">Total Pool</p>
                      <p className="text-foreground font-mono">{(forAmt + againstAmt).toFixed(4)} GEN</p>
                    </div>
                  </div>

                  {selectedEvent.source_url && (
                    <div className="bg-secondary/30 rounded p-2">
                      <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Resolution Source</p>
                      <a
                        href={selectedEvent.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline break-all"
                      >
                        {selectedEvent.source_url}
                      </a>
                    </div>
                  )}

                  <div className="bg-secondary/30 rounded p-2">
                    <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Created By</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-foreground break-all flex-1">{selectedEvent.creator_address}</p>
                      <button onClick={() => copyAddress(selectedEvent.creator_address)}>
                        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase mb-1.5">All Bets ({bets.length})</p>
                    {bets.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No bets placed yet.</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {[...bets].reverse().map((bet) => (
                          <div key={bet.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-secondary/20">
                            <span className="font-mono text-muted-foreground">{bet.user_address.slice(0, 10)}...{bet.user_address.slice(-6)}</span>
                            <span className="font-mono text-foreground flex items-center gap-1.5">
                              {formatEther(BigInt(bet.amount))} GEN
                              <Badge variant="outline" className={`text-xs ${bet.side === "for" ? "text-primary" : "text-destructive"}`}>{bet.side === "for" ? "YES" : "NO"}</Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <a
                    href={`https://explorer-asimov.genlayer.com/address/${CONTRACTS.predictionMarket}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View contract on GenLayer Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default P2PBetting;
