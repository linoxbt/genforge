import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, TrendingUp, History, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";

const typeColors: Record<string, string> = {
  deposit: "text-primary",
  withdraw: "text-destructive",
  bet: "text-yellow-400",
  reward: "text-primary",
  payment: "text-blue-400",
  bounty: "text-purple-400",
};

const typeBadgeVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  deposit: "default",
  withdraw: "destructive",
  bet: "secondary",
  reward: "default",
  payment: "outline",
  bounty: "secondary",
};

const WalletPage = () => {
  const { balance, transactions, deposit, withdraw, address } = useWallet();
  const { toast } = useToast();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    deposit(amt);
    setDepositAmount("");
    toast({ title: `Deposited ${amt.toFixed(2)} ETH` });
  };

  const handleWithdraw = () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const ok = withdraw(amt, "Manual withdrawal");
    if (!ok) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setWithdrawAmount("");
    toast({ title: `Withdrew ${amt.toFixed(2)} ETH` });
  };

  // Build balance-over-time chart data from transactions (oldest first)
  const chartData = (() => {
    const reversed = [...transactions].reverse();
    let running = 0;
    return reversed.map((tx, i) => {
      running += tx.amount;
      return {
        index: i,
        label: tx.description.slice(0, 16),
        balance: Math.max(0, parseFloat(running.toFixed(4))),
      };
    });
  })();

  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <WalletIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold font-mono">Wallet</h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-mono">Balance</p>
                <p className="text-2xl font-bold font-mono text-primary">{balance.toFixed(4)} ETH</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <ArrowDownLeft className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-mono">Total In</p>
                <p className="text-xl font-bold font-mono">{totalIn.toFixed(4)} ETH</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <ArrowUpRight className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground font-mono">Total Out</p>
                <p className="text-xl font-bold font-mono">{totalOut.toFixed(4)} ETH</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Balance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(130 60% 46%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(130 60% 46%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 12% 18%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(210 10% 50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(210 10% 50%)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(210 12% 10%)",
                        border: "1px solid hsl(210 12% 18%)",
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: "JetBrains Mono",
                      }}
                    />
                    <Area type="monotone" dataKey="balance" stroke="hsl(130 60% 46%)" fill="url(#balGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-12 text-center">Make some transactions to see the chart.</p>
              )}
            </CardContent>
          </Card>

          {/* Deposit / Withdraw */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-mono">Deposit (Testnet)</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={handleDeposit} size="sm" className="shrink-0">
                    <ArrowDownLeft className="w-4 h-4 mr-1" /> Deposit
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-mono">Withdraw</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={handleWithdraw} size="sm" variant="outline" className="shrink-0">
                    <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
                  </Button>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-mono">Address</p>
                <p className="text-xs font-mono text-foreground truncate">{address}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">Network: Asimov Testnet</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Transaction History ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No transactions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Type</TableHead>
                    <TableHead className="font-mono text-xs">Description</TableHead>
                    <TableHead className="font-mono text-xs text-right">Amount</TableHead>
                    <TableHead className="font-mono text-xs text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant={typeBadgeVariant[tx.type] || "secondary"} className="font-mono text-xs">
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.description}</TableCell>
                      <TableCell className={`font-mono text-xs text-right font-bold ${tx.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                        {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(4)} ETH
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">
                        {tx.timestamp.toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default WalletPage;
