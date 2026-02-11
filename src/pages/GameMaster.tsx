import { useState, useRef, useEffect } from "react";
import { Gamepad2, Sword, Shield, Heart, Skull, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

interface GameMessage {
  id: string;
  type: "narrator" | "player" | "system" | "combat";
  text: string;
}

interface PlayerStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  gold: number;
  level: number;
  xp: number;
}

interface Choice {
  text: string;
  type: "explore" | "fight" | "talk" | "flee" | "rest";
}

const scenarios = [
  {
    text: "You awaken in a dimly lit cavern. Water drips from stalactites above, and the air smells of moss and something ancient. Three tunnels branch ahead — one glows faintly blue, another echoes with distant growling, and the third is silent.",
    choices: [
      { text: "Enter the glowing blue tunnel", type: "explore" as const },
      { text: "Investigate the growling sounds", type: "fight" as const },
      { text: "Take the silent path", type: "explore" as const },
      { text: "Rest and recover strength", type: "rest" as const },
    ],
  },
  {
    text: "The tunnel opens into a vast underground lake. Bioluminescent fungi cast an ethereal glow across the water. A small boat sits at the shore, and across the lake you see the silhouette of a ruined tower.",
    choices: [
      { text: "Take the boat across", type: "explore" as const },
      { text: "Swim across stealthily", type: "explore" as const },
      { text: "Search the shore for items", type: "explore" as const },
      { text: "Call out to see if anyone responds", type: "talk" as const },
    ],
  },
  {
    text: "A goblin merchant blocks your path, surrounded by trinkets and stolen goods. He grins with sharp teeth. 'Trade? Or perhaps you want to take my things by force? Either way, I profit.'",
    choices: [
      { text: "Browse his wares", type: "talk" as const },
      { text: "Attack the goblin", type: "fight" as const },
      { text: "Try to pickpocket him", type: "explore" as const },
      { text: "Offer a riddle for free passage", type: "talk" as const },
    ],
  },
  {
    text: "You enter a chamber filled with ancient machinery — gears and levers connected to a massive stone door. Runes glow along the walls, and a skeletal figure slumps against the mechanism, a journal in its bony hand.",
    choices: [
      { text: "Read the journal", type: "explore" as const },
      { text: "Pull the nearest lever", type: "explore" as const },
      { text: "Examine the runes", type: "explore" as const },
      { text: "Smash through the door", type: "fight" as const },
    ],
  },
  {
    text: "A massive dragon blocks the final chamber. Its scales shimmer with dark energy, and it speaks: 'Another mortal seeking the treasure? Prove your worth — through wit, blade, or sacrifice.'",
    choices: [
      { text: "Challenge it to combat", type: "fight" as const },
      { text: "Propose a riddle contest", type: "talk" as const },
      { text: "Offer your gold as tribute", type: "talk" as const },
      { text: "Try to flee", type: "flee" as const },
    ],
  },
];

const combatOutcomes = [
  { text: "You strike true! The enemy staggers back, wounded. You gain 30 XP and 15 gold.", xp: 30, gold: 15, dmgTaken: 5, dmgDealt: 20 },
  { text: "A fierce battle! You take some hits but emerge victorious. 40 XP earned.", xp: 40, gold: 10, dmgTaken: 15, dmgDealt: 25 },
  { text: "The enemy catches you off guard! You barely survive the encounter but learn from it.", xp: 20, gold: 5, dmgTaken: 25, dmgDealt: 15 },
  { text: "Critical hit! Your blade finds the gap in armor. A decisive victory! 50 XP and rare loot!", xp: 50, gold: 25, dmgTaken: 0, dmgDealt: 30 },
];

const exploreOutcomes = [
  { text: "You discover a hidden alcove with a healing potion. HP restored! You also find 10 gold.", heal: 20, gold: 10, xp: 15 },
  { text: "The path reveals ancient writings. You gain wisdom from studying them. +25 XP.", heal: 0, gold: 0, xp: 25 },
  { text: "A trap springs! Poison darts fly. You dodge most but one grazes you. Lost 10 HP.", heal: -10, gold: 5, xp: 10 },
  { text: "You find a chest! Inside: gold coins and a mysterious amulet that boosts your defense.", heal: 0, gold: 20, xp: 15 },
];

