import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BountyReview from "./pages/BountyReview";
import TriviaGame from "./pages/TriviaGame";
import GameMaster from "./pages/GameMaster";
import P2PBetting from "./pages/P2PBetting";
import ContractDeploy from "./pages/ContractDeploy";
import Settings from "./pages/Settings";
import Docs from "./pages/Docs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/bounties" element={<BountyReview />} />
            <Route path="/trivia" element={<TriviaGame />} />
            <Route path="/rpg" element={<GameMaster />} />
            <Route path="/betting" element={<P2PBetting />} />
            <Route path="/deploy" element={<ContractDeploy />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
