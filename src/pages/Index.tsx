import { motion } from "framer-motion";
import {
  Shield, FileCheck, Trophy, Brain, Gamepad2, Dice5, ArrowRight,
  Terminal, GitBranch, Code2, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";

const products = [
  {
    icon: Shield,
    title: "Identity Verification",
    description: "AI-verified social media ownership. Intelligent Contracts browse profiles and confirm identity on-chain.",
    tags: ["Identity", "Social"],
    path: "/identity",
  },
  {
    icon: FileCheck,
    title: "Performance Contracts",
    description: "Milestone-based auto-pay. AI validates deliverables and releases funds when work is confirmed done.",
    tags: ["Payments", "Freelance"],
    path: "/contracts",
  },
  {
    icon: Trophy,
    title: "Bounty Review",
    description: "AI-evaluated submissions. LLM juries score quality and trigger payouts automatically.",
    tags: ["Bounties", "Review"],
    path: "/bounties",
  },
  {
    icon: Brain,
    title: "Trivia Games",
    description: "AI verifies answers from web sources in real-time. No pre-set answer keys needed.",
    tags: ["Gaming", "Trivia"],
    path: "/trivia",
  },
  {
    icon: Gamepad2,
    title: "Game Master",
    description: "Text-based RPG with real AI narration. Every choice is processed by AI consensus.",
    tags: ["RPG", "Narrative"],
    path: "/rpg",
  },
  {
    icon: Dice5,
    title: "P2P Betting",
    description: "Bet on real-world outcomes. AI browses live data to resolve bets with consensus.",
    tags: ["Betting", "P2P"],
    path: "/betting",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Index = () => {
  const { balance } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            <span className="font-mono font-bold text-foreground text-lg">GenLayer</span>
            <Badge variant="outline" className="text-xs font-mono">testnet</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-muted-foreground">{balance.toFixed(2)} ETH</span>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => window.open("https://docs.genlayer.com", "_blank")}
            >
              Docs
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-mono text-primary">Live on Asimov Testnet</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
              AI-Powered Tools for the
              <br />
              <span className="text-primary text-glow">GenLayer Blockchain</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed">
              Six production-ready tools powered by Intelligent Contracts — AI agents that verify identity,
              evaluate work, run games, and settle bets on-chain with LLM consensus.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground font-mono"
          >
            {[
              { icon: Cpu, text: "LLM Consensus" },
              { icon: Code2, text: "Python Contracts" },
              { icon: GitBranch, text: "Web Browsing" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2">
                <f.icon className="w-4 h-4 text-primary" />
                <span>{f.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {products.map((product) => (
              <motion.div key={product.title} variants={item}>
                <Link
                  to={product.path}
                  className="group block rounded-lg bg-card border border-border p-5 hover:border-primary/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <product.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">{product.title}</h3>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {product.tags.map((tag) => (
                        <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="w-4 h-4" />
            <span>GenLayer Ecosystem</span>
          </div>
          <span>Powered by Intelligent Contracts</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
