import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetRewards, useReportBin } from '@workspace/api-client-react';
import { 
  Ticket, History, ArrowUpRight, ArrowDownRight, Coffee, Shirt, Star, 
  Sparkles, Loader2, Zap, LogIn, QrCode, Award, Camera, Check, 
  CheckCircle2, AlertTriangle, Upload, X, RefreshCw, HelpCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { motion, AnimatePresence } from 'framer-motion';

// Mock available offers in marketplace
const MARKETPLACE_OFFERS = [
  { id: 'offer-eco-cup', title: 'Free Eco-Cup Refill', description: 'Get a free refill of any beverage in your commemorative eco-cup.', cost: 200, category: 'food' },
  { id: 'offer-scarf', title: 'Official Matchday Scarf', description: 'Redeem for a limited-edition stadium scarf at the official fan shop.', cost: 1200, category: 'merch' },
  { id: 'offer-lounge', title: 'VIP Lounge Access', description: 'One-hour pass to the climate-controlled Executive Lounge.', cost: 1500, category: 'upgrade' },
  { id: 'offer-photo', title: 'Pitch-Side Photo Op', description: 'Gain exclusive field-level access post-match for a professional photo.', cost: 2000, category: 'experience' }
];

export default function RewardsPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { greenPoints, addGreenPoints, spendGreenPoints } = useStore();
  const loggedInUser = useStore((state) => state.user) || { id: 'fan-001', name: 'Emerald Fan' };

  // Fetch wallet for transaction history
  const { data: walletData, isLoading, refetch } = useGetRewards({ 
    userId: loggedInUser?.id || 'fan-001' 
  });

  const reportBinMutation = useReportBin();

  // Local state for quest/action center interactions
  const [transitLoading, setTransitLoading] = useState(false);
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [binSubmitting, setBinSubmitting] = useState(false);
  const [binSuccessBanner, setBinSuccessBanner] = useState(false);

  // Insufficient credits tooltip state
  const [insufficientId, setInsufficientId] = useState<string | null>(null);

  // Local state for marketplace redemption
  const [redeemedItem, setRedeemedItem] = useState<any | null>(null);
  const [claimQrCode, setClaimQrCode] = useState<string | null>(null);
  const [animatedPoints, setAnimatedPoints] = useState(greenPoints);

  // Local transactions array to show newly earned/spent credits immediately
  const [localTransactions, setLocalTransactions] = useState<any[]>([]);

  // Synchronize points animation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (animatedPoints !== greenPoints) {
      const diff = greenPoints - animatedPoints;
      const step = diff > 0 ? 5 : -5;
      timer = setTimeout(() => {
        if (Math.abs(diff) <= 5) {
          setAnimatedPoints(greenPoints);
        } else {
          setAnimatedPoints(prev => prev + step);
        }
      }, 10);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [greenPoints, animatedPoints]);

  // Action Center: Report Bin Submission
  const handleReportBinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      toast({
        title: "Error",
        description: "Please select a location.",
        variant: "destructive"
      });
      return;
    }

    setBinSubmitting(true);
    setBinSuccessBanner(false);

    // Map location to simulated bin ID
    const zoneBinMap: Record<string, string> = {
      'NE Concourse': 'bin-ne-1',
      'NW Concourse': 'bin-nw-1',
      'SE Concourse': 'bin-se-1',
      'SW Concourse': 'bin-sw-1',
      'West Gate': 'bin-nw-1'
    };
    const binId = zoneBinMap[selectedLocation] || 'bin-ne-1';

    try {
      await reportBinMutation.mutateAsync({
        binId,
        data: { userId: loggedInUser.id }
      });
    } catch (err) {
      console.warn("API database report warning (offline simulation mode):", err);
    }

    setTimeout(() => {
      // Add 100 CR
      addGreenPoints(100);

      const newTx = {
        id: `local-t-${Date.now()}`,
        type: 'earned',
        amount: 100,
        description: `Verified Waste Bin Report (${selectedLocation})`,
        createdAt: new Date().toISOString()
      };
      setLocalTransactions(prev => [newTx, ...prev]);

      setBinSubmitting(false);
      setBinSuccessBanner(true);

      toast({
        title: "Report Verified",
        description: "AI verified your report! Thank you for maintaining sustainability.",
        className: "bg-emerald-600 text-white border-emerald-500"
      });
    }, 1000);
  };

  // Action Center: Verify Transit Scan
  const handleVerifyTransit = () => {
    setTransitLoading(true);
    
    // Quick logic loop to simulate transit QR scanning
    setTimeout(() => {
      addGreenPoints(50);
      
      const newTx = {
        id: `local-t-${Date.now()}`,
        type: 'earned',
        amount: 50,
        description: 'Verified Metro Green Transit Arrival',
        createdAt: new Date().toISOString()
      };
      setLocalTransactions(prev => [newTx, ...prev]);
      setTransitLoading(false);

      toast({
        title: "Transit Verified!",
        description: "Successfully awarded 50 CR for eco-friendly transit.",
        className: "bg-emerald-600 text-white border-emerald-500 shadow-xl"
      });
    }, 1200);
  };

  // Marketplace Redemption
  const handleClaim = (offer: any) => {
    if (greenPoints < offer.cost) {
      // Elegant Insufficient Credits tooltip display
      setInsufficientId(offer.id);
      setTimeout(() => {
        setInsufficientId(null);
      }, 3000);

      toast({
        title: "Insufficient Credits",
        description: `You need ${offer.cost - greenPoints} more credits to redeem this reward.`,
        variant: "destructive"
      });
      return;
    }

    // Deduct points
    spendGreenPoints(offer.cost);

    // Create a dynamic claim voucher with success code
    const secureCode = `CLAIM-${offer.id.split('-')[1].toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const newTx = {
      id: `local-t-${Date.now()}`,
      type: 'redeemed',
      amount: offer.cost,
      description: `Claimed Voucher: ${offer.title} (${secureCode})`,
      createdAt: new Date().toISOString()
    };
    setLocalTransactions(prev => [newTx, ...prev]);

    setRedeemedItem(offer);
    setClaimQrCode(secureCode);

    toast({
      title: "Voucher Generated",
      description: `Success! ${offer.title} claimed under history log.`,
      className: "bg-emerald-600 text-white border-emerald-500"
    });
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'food': return <Coffee className="w-5 h-5 text-emerald-400" />;
      case 'merch': return <Shirt className="w-5 h-5 text-blue-400" />;
      case 'upgrade': return <Star className="w-5 h-5 text-amber-400" />;
      case 'experience': return <Sparkles className="w-5 h-5 text-purple-400" />;
      default: return <Ticket className="w-5 h-5 text-teal-400" />;
    }
  };

  const serverTransactions = walletData?.transactions || [];
  const allTransactions = [...localTransactions, ...serverTransactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex-1 bg-[#090D16] text-white overflow-y-auto pb-36">
      {/* Glassmorphic Fan Balance Header */}
      <div className="relative p-6 md:p-8 overflow-hidden bg-gradient-to-br from-emerald-950/40 via-background to-background border-b border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="text-start">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Vibe Stadium Rewards Program</span>
            </div>
            
            {/* Glass Balance Display */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center gap-6 max-w-md">
              <div className="flex-1">
                <span className="text-xs font-medium text-muted-foreground block uppercase tracking-wider">Your Balance</span>
                <span className="text-4xl md:text-5xl font-black tracking-tight text-white block mt-1">
                  {animatedPoints.toLocaleString()} <span className="text-lg font-bold text-emerald-400">CR</span>
                </span>
              </div>
              <div className="h-12 w-[1px] bg-white/10" />
              <div>
                <span className="text-xs font-medium text-muted-foreground block uppercase tracking-wider">Tier Status</span>
                <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mt-1 inline-block">
                  Emerald Fan
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button 
              onClick={() => refetch()}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
              title="Refresh ledger data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto text-start">
        
        {/* Action Reporting Center Layout Block */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
            <Zap className="w-5 h-5 text-emerald-400" /> Action Reporting Center
          </h2>
          <Card className="p-5 bg-white/[0.02] border-white/5 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="text-start space-y-1">
              <h3 className="font-bold text-base text-white">Earn Green Credits (CR)</h3>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                Take part in local sustainability actions around the stadium to claim reward points instantly.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              {/* Button 1: Report Bin */}
              <Button 
                onClick={() => { setBinModalOpen(true); setBinSuccessBanner(false); }}
                className="rounded-xl px-5 py-5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-white font-bold transition-all text-xs"
              >
                ♻️ Report Crowded/Full Waste Bin
              </Button>

              {/* Button 2: Scan Transit */}
              <Button 
                onClick={handleVerifyTransit}
                disabled={transitLoading}
                className="rounded-xl px-5 py-5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-white font-bold transition-all text-xs"
              >
                {transitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Transit...
                  </>
                ) : "🚇 Verify Metro/Green Transit Arrival"}
              </Button>
            </div>
          </Card>
        </section>

        {/* Premium Marketplace (Available Rewards Grid) */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
            <Sparkles className="w-5 h-5" /> Available Rewards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MARKETPLACE_OFFERS.map((offer) => {
              const progress = Math.min(100, (greenPoints / offer.cost) * 100);
              const canAfford = greenPoints >= offer.cost;
              const hasTooltipActive = insufficientId === offer.id;

              return (
                <Card key={offer.id} className="p-5 bg-white/[0.02] border-white/5 hover:bg-white/[0.03] transition-all flex flex-col justify-between relative overflow-visible">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {getCategoryIcon(offer.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate">{offer.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {offer.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round(progress)}% ({greenPoints} / {offer.cost} CR)</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 relative overflow-visible">
                      <span className="font-mono font-bold text-emerald-400">{offer.cost} CR</span>
                      
                      {/* Redemption Button Wrapper with tooltips */}
                      <div className="relative overflow-visible">
                        <Button
                          onClick={() => handleClaim(offer)}
                          className={cn(
                            "px-5 py-1.5 rounded-full text-xs font-bold transition-all text-white border",
                            canAfford 
                              ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-500 font-bold" 
                              : "bg-white/5 border-white/10 text-white/40 cursor-pointer"
                          )}
                        >
                          Claim Reward
                        </Button>

                        {/* Insufficient Credits Tooltip Overlay */}
                        <AnimatePresence>
                          {hasTooltipActive && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.95 }}
                              animate={{ opacity: 1, y: -45, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.95 }}
                              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-950 border border-red-500/30 text-red-200 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-xl whitespace-nowrap z-30"
                            >
                              <AlertTriangle className="w-3 h-3 text-red-400 inline mr-1" />
                              Insufficient Credits! Need {offer.cost - greenPoints} CR more.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Ledger & Transactions History */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
            <History className="w-5 h-5 text-emerald-400" /> History & Active Vouchers
          </h2>
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            {allTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transaction records. Earn or spend credits above!</div>
            ) : (
              <div className="divide-y divide-white/5">
                {allTransactions.map((tx: any) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        tx.type === 'earned' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-muted-foreground border border-white/10"
                      )}>
                        {tx.type === 'earned' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">{tx.description}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "font-mono font-bold text-sm",
                      tx.type === 'earned' ? "text-emerald-400" : "text-white/60"
                    )}>
                      {tx.type === 'earned' ? '+' : '-'}{tx.amount} CR
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Action Center: Report Bin Micro-Modal */}
      <AnimatePresence>
        {binModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0D1424] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-start shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => { setBinModalOpen(false); setBinSuccessBanner(false); setSelectedLocation(''); }}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-emerald-400">
                ♻️ Waste Bin Report
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Submit details on full or crowded waste concourses.
              </p>

              {/* Alert Banner inside Modal */}
              <AnimatePresence>
                {binSuccessBanner && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-[11px] font-bold mb-4 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>AI verified your report! Thank you for maintaining sustainability.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleReportBinSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Location</label>
                  <select 
                    value={selectedLocation} 
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="" disabled className="bg-[#0D1424]">Select zone location...</option>
                    <option value="NE Concourse" className="bg-[#0D1424]">NE Concourse</option>
                    <option value="NW Concourse" className="bg-[#0D1424]">NW Concourse</option>
                    <option value="SE Concourse" className="bg-[#0D1424]">SE Concourse</option>
                    <option value="SW Concourse" className="bg-[#0D1424]">SW Concourse</option>
                    <option value="West Gate" className="bg-[#0D1424]">West Gate</option>
                  </select>
                </div>

                <Button 
                  type="submit"
                  disabled={!selectedLocation || binSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 font-bold py-3.5 rounded-xl transition-all text-white shadow-lg text-xs"
                >
                  {binSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Bin Location...
                    </>
                  ) : "Submit Report"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Redemption Success Modal */}
      <AnimatePresence>
        {redeemedItem && claimQrCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D1424] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl relative"
            >
              <button 
                onClick={() => { setRedeemedItem(null); setClaimQrCode(null); }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <h3 className="text-xl font-black mb-1">Redemption Success!</h3>
              <p className="text-sm text-emerald-400 font-semibold mb-6">{redeemedItem.title}</p>

              {/* Dynamic QR Claim Block */}
              <div className="bg-white p-5 rounded-2xl max-w-[200px] mx-auto mb-6 shadow-xl flex flex-col items-center border border-white/10 relative">
                {/* SVG QR Code Simulation */}
                <svg viewBox="0 0 100 100" className="w-36 h-36">
                  {/* Outer corners */}
                  <rect x="5" y="5" width="25" height="25" fill="#000" stroke="#000" strokeWidth="2" />
                  <rect x="10" y="10" width="15" height="15" fill="#fff" />
                  <rect x="13" y="13" width="9" height="9" fill="#000" />

                  <rect x="70" y="5" width="25" height="25" fill="#000" stroke="#000" strokeWidth="2" />
                  <rect x="75" y="10" width="15" height="15" fill="#fff" />
                  <rect x="78" y="13" width="9" height="9" fill="#000" />

                  <rect x="5" y="70" width="25" height="25" fill="#000" stroke="#000" strokeWidth="2" />
                  <rect x="10" y="75" width="15" height="15" fill="#fff" />
                  <rect x="13" y="78" width="9" height="9" fill="#000" />

                  {/* Mock QR dots */}
                  <g fill="#000">
                    <rect x="35" y="5" width="8" height="8" />
                    <rect x="48" y="12" width="6" height="6" />
                    <rect x="60" y="8" width="5" height="10" />
                    <rect x="38" y="20" width="12" height="4" />
                    <rect x="52" y="25" width="6" height="6" />
                    <rect x="72" y="38" width="8" height="8" />
                    <rect x="85" y="42" width="10" height="5" />
                    <rect x="35" y="48" width="14" height="6" />
                    <rect x="12" y="42" width="8" height="8" />
                    <rect x="22" y="55" width="6" height="12" />
                    <rect x="42" y="60" width="15" height="5" />
                    <rect x="60" y="52" width="10" height="10" />
                    <rect x="72" y="68" width="8" height="8" />
                    <rect x="85" y="75" width="10" height="10" />
                    <rect x="35" y="78" width="18" height="12" />
                    <rect x="62" y="82" width="8" height="8" />
                  </g>
                </svg>

                <div className="bg-emerald-950/10 text-emerald-800 font-mono font-bold text-xs mt-4 px-3 py-1 rounded border border-emerald-900/20">
                  {claimQrCode}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed px-4 text-center">
                Show this QR code to any concourse vendor staff to scan and collect your physical reward coupon.
              </p>

              <Button 
                onClick={() => { setRedeemedItem(null); setClaimQrCode(null); }}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl py-3 mt-6 font-bold"
              >
                Close & Return
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