const talkOutcomes = [
  { text: "Your words impress the creature. It shares valuable information and gifts you gold.", gold: 15, xp: 20, heal: 0 },
  { text: "The negotiation succeeds! You pass without conflict and gain respect. +30 XP.", gold: 0, xp: 30, heal: 0 },
  { text: "Your riddle stumps them! They let you pass and throw in some gold for the entertainment.", gold: 20, xp: 25, heal: 0 },
  { text: "The conversation takes a dark turn. Trust is broken. You must fight your way out.", gold: 0, xp: 10, heal: -10 },
];

type GamePhase = "idle" | "playing" | "gameover";

const GameMaster = () => {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [stats, setStats] = useState<PlayerStats>({ hp: 100, maxHp: 100, attack: 10, defense: 5, gold: 0, level: 1, xp: 0 });
  const [choices, setChoices] = useState<Choice[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [customAction, setCustomAction] = useState("");
  const [processing, setProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (type: GameMessage["type"], text: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString() + Math.random(), type, text }]);
  };

  const checkLevelUp = (currentXp: number, currentLevel: number) => {
    const xpNeeded = currentLevel * 50;
    if (currentXp >= xpNeeded) {
      addMessage("system", `⚡ LEVEL UP! You are now Level ${currentLevel + 1}! HP restored. Stats increased.`);
      return {
        level: currentLevel + 1,
        xp: currentXp - xpNeeded,
        maxHp: 100 + currentLevel * 20,
        hp: 100 + currentLevel * 20,
        attack: 10 + currentLevel * 3,
        defense: 5 + currentLevel * 2,
      };
    }
    return null;
  };

  const startGame = () => {
    setPhase("playing");
    setMessages([]);
    setStats({ hp: 100, maxHp: 100, attack: 10, defense: 5, gold: 0, level: 1, xp: 0 });
    setScenarioIndex(0);

    addMessage("system", "⚔️ Welcome, Adventurer. Your fate is governed by Intelligent Contracts on the GenLayer blockchain. Every choice is processed by AI consensus.");
    addMessage("narrator", scenarios[0].text);
    setChoices(scenarios[0].choices);
  };

  const processChoice = async (choice: Choice) => {
    if (processing) return;
    setProcessing(true);
    setChoices([]);

    addMessage("player", choice.text);
    addMessage("system", "🔮 AI Game Master processing outcome via LLM consensus...");

    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    let newStats = { ...stats };

    if (choice.type === "fight") {
      const outcome = combatOutcomes[Math.floor(Math.random() * combatOutcomes.length)];
      addMessage("combat", outcome.text);
      newStats.hp = Math.max(0, newStats.hp - outcome.dmgTaken);
      newStats.gold += outcome.gold;
      newStats.xp += outcome.xp;
    } else if (choice.type === "explore") {
      const outcome = exploreOutcomes[Math.floor(Math.random() * exploreOutcomes.length)];
      addMessage("narrator", outcome.text);
      newStats.hp = Math.min(newStats.maxHp, Math.max(0, newStats.hp + outcome.heal));
      newStats.gold += outcome.gold;
      newStats.xp += outcome.xp;
    } else if (choice.type === "talk") {
      const outcome = talkOutcomes[Math.floor(Math.random() * talkOutcomes.length)];
      addMessage("narrator", outcome.text);
      newStats.hp = Math.min(newStats.maxHp, Math.max(0, newStats.hp + outcome.heal));
      newStats.gold += outcome.gold;
      newStats.xp += outcome.xp;
    } else if (choice.type === "flee") {
      const success = Math.random() > 0.4;
      if (success) {
        addMessage("narrator", "You escape! But cowardice has its cost — you gain nothing.");
      } else {
        addMessage("combat", "You fail to flee! The enemy strikes as you turn. -20 HP.");
        newStats.hp = Math.max(0, newStats.hp - 20);
        newStats.xp += 5;
      }
    } else if (choice.type === "rest") {
      const healAmount = Math.floor(newStats.maxHp * 0.3);
      newStats.hp = Math.min(newStats.maxHp, newStats.hp + healAmount);
      addMessage("narrator", `You rest and recover ${healAmount} HP. The dungeon is quiet... for now.`);
      newStats.xp += 5;
    }

    // Check death
    if (newStats.hp <= 0) {
      newStats.hp = 0;
      setStats(newStats);
      addMessage("system", "💀 YOU HAVE FALLEN. Your journey ends here. The dungeon claims another soul.");
      setPhase("gameover");
      setProcessing(false);
      return;
    }

    // Check level up
    const levelUp = checkLevelUp(newStats.xp, newStats.level);
    if (levelUp) {
      newStats = { ...newStats, ...levelUp };
    }

    setStats(newStats);

    // Next scenario
    const nextIndex = (scenarioIndex + 1) % scenarios.length;
    setScenarioIndex(nextIndex);

    await new Promise((r) => setTimeout(r, 800));
    addMessage("narrator", scenarios[nextIndex].text);
    setChoices(scenarios[nextIndex].choices);
    setProcessing(false);
  };

  const handleCustomAction = () => {
    if (!customAction.trim() || processing) return;
    const types: Choice["type"][] = ["explore", "fight", "talk", "explore"];
    const type = types[Math.floor(Math.random() * types.length)];
    processChoice({ text: customAction, type });
    setCustomAction("");
  };

  const getHpColor = () => {
    const pct = (stats.hp / stats.maxHp) * 100;
    if (pct > 60) return "bg-emerald-500";
    if (pct > 30) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-pink-400" />
            Decentralized Game Master
          </h1>
          <p className="text-muted-foreground mt-2">
            Text-based RPG with AI-driven outcomes. Every choice is processed by Intelligent Contracts on-chain.
          </p>
        </div>

        {phase === "idle" && (
          <Card className="gradient-border text-center p-12">
            <Sword className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-2">Enter the Dungeon</h2>
            <p className="text-muted-foreground mb-6">Your choices shape the narrative. AI consensus determines outcomes.</p>
            <Button size="lg" onClick={startGame} className="bg-primary text-primary-foreground glow-cyan">
              <Sparkles className="w-5 h-5 mr-2" /> Begin Adventure
            </Button>
          </Card>
        )}

        {(phase === "playing" || phase === "gameover") && (
          <>
            {/* Stats HUD */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">HP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(stats.hp / stats.maxHp) * 100} className={`h-2 flex-1 [&>div]:${getHpColor()}`} />
                  <span className="text-xs font-mono text-foreground">{stats.hp}/{stats.maxHp}</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <Sword className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground block">ATK</span>
                <span className="font-bold text-foreground">{stats.attack}</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground block">DEF</span>
                <span className="font-bold text-foreground">{stats.defense}</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <span className="text-lg">🪙</span>
                <span className="text-xs text-muted-foreground block">Gold</span>
                <span className="font-bold text-foreground">{stats.gold}</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <Sparkles className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground block">Lv.{stats.level}</span>
                <span className="font-bold text-foreground">{stats.xp}/{stats.level * 50} XP</span>
              </div>
            </div>

            {/* Messages */}
            <Card className="gradient-border">
              <CardContent className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        msg.type === "narrator"
                          ? "bg-secondary/30 border-l-2 border-primary text-foreground"
                          : msg.type === "player"
                          ? "bg-primary/10 border-l-2 border-accent text-foreground ml-8"
                          : msg.type === "combat"
                          ? "bg-red-500/10 border-l-2 border-red-500 text-foreground"
                          : "bg-muted/50 text-muted-foreground text-center text-sm italic"
                      }`}
                    >
                      {msg.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {/* Choices */}
            {choices.length > 0 && !processing && phase === "playing" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {choices.map((choice, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4 hover:border-primary/50"
                      onClick={() => processChoice(choice)}
                    >
                      <span className="font-mono text-primary mr-2">{i + 1}.</span>
                      {choice.text}
                    </Button>
                  ))}
                </div>

                {/* Custom action */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or type a custom action..."
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomAction()}
                  />
                  <Button onClick={handleCustomAction} className="bg-primary text-primary-foreground" disabled={!customAction.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {processing && (
              <div className="text-center py-4">
                <div className="animate-pulse text-primary text-sm">⏳ AI Game Master is deciding your fate...</div>
              </div>
            )}

            {phase === "gameover" && (
              <div className="text-center">
                <Button onClick={startGame} className="bg-primary text-primary-foreground glow-cyan">
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
