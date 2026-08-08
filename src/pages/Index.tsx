import { motion } from "framer-motion";
import {
  Trophy, Brain, Gamepad2, Dice5, ArrowRight,
  Code2, Cpu, Wallet, ShieldCheck, Eye, Lock,
  Sparkles, Boxes, Vote, Github, ExternalLink, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import genForgeLogo from "@/assets/genforge-logo.png";
import genLayerLogo from "@/assets/genlayer-logo.png";
import heroBg from "@/assets/hero-bg.jpg";
import { CONTRACTS } from "@/config/contracts";

const products = [
  {
    icon: Trophy,
    title: "Bounty Review",
    description: "Post bounties with real on-chain escrow. An Intelligent Contract scores submissions and pays out automatically.",
    tags: ["Bounties", "Escrow"],
    path: "/bounties",
  },
  {
    icon: Brain,
    title: "Trivia Games",
    description: "Questions and answer keys are generated live by validator consensus. Correct answers pay real GEN.",
    tags: ["Gaming", "AI"],
    path: "/trivia",
  },
  {
    icon: Gamepad2,
    title: "Game Master",
    description: "Text-based RPG narrated turn-by-turn by an on-chain LLM call. Every outcome is consensus-verified.",
    tags: ["RPG", "AI"],
    path: "/rpg",
  },
  {
    icon: Dice5,
    title: "P2P Betting",
    description: "Prediction markets with real wagered GEN. Outcomes are resolved by AI reasoning and validator agreement.",
    tags: ["Betting", "On-Chain"],
    path: "/betting",
  },
  {
    icon: Code2,
    title: "Deploy Contracts",
    description: "Write Python Intelligent Contracts in the browser and deploy them straight to GenLayer Asimov Testnet.",
    tags: ["Deploy", "Python"],
    path: "/deploy",
  },
];

const valueProps = [
  {
    icon: Lock,
    title: "Real escrow, not a database row",
    description: "Bounty rewards and bets are sent as transaction value and held in the Intelligent Contract's own on-chain balance, never tracked off-chain.",
  },
  {
    icon: Vote,
    title: "Consensus-verified AI",
    description: "Every AI decision, a score, a resolved bet, a narrated scene, runs through GenLayer's Optimistic Democracy, where independent validators must agree before it settles.",
  },
  {
    icon: Eye,
    title: "Transparent by design",
    description: "Contract state, logic, and history are all publicly verifiable on-chain. Nothing happens in a server you can't see.",
  },
];

const steps = [
  {
    icon: Wallet,
    title: "Connect a wallet",
    description: "Link any EVM-compatible wallet via Reown. Nothing is generated or stored for you, you're always in control of your keys.",
  },
  {
    icon: Boxes,
    title: "Interact with an Intelligent Contract",
    description: "Post a bounty, place a bet, ask a question, take a turn. Each action is a real transaction sent to a Python contract on GenLayer.",
  },
  {
    icon: Sparkles,
    title: "Validators reach consensus",
    description: "The contract calls an LLM directly. Multiple validators independently verify the result before it's accepted on-chain.",
  },
  {
    icon: Cpu,
    title: "Settlement happens atomically",
    description: "Payouts, scores, and state updates are written in the same transaction. Nothing to trust but the chain.",
  },
];

const stats = [
  { label: "Intelligent Contracts", value: "4" },
  { label: "Network", value: "Asimov Testnet" },
  { label: "Consensus", value: "Optimistic Democracy" },
  { label: "Escrow model", value: "Fully on-chain" },
];

const floatingBadges = [
  { icon: Vote, text: "LLM Consensus", className: "top-[8%] left-[4%] animate-float-slow", delay: 0 },
  { icon: Code2, text: "Python Contracts", className: "top-[18%] right-[2%] animate-float-slower", delay: 0.15 },
  { icon: ShieldCheck, text: "On-Chain Escrow", className: "bottom-[12%] left-[8%] animate-float-slower", delay: 0.3 },
  { icon: Boxes, text: "5 Intelligent Contracts", className: "bottom-[6%] right-[6%] animate-float-slow", delay: 0.45 },
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
  const { balance, isConnected, address, connect } = useWallet();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-30 bg-background/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={genForgeLogo} alt="GenForge" className="w-7 h-7 rounded" />
            <span className="font-mono font-bold text-foreground text-lg">GenForge</span>
          </Link>
          <div className="flex items-center gap-3">
            {isConnected && (
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <span className="font-mono text-foreground font-semibold">{balance.toFixed(4)} GEN</span>
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">{address}</span>
              </div>
            )}
            {!isConnected && (
              <Button variant="outline" size="sm" className="font-mono text-xs" onClick={connect}>
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Connect Wallet
              </Button>
            )}
            <Button asChild size="sm" className="font-mono text-xs bg-primary text-primary-foreground">
              <Link to="/bounties">
                <Rocket className="w-3.5 h-3.5 mr-1.5" /> Launch App
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-28 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30 animate-drift" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        </div>
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.18), transparent 45%), radial-gradient(circle at 80% 10%, hsl(var(--accent) / 0.15), transparent 40%)",
          }}
        />

        {/* Floating badges */}
        <div className="absolute inset-0 -z-0 hidden lg:block pointer-events-none">
          {floatingBadges.map((b) => (
            <motion.div
              key={b.text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 + b.delay }}
              className={`absolute ${b.className}`}
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card/80 backdrop-blur text-xs font-mono text-muted-foreground shadow-lg">
                <b.icon className="w-3.5 h-3.5 text-primary" />
                {b.text}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-sm font-mono text-primary">Live on GenLayer Asimov</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
              Build & play on the
              <br />
              <span className="text-primary text-glow">GenLayer blockchain</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl leading-relaxed">
              Five tools, one real architecture: Python Intelligent Contracts that hold escrow,
              call LLMs directly, and settle on-chain only once validators reach consensus.
              No fake transactions, no off-chain database standing in for a blockchain.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="font-mono glow-green text-base px-6">
                <Link to="/bounties">
                  Launch App <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
              {!isConnected && (
                <Button size="lg" variant="outline" className="font-mono text-base px-6" onClick={connect}>
                  <Wallet className="w-4 h-4 mr-1.5" /> Connect Wallet
                </Button>
              )}
              <Button asChild variant="ghost" size="lg" className="font-mono text-base">
                <Link to="/docs">Read the Docs</Link>
              </Button>
            </div>

            <motion.a
              href="https://www.genlayer.com/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur hover:border-primary/40 transition-colors"
            >
              <img src={genLayerLogo} alt="GenLayer" className="w-4 h-4 rounded-sm" />
              <span className="text-xs text-muted-foreground font-mono">Powered by GenLayer</span>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card/30 relative overflow-hidden">
        <div className="absolute -top-24 left-1/3 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse-glow -z-10" />
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <p className="text-xl md:text-2xl font-bold font-mono text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 relative">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-mono text-primary uppercase tracking-wide">How it works</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">From click to consensus</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Every tool in GenForge follows the same real on-chain path. Nothing is simulated client-side.
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                variants={item}
                whileHover={{ y: -4 }}
                className="relative rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5"
              >
                <span className="text-xs font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <s.icon className="w-5 h-5 text-primary mt-3 mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-mono text-primary uppercase tracking-wide">The tools</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">Five Intelligent Contracts, one app</h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {products.map((product) => (
              <motion.div key={product.title} variants={item} whileHover={{ y: -4 }}>
                <Link
                  to={product.path}
                  className="group block h-full rounded-lg bg-card border border-border p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <product.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
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
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Value props */}
      <section className="px-6 pb-20 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-accent/10 blur-3xl -z-10 animate-drift" />
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-mono text-primary uppercase tracking-wide">Why it's different</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">Actually on-chain, not on-chain-ish</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              A lot of "AI x crypto" apps use the blockchain as a coat of paint. GenForge's AI decisions run
              inside Intelligent Contracts and settle through real validator consensus.
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid md:grid-cols-3 gap-4"
          >
            {valueProps.map((v) => (
              <motion.div key={v.title} variants={item} className="rounded-lg border border-border bg-card p-5 gradient-border">
                <v.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1.5">{v.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-xl border border-primary/20 bg-primary/5 px-8 py-14 text-center overflow-hidden"
          >
            <div
              className="absolute inset-0 -z-10 opacity-50"
              style={{ backgroundImage: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.2), transparent 60%)" }}
            />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ready to build?</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Connect a wallet, grab testnet GEN from the faucet in Settings, and try any of the five tools,
              or write your own Intelligent Contract and deploy it in minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" className="font-mono glow-green">
                <Link to="/bounties">
                  <Rocket className="w-4 h-4 mr-1.5" /> Launch App
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-mono">
                <Link to="/deploy">
                  <Code2 className="w-4 h-4 mr-1.5" /> Deploy a Contract
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Link to="/" className="flex items-center gap-2 font-mono">
            <img src={genForgeLogo} alt="GenForge" className="w-4 h-4 rounded" />
            <span>GenForge</span>
            <span className="text-xs text-muted-foreground/60">· Bounty Board {CONTRACTS.bountyBoard.slice(0, 6)}...</span>
          </Link>
          <div className="flex items-center gap-4 font-mono text-xs">
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
              GenLayer Docs <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://github.com/linoxbt/genforge" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
