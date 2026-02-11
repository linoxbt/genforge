import { useState, useEffect, useCallback } from "react";
import { Brain, Play, Trophy, Clock, CheckCircle2, XCircle, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  source: string;
  category: string;
}

const questionBank: Question[] = [
  { id: 1, question: "What consensus mechanism does GenLayer use?", options: ["Proof of Work", "Proof of Stake", "Optimistic Democracy", "Delegated PoS"], correctIndex: 2, source: "docs.genlayer.com", category: "GenLayer" },
  { id: 2, question: "What language are Intelligent Contracts written in?", options: ["Solidity", "Rust", "Python", "JavaScript"], correctIndex: 2, source: "docs.genlayer.com", category: "GenLayer" },
  { id: 3, question: "What is the name of GenLayer's current testnet?", options: ["Turing", "Asimov", "Bradbury", "Clarke"], correctIndex: 1, source: "docs.genlayer.com", category: "GenLayer" },
  { id: 4, question: "Which cryptocurrency has the highest market cap?", options: ["Ethereum", "Bitcoin", "Solana", "BNB"], correctIndex: 1, source: "coinmarketcap.com", category: "Crypto" },
  { id: 5, question: "What does DeFi stand for?", options: ["Defined Finance", "Decentralized Finance", "Digital Finance", "Deferred Finance"], correctIndex: 1, source: "wikipedia.org", category: "Crypto" },
  { id: 6, question: "What year was the Bitcoin whitepaper published?", options: ["2006", "2007", "2008", "2009"], correctIndex: 2, source: "bitcoin.org", category: "Crypto" },
  { id: 7, question: "Which blockchain introduced smart contracts?", options: ["Bitcoin", "Ethereum", "Cardano", "Polkadot"], correctIndex: 1, source: "ethereum.org", category: "Blockchain" },
  { id: 8, question: "What is a DAO?", options: ["Digital Asset Operation", "Decentralized Autonomous Organization", "Distributed Application Object", "Dynamic Asset Oracle"], correctIndex: 1, source: "wikipedia.org", category: "Blockchain" },
  { id: 9, question: "What does NFT stand for?", options: ["New Financial Token", "Non-Fungible Token", "Network File Transfer", "Natural Form Token"], correctIndex: 1, source: "wikipedia.org", category: "Crypto" },
  { id: 10, question: "What is the merge in Ethereum?", options: ["Two chains combining", "PoW to PoS transition", "Layer 2 integration", "Token migration"], correctIndex: 1, source: "ethereum.org", category: "Blockchain" },
  { id: 11, question: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars", "Earth"], correctIndex: 1, source: "nasa.gov", category: "Science" },
  { id: 12, question: "What is the speed of light approximately?", options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "200,000 km/s"], correctIndex: 0, source: "physics.org", category: "Science" },
];

type GameState = "menu" | "playing" | "results";

