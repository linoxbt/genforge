import { motion } from "framer-motion";
import {
  Shield, FileCheck, Trophy, Brain, Gamepad2, Dice5, ArrowRight,
  Zap, Globe, Lock, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import logo from "@/assets/genlayer-logo.png";
import heroBg from "@/assets/hero-bg.jpg";

const products = [
  {
    icon: Shield,
    title: "On-chain Identity Verification",
    description: "Social media profile verification powered by AI. Intelligent Contracts browse profiles in real-time and verify ownership through cryptographic challenges.",
    tags: ["Identity", "Social", "Verification"],
    color: "from-cyan-400 to-blue-500",
    status: "Live",
    path: "/identity",
  },
  {
    icon: FileCheck,
    title: "Performance-Based Contracting",
    description: "Auto-pay on verified task completion. AI agents validate deliverables against acceptance criteria, releasing payments only when work is confirmed done.",
    tags: ["Payments", "Automation", "Freelance"],
    color: "from-emerald-400 to-teal-500",
    status: "Live",
    path: "/contracts",
  },
  {
    icon: Trophy,
    title: "Bounty Review & Payout",
    description: "AI-evaluated work quality for bounty programs. LLM juries assess submissions, score quality, and trigger payouts — no human reviewers needed.",
    tags: ["Bounties", "AI Review", "DeFi"],
    color: "from-amber-400 to-orange-500",
    status: "Live",
    path: "/bounties",
  },
  {
    icon: Brain,
    title: "On-chain Trivia & Quiz Games",
    description: "AI verifies answers from web sources in real-time. Play trivia where no answer key exists — the blockchain fetches and validates truth on the fly.",
    tags: ["Gaming", "Trivia", "Education"],
    color: "from-purple-400 to-violet-500",
    status: "Live",
    path: "/trivia",
  },
  {
    icon: Gamepad2,
    title: "Decentralized Game Master",
    description: "Text-based RPGs with AI-driven narrative outcomes. Every player decision is processed by Intelligent Contracts that craft unique story branches on-chain.",
    tags: ["RPG", "Narrative", "GameFi"],
    color: "from-pink-400 to-rose-500",
    status: "Live",
    path: "/rpg",
  },
  {
    icon: Dice5,
    title: "P2P Gambling & Betting",
    description: "Real-world outcome bets, AI-verified. Place wagers on anything — sports, elections, weather — and let AI consensus resolve outcomes from live data.",
    tags: ["Betting", "P2P", "Prediction"],
    color: "from-red-400 to-pink-500",
    status: "Live",
    path: "/betting",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-8"
          >
            <img src={logo} alt="GenLayer" className="w-24 h-24 drop-shadow-[0_0_30px_hsl(180,100%,50%,0.4)]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">Build on </span>
            <span className="bg-gradient-to-r from-[hsl(180,100%,50%)] to-[hsl(260,80%,60%)] bg-clip-text text-transparent text-glow">
              GenLayer
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            The AI-powered Layer 1 where{" "}
            <span className="text-foreground font-medium">Intelligent Contracts</span>{" "}
            read the web, understand language, and settle disputes with LLM consensus.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold text-base px-8"
              onClick={() => window.open("https://docs.genlayer.com", "_blank")}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Building
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border text-foreground hover:bg-secondary font-semibold text-base px-8"
              onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
            >
              Explore Products
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { label: "Consensus", value: "Optimistic Democracy" },
              { label: "Contracts", value: "Python-based" },
              { label: "Stage", value: "Asimov Testnet" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-sm font-mono text-primary uppercase tracking-wider">{s.label}</p>
                <p className="text-foreground font-semibold mt-1 text-sm md:text-base">{s.value}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
        </motion.div>
      </section>

      {/* Features bar */}
      <section className="border-y border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap justify-center gap-8">
          {[
            { icon: Globe, text: "Web-browsing contracts" },
            { icon: Brain, text: "LLM consensus" },
            { icon: Lock, text: "Trustless verification" },
            { icon: Zap, text: "Auto-execution" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2 text-muted-foreground">
              <f.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-primary font-mono text-sm uppercase tracking-widest mb-3">What's Possible</p>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Products to Build
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
              Real use cases powered by Intelligent Contracts — AI agents that verify, judge, and execute on-chain.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {products.map((product) => (
              <motion.div key={product.title} variants={item}>
                <Link
                  to={product.path}
                  className="group relative block rounded-xl bg-card border border-border p-6 hover:border-primary/30 transition-all duration-500 gradient-border overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${product.color} flex items-center justify-center`}>
                        <product.icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">{product.status}</Badge>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2">{product.title}</h3>

                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {product.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {product.tags.map((tag) => (
                        <span key={tag} className="text-xs font-mono px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Launch Tool <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-gradient-to-br from-card to-secondary/30 border border-border p-12 glow-cyan"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to build the future?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              GenLayer's testnet is live. Start writing Intelligent Contracts today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground glow-cyan font-semibold"
                onClick={() => window.open("https://studio.genlayer.com", "_blank")}
              >
                Open GenLayer Studio
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-border text-foreground hover:bg-secondary font-semibold"
                onClick={() => window.open("https://discord.gg/genlayer", "_blank")}
              >
                Join Discord
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GenLayer" className="w-8 h-8" />
            <span className="text-foreground font-semibold">GenLayer Ecosystem</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Built with Intelligent Contracts — AI meets blockchain.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
