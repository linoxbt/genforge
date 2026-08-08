import { useState, useEffect, useCallback } from "react";
import { Brain, Play, Trophy, Clock, CheckCircle2, XCircle, RotateCcw, Zap, Loader2, Wallet, Sparkles } from "lucide-react";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { readClient, isExecutionSuccess, executionErrorMessage, WAIT_STATUS } from "@/lib/genlayer";
import { CONTRACTS } from "@/config/contracts";

interface ChainQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  asker_address: string;
  answered: boolean;
  correct_index?: number;
  source?: string;
  explanation?: string;
  answerer_address?: string;
  selected_index?: number;
  correct?: boolean;
  reward_paid?: string;
}

interface AnsweredRecord {
  question: ChainQuestion;
  selected: number | null;
  correct: boolean;
  rewardPaid: bigint;
}

type GameState = "menu" | "generating" | "playing" | "submitting" | "results";

const CATEGORIES = ["all", "GenLayer", "Blockchain", "Crypto", "Science", "History", "Geography", "Technology", "Sports", "Music"];

const TriviaGame = () => {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [currentQuestion, setCurrentQuestion] = useState<ChainQuestion | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(20);
  const [answers, setAnswers] = useState<AnsweredRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [questionCount, setQuestionCount] = useState(5);
  const { toast } = useToast();
  const { isConnected, client, connect } = useWallet();

  const generateQuestion = async (): Promise<ChainQuestion | null> => {
    if (!client) return null;
    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.triviaRewards,
        functionName: "generate_question",
        args: [selectedCategory],
        value: 0n,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 150, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      const list = await readClient.readContract({ address: CONTRACTS.triviaRewards, functionName: "list_questions", args: [] });
      const newest = (list as unknown as ChainQuestion[])[0];
      return newest || null;
    } catch (e: any) {
      toast({ title: "Failed to generate question", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const startGame = async () => {
    if (!isConnected) {
      connect();
      toast({ title: "Wallet required", description: "Connect your wallet to play and earn GEN rewards.", variant: "destructive" });
      return;
    }

    setScore(0);
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setQuestionsAnswered(0);
    setGameState("generating");

    const q = await generateQuestion();
    if (!q) { setGameState("menu"); return; }

    setCurrentQuestion(q);
    setSelectedAnswer(null);
    setTimer(20);
    setGameState("playing");
  };

  const selectAnswer = async (index: number) => {
    if (!currentQuestion || !client || gameState !== "playing") return;
    setSelectedAnswer(index);
    setGameState("submitting");

    try {
      const txHash = await client.writeContract({
        address: CONTRACTS.triviaRewards,
        functionName: "submit_answer",
        args: [BigInt(currentQuestion.id), index],
        value: 0n,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: WAIT_STATUS, retries: 90, interval: 5000 });
      if (!isExecutionSuccess(receipt)) throw new Error(executionErrorMessage(receipt));

      const answered = await readClient.readContract({ address: CONTRACTS.triviaRewards, functionName: "get_question", args: [BigInt(currentQuestion.id)] }) as unknown as ChainQuestion;
      const rewardPaid = BigInt(answered.reward_paid || "0");

      if (answered.correct) {
        const points = 100 + timer * 10;
        setScore((s) => s + points);
        setStreak((s) => { const next = s + 1; setBestStreak((b) => Math.max(b, next)); return next; });
      } else {
        setStreak(0);
      }

      setCurrentQuestion(answered);
      setAnswers((prev) => [...prev, { question: answered, selected: index, correct: !!answered.correct, rewardPaid }]);
    } catch (e: any) {
      toast({ title: "Failed to submit answer", description: e.message, variant: "destructive" });
    }
    setGameState("playing"); // back to "playing" so the answered-state UI (revealed answer) renders
  };

  const timeUp = useCallback(() => {
    if (!currentQuestion || currentQuestion.answered) return;
    setStreak(0);
    setAnswers((prev) => [...prev, { question: currentQuestion, selected: null, correct: false, rewardPaid: 0n }]);
    setCurrentQuestion((q) => (q ? { ...q, answered: true } : q));
  }, [currentQuestion]);

  const nextQuestion = async () => {
    const answeredCount = questionsAnswered + 1;
    setQuestionsAnswered(answeredCount);

    if (answeredCount >= questionCount) {
      setGameState("results");
      return;
    }

    setGameState("generating");
    const q = await generateQuestion();
    if (!q) { setGameState("results"); return; }

    setCurrentQuestion(q);
    setSelectedAnswer(null);
    setTimer(20);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion || currentQuestion.answered) return;
    if (timer <= 0) { timeUp(); return; }
    const t = setTimeout(() => setTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, gameState, currentQuestion, timeUp]);

  const totalRewardEarned = answers.reduce((sum, a) => sum + a.rewardPaid, 0n);
  const answered = !!currentQuestion?.answered;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Trivia Games
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Every question is generated live by a GenLayer Intelligent Contract. Correct answers pay real GEN on-chain.</p>
        </div>

        {!isConnected && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">Connect your wallet to play trivia and earn GEN rewards.</p>
              </div>
              <Button size="sm" onClick={() => connect()} className="bg-primary text-primary-foreground text-xs">
                <Wallet className="w-3 h-3 mr-1" /> Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {gameState === "menu" && (
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Game Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? "bg-primary text-primary-foreground" : ""}>
                      {cat === "all" ? "All Categories" : cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Number of Questions</label>
                <div className="flex gap-2">
                  {[3, 5, 8].map((n) => (
                    <Button key={n} variant={questionCount === n ? "default" : "outline"} size="sm" onClick={() => setQuestionCount(n)}
                      className={questionCount === n ? "bg-primary text-primary-foreground" : ""}>{n}</Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Each question is generated as a real on-chain transaction — fewer questions means less waiting.</p>
              </div>
              <Button onClick={startGame} className="bg-primary text-primary-foreground w-full">
                <Play className="w-4 h-4 mr-2" /> {isConnected ? "Generate & Start" : "Connect Wallet to Play"}
              </Button>
            </CardContent>
          </Card>
        )}

        {gameState === "generating" && (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-mono">Intelligent Contract is generating a question via validator consensus...</p>
              <p className="text-xs text-muted-foreground">This is a real on-chain transaction — it can take a little while.</p>
            </CardContent>
          </Card>
        )}

        {(gameState === "playing" || gameState === "submitting") && currentQuestion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-secondary text-secondary-foreground font-mono">{questionsAnswered + 1}/{questionCount}</Badge>
                <Badge variant="outline" className="text-xs font-mono">{currentQuestion.category}</Badge>
                {streak > 1 && <Badge className="bg-primary/20 text-primary"><Zap className="w-3 h-3 mr-1" />{streak}x streak</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground font-mono">{score} pts</span>
                {!answered && (
                  <span className={`font-mono text-sm font-bold ${timer <= 5 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                    <Clock className="w-3 h-3 inline mr-1" />{timer}s
                  </span>
                )}
              </div>
            </div>

            <Progress value={(questionsAnswered / questionCount) * 100} className="h-1" />

            <Card className="border-border">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-foreground mb-5">{currentQuestion.question}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentQuestion.options.map((option, i) => {
                    const isSelected = selectedAnswer === i;
                    const isCorrect = answered && i === currentQuestion.correct_index;
                    let cls = "p-3 rounded border text-left text-sm transition-all cursor-pointer ";
                    if (answered) {
                      if (isCorrect) cls += "border-primary bg-primary/10 text-primary";
                      else if (isSelected && !isCorrect) cls += "border-destructive bg-destructive/10 text-destructive";
                      else cls += "border-border text-muted-foreground opacity-40";
                    } else {
                      cls += "border-border hover:border-primary/40 text-foreground";
                    }
                    return (
                      <motion.button key={i} whileHover={!answered ? { scale: 1.01 } : {}} onClick={() => selectAnswer(i)} disabled={answered || gameState === "submitting"} className={cls}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>
                        {option}
                        {isCorrect && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                        {answered && isSelected && !isCorrect && <XCircle className="w-3 h-3 inline ml-1" />}
                      </motion.button>
                    );
                  })}
                </div>

                {gameState === "submitting" && (
                  <div className="mt-3 bg-primary/5 rounded p-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    <span className="text-xs text-primary font-mono">Submitting answer on-chain...</span>
                  </div>
                )}

                {answered && gameState === "playing" && (
                  <div className="mt-3 space-y-2">
                    {currentQuestion.explanation && (
                      <div className="bg-secondary/40 rounded p-2 text-xs text-foreground">
                        <span className="font-semibold text-primary">AI Explanation: </span>{currentQuestion.explanation}
                      </div>
                    )}
                    {currentQuestion.correct && currentQuestion.reward_paid && BigInt(currentQuestion.reward_paid) > 0n && (
                      <p className="text-xs text-primary font-mono flex items-center gap-1"><Sparkles className="w-3 h-3" /> +{formatEther(BigInt(currentQuestion.reward_paid))} GEN paid on-chain</p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-mono">
                        Source: <span className="text-primary">{currentQuestion.source}</span>
                      </p>
                      <Button size="sm" onClick={nextQuestion} className="bg-primary text-primary-foreground">
                        {questionsAnswered + 1 >= questionCount ? "View Results" : "Next →"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "results" && (
          <div className="space-y-4">
            <Card className="text-center p-6 border-border">
              <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-foreground font-mono">{score} pts</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {answers.filter((a) => a.correct).length}/{answers.length} correct · Best Streak: {bestStreak}
              </p>
              {totalRewardEarned > 0n && (
                <p className="text-primary text-sm mt-1 font-mono">
                  +{formatEther(totalRewardEarned)} GEN earned on-chain
                </p>
              )}
              <div className="flex gap-2 justify-center mt-4">
                <Button onClick={startGame} className="bg-primary text-primary-foreground"><RotateCcw className="w-3 h-3 mr-1" />Play Again</Button>
                <Button variant="outline" onClick={() => setGameState("menu")}>Settings</Button>
              </div>
            </Card>

            <div className="space-y-1">
              {answers.map((a, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded border text-sm ${a.correct ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {a.correct ? <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> : <XCircle className="w-3 h-3 text-destructive shrink-0" />}
                    <span className="text-foreground text-xs truncate">{a.question.question}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">
                    {a.question.correct_index !== undefined ? a.question.options[a.question.correct_index] : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </AppLayout>
  );
};

export default TriviaGame;