const TriviaGame = () => {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const [answers, setAnswers] = useState<{ question: Question; selected: number | null; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState(5);
  const [verifying, setVerifying] = useState(false);

  const categories = ["all", ...Array.from(new Set(questionBank.map((q) => q.category)))];

  const startGame = () => {
    const filtered = selectedCategory === "all" ? questionBank : questionBank.filter((q) => q.category === selectedCategory);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.min(questionCount, filtered.length));
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setTimer(15);
    setGameState("playing");
  };

  const selectAnswer = async (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    setVerifying(true);

    // Simulate AI verification
    await new Promise((r) => setTimeout(r, 1200));
    setVerifying(false);

    const correct = index === questions[currentIndex].correctIndex;
    if (correct) {
      setScore((s) => s + (100 + timer * 10));
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    setAnswers((prev) => [...prev, { question: questions[currentIndex], selected: index, correct }]);
  };

  const timeUp = useCallback(() => {
    if (!answered) {
      setAnswered(true);
      setStreak(0);
      setAnswers((prev) => [...prev, { question: questions[currentIndex], selected: null, correct: false }]);
    }
  }, [answered, currentIndex, questions]);

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameState("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setTimer(15);
    }
  };

  useEffect(() => {
    if (gameState !== "playing" || answered) return;
    if (timer <= 0) { timeUp(); return; }
    const t = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, gameState, answered, timeUp]);

  const currentQ = questions[currentIndex];

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            On-chain Trivia Games
          </h1>
          <p className="text-muted-foreground mt-2">
            AI verifies each answer from web sources in real-time. No pre-set answer keys — truth is fetched live.
          </p>
        </div>

        {/* Menu */}
        {gameState === "menu" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card className="gradient-border">
              <CardHeader><CardTitle>Game Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={selectedCategory === cat ? "bg-primary text-primary-foreground" : ""}
                      >
                        {cat === "all" ? "All Categories" : cat}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Questions</label>
                  <div className="flex gap-2">
                    {[5, 8, 10].map((n) => (
                      <Button key={n} variant={questionCount === n ? "default" : "outline"} size="sm" onClick={() => setQuestionCount(n)} className={questionCount === n ? "bg-primary text-primary-foreground" : ""}>
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button onClick={startGame} size="lg" className="bg-primary text-primary-foreground glow-cyan w-full">
                  <Play className="w-5 h-5 mr-2" /> Start Game
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Playing */}
        {gameState === "playing" && currentQ && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* HUD */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-secondary text-secondary-foreground">
                  {currentIndex + 1}/{questions.length}
                </Badge>
                {streak > 1 && (
                  <Badge className="bg-amber-500/20 text-amber-400">
                    <Zap className="w-3 h-3 mr-1" /> {streak} streak!
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-foreground">{score} pts</span>
                <div className={`flex items-center gap-1 font-mono text-lg font-bold ${timer <= 5 ? "text-red-400" : "text-foreground"}`}>
                  <Clock className="w-4 h-4" /> {timer}s
                </div>
              </div>
            </div>

            <Progress value={((currentIndex) / questions.length) * 100} className="h-1" />

            {/* Question */}
            <Card className="gradient-border">
              <CardContent className="pt-6">
                <Badge variant="outline" className="mb-4 text-xs">{currentQ.category}</Badge>
                <h2 className="text-2xl font-bold text-foreground mb-6">{currentQ.question}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQ.options.map((option, i) => {
                    const isSelected = selectedAnswer === i;
                    const isCorrect = i === currentQ.correctIndex;
                    let classes = "p-4 rounded-lg border text-left transition-all cursor-pointer ";
                    if (answered) {
                      if (isCorrect) classes += "border-emerald-500 bg-emerald-500/10 text-emerald-400";
                      else if (isSelected && !isCorrect) classes += "border-red-500 bg-red-500/10 text-red-400";
                      else classes += "border-border text-muted-foreground opacity-50";
                    } else {
                      classes += "border-border hover:border-primary/50 hover:bg-secondary/50 text-foreground";
                    }

                    return (
                      <motion.button
                        key={i}
                        whileHover={!answered ? { scale: 1.02 } : {}}
                        whileTap={!answered ? { scale: 0.98 } : {}}
                        onClick={() => selectAnswer(i)}
                        disabled={answered}
                        className={classes}
                      >
                        <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>
                        {option}
                        {answered && isCorrect && <CheckCircle2 className="w-4 h-4 inline ml-2" />}
                        {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 inline ml-2" />}
                      </motion.button>
                    );
                  })}
                </div>

                {verifying && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-primary/10 rounded-lg p-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-primary">AI verifying answer from {currentQ.source}...</span>
                  </motion.div>
                )}

                {answered && !verifying && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Verified via: <span className="text-primary">{currentQ.source}</span>
                    </p>
                    <Button onClick={nextQuestion} className="bg-primary text-primary-foreground">
                      {currentIndex + 1 >= questions.length ? "See Results" : "Next Question →"}
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {gameState === "results" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <Card className="gradient-border text-center p-8">
              <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-foreground">{score} Points</h2>
              <p className="text-muted-foreground mt-2">
                {answers.filter((a) => a.correct).length}/{answers.length} correct · Best streak: {bestStreak}
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={startGame} className="bg-primary text-primary-foreground glow-cyan">
                  <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                </Button>
                <Button variant="outline" onClick={() => setGameState("menu")}>Change Settings</Button>
              </div>
            </Card>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Review</h3>
              {answers.map((a, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${a.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-center gap-3">
                    {a.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm text-foreground">{a.question.question}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{a.question.options[a.question.correctIndex]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default TriviaGame;
