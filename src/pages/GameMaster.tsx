import { useState, useRef, useEffect } from "react";
import { Gamepad2, Sword, Shield, Heart, Skull, Sparkles, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { readClient, isExecutionSuccess, executionErrorMessage, WAIT_STATUS } from "@/lib/genlayer";
import { CONTRACTS } from "@/config/contracts";

interface ChainTurn { role: "player" | "narrator"; text: string; }
interface ChainSession {
  id: string;
  player_address: string;
  hp: number; max_hp: number; attack: number; defense: number; gold: number; level: number; xp: number;
  status: "playing" | "gameover";
  choices: string[];
  turns?: ChainTurn[];
}

type GamePhase = "idle" | "starting" | "playing" | "processing" | "gameover";

const GameMaster = () => {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [session, setSession] = useState<ChainSession | null>(null);
  const [customAction, setCustomAction] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isConnected, client, address, connect } = useWallet();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.turns]);

  const startGame = async () => {
    if (!isConnected || !client) {
      connect();
      toast({ title: "Wallet required", description: "Connect your wallet to play the RPG.", variant: "destructive" });
      return;
    }

    setPhase("starting");
    setSession(null);

    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.dungeonMaster,
        functionName: "start_session",
        args: [],
        value: 0n,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 150, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      const list = await readClient.readContract({ address: CONTRACTS.dungeonMaster, functionName: "list_sessions", args: [] }) as unknown as ChainSession[];
      const mine = list.find((s) => s.player_address.toLowerCase() === address.toLowerCase());
      if (!mine) throw new Error("Session not found after creation");

      const full = await readClient.readContract({ address: CONTRACTS.dungeonMaster, functionName: "get_session", args: [BigInt(mine.id)] }) as unknown as ChainSession;
      setSession(full);
      setPhase("playing");
    } catch (e: any) {
      toast({ title: "Failed to start adventure", description: e.message, variant: "destructive" });
      setPhase("idle");
    }
  };

  const processChoice = async (choiceText: string) => {
    if (!session || !client || phase === "processing") return;
    setPhase("processing");
    const prevLevel = session.level;

    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.dungeonMaster,
        functionName: "take_turn",
        args: [BigInt(session.id), choiceText],
        value: 0n,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 150, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      const full = await readClient.readContract({ address: CONTRACTS.dungeonMaster, functionName: "get_session", args: [BigInt(session.id)] }) as unknown as ChainSession;
      setSession(full);
      setPhase(full.status === "gameover" ? "gameover" : "playing");
      if (full.level > prevLevel) {
        toast({ title: `⚡ Level up! Now Level ${full.level}`, description: "GEN reward paid on-chain if the rewards pool was funded." });
      }
    } catch (e: any) {
      toast({ title: "Turn failed", description: e.message, variant: "destructive" });
      setPhase("playing");
    }
  };

  const handleCustomAction = () => {
    if (!customAction.trim() || phase === "processing") return;
    processChoice(customAction);
    setCustomAction("");
  };

  const turns = session?.turns || [];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            Game Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">A GenLayer Intelligent Contract narrates your adventure. Every scene is a real on-chain AI call.</p>
        </div>

        {!isConnected && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">Connect your wallet to play the RPG.</p>
              </div>
              <Button size="sm" onClick={() => connect()} className="bg-primary text-primary-foreground text-xs">
                <Wallet className="w-3 h-3 mr-1" /> Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "idle" && (
          <Card className="text-center p-10 border-border">
            <Sword className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Enter the Dungeon</h2>
            <p className="text-muted-foreground text-sm mb-4">Real on-chain AI narrates your adventure. Every outcome is unique.</p>
            <Button onClick={startGame} className="bg-primary text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" /> {isConnected ? "Begin Adventure" : "Connect Wallet to Play"}
            </Button>
          </Card>
        )}

        {phase === "starting" && (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="animate-pulse text-primary text-sm font-mono">⚔️ Intelligent Contract is generating your opening scene...</div>
              <p className="text-xs text-muted-foreground">This is a real on-chain transaction, it can take a little while.</p>
            </CardContent>
          </Card>
        )}

        {session && (phase === "playing" || phase === "processing" || phase === "gameover") && (
          <>
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-card border border-border rounded-md p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Heart className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-muted-foreground">HP</span>
                </div>
                <Progress value={(session.hp / session.max_hp) * 100} className="h-1.5" />
                <span className="text-xs font-mono text-foreground">{session.hp}/{session.max_hp}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <Sword className="w-3 h-3 text-primary mx-auto" />
                <span className="text-xs text-muted-foreground block">ATK</span>
                <span className="text-sm font-bold text-foreground">{session.attack}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <Shield className="w-3 h-3 text-accent mx-auto" />
                <span className="text-xs text-muted-foreground block">DEF</span>
                <span className="text-sm font-bold text-foreground">{session.defense}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <span className="text-sm">🪙</span>
                <span className="text-xs text-muted-foreground block">Gold</span>
                <span className="text-sm font-bold text-foreground">{session.gold}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <Sparkles className="w-3 h-3 text-primary mx-auto" />
                <span className="text-xs text-muted-foreground block">Lv.{session.level}</span>
                <span className="text-xs font-mono text-foreground">{session.xp}/{session.level * 50}</span>
              </div>
            </div>

            <Card className="border-border">
              <CardContent className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                <AnimatePresence>
                  {turns.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded text-sm ${
                        msg.role === "narrator"
                          ? "bg-secondary/40 border-l-2 border-primary text-foreground"
                          : "bg-primary/5 border-l-2 border-accent text-foreground ml-6"
                      }`}
                    >
                      {msg.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {session.choices.length > 0 && phase === "playing" && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {session.choices.map((choice, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start text-left h-auto py-2.5 px-3 text-sm hover:border-primary/40"
                      onClick={() => processChoice(choice)}
                    >
                      <span className="font-mono text-primary mr-2 text-xs">{i + 1}.</span>
                      {choice}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a custom action..."
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomAction()}
                    className="text-sm"
                  />
                  <Button onClick={handleCustomAction} className="bg-primary text-primary-foreground" disabled={!customAction.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {phase === "processing" && (
              <div className="text-center py-3">
                <div className="animate-pulse text-primary text-sm font-mono">Intelligent Contract is narrating the outcome on-chain...</div>
              </div>
            )}

            {phase === "gameover" && (
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm font-mono">💀 YOU HAVE FALLEN.</p>
                <Button onClick={startGame} className="bg-primary text-primary-foreground">
                  <Skull className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </AppLayout>
  );
};

export default GameMaster;
