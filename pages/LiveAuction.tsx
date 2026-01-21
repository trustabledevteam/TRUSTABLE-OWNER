import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gavel, Users, Clock, Trophy, Zap, ShieldCheck, ArrowRight, Play, UserCog, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Bid, Auction, ProxyBid } from '../types';
import { Modal, Input, Button } from '../components/UI';

export const LiveAuction: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Scheme ID
    const { user } = useAuth();
    
    // Core Data State
    const [auctionData, setAuctionData] = useState<Auction | null>(null);
    const [schemeData, setSchemeData] = useState<any>(null);
    const [myEnrollmentId, setMyEnrollmentId] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    
    // Live Auction State
    const [currentBid, setCurrentBid] = useState(0);
    const [lastBidderName, setLastBidderName] = useState("Waiting for bids...");
    const [lastBidderEnrollmentId, setLastBidderEnrollmentId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [bids, setBids] = useState<Bid[]>([]);
    const [auctionEnded, setAuctionEnded] = useState(false);
    const [winnerDetails, setWinnerDetails] = useState<any>(null);
    const [isUpcoming, setIsUpcoming] = useState(false);
    
    // -- OWNER PROXY STATE --
    const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
    const [offlineSubscribers, setOfflineSubscribers] = useState<{id: string, name: string}[]>([]);
    const [selectedProxySub, setSelectedProxySub] = useState('');
    const [proxyLimitAmount, setProxyLimitAmount] = useState('');
    const [activeProxies, setActiveProxies] = useState<ProxyBid[]>([]); // List of active proxies for this auction
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isPlacingBid, setIsPlacingBid] = useState(false);
    const timerRef = useRef<any>(null);

    // --- 1. INITIAL SETUP ---
    useEffect(() => {
        const init = async () => {
            if (!id || !user) return;
            setIsLoading(true);
            try {
                // Get Scheme details and check ownership
                const { data: schemeRaw } = await supabase.from('schemes').select('*').eq('id', id).single();
                if (schemeRaw) {
                    setSchemeData(schemeRaw);
                    if (schemeRaw.owner_id === user.id) setIsOwner(true);
                }

                // Get User Enrollment (if not owner)
                if (schemeRaw.owner_id !== user.id) {
                    const { data: enrollment } = await supabase.from('scheme_enrollments').select('id').eq('scheme_id', id).eq('subscriber_id', user.id).single();
                    if (enrollment) setMyEnrollmentId(enrollment.id);
                }

                // Fetch next auction
                const { data: auction } = await supabase
                    .from('auctions')
                    .select('*')
                    .eq('scheme_id', id)
                    .in('status', ['UPCOMING', 'LIVE'])
                    .order('auction_number', { ascending: true })
                    .limit(1)
                    .single();
                
                if (!auction) {
                    // Check if complete
                    const { count } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('scheme_id', id).eq('status', 'COMPLETED');
                    if (count === schemeRaw?.duration_months) setAuctionEnded(true);
                    return;
                }

                setAuctionData(auction);
                
                // Status Logic
                const auctionDate = new Date(auction.auction_date);
                const isUpcomingStatus = auction.status === 'UPCOMING';
                setIsUpcoming(isUpcomingStatus);

                // Load Historic Bids
                const { data: existingBids } = await supabase
                    .from('bids')
                    .select('*, scheme_enrollments!inner(subscriber_id, profiles:subscriber_id(full_name))') 
                    .eq('auction_id', auction.id)
                    .order('amount', { ascending: false });

                if (existingBids && existingBids.length > 0) {
                    const formattedBids = existingBids.map((b: any) => ({
                        id: b.id,
                        auctionId: b.auction_id,
                        userId: b.scheme_enrollments.subscriber_id,
                        enrollmentId: b.enrollment_id,
                        userName: b.scheme_enrollments.profiles?.full_name || 'Unknown',
                        amount: b.amount,
                        timestamp: new Date(b.created_at).toLocaleTimeString(),
                        isProxy: b.bid_type === 'PROXY'
                    }));
                    setBids(formattedBids);
                    setCurrentBid(formattedBids[0].amount);
                    setLastBidderName(formattedBids[0].userName);
                    setLastBidderEnrollmentId(formattedBids[0].enrollmentId);
                } else {
                    setCurrentBid(schemeRaw?.discount_min || 0);
                }

                // Timer Setup
                const durationMins = 20; 
                const targetTime = isUpcomingStatus ? auctionDate : new Date(auctionDate.getTime() + durationMins * 60000);
                const diffSeconds = Math.floor((targetTime.getTime() - new Date().getTime()) / 1000);
                setTimeLeft(diffSeconds > 0 ? diffSeconds : 0);

                // Load Proxies (Owner Only)
                if (schemeRaw.owner_id === user.id) {
                    const offlineSubs = await api.getOfflineSubscribersForProxy(id);
                    setOfflineSubscribers(offlineSubs);
                    
                    const proxies = await api.getAuctionProxies(auction.id);
                    setActiveProxies(proxies);
                }

            } catch (e) { console.error("Init failed", e); } 
            finally { setIsLoading(false); }
        };
        init();
    }, [id, user?.id]);

    // --- 2. REAL-TIME SUBSCRIPTION ---
    useEffect(() => {
        if (!auctionData) return;

        const channel = supabase.channel(`auction_room:${auctionData.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionData.id}` },
                async (payload) => {
                    const newBidRow = payload.new;
                    const { data: enrolData } = await supabase.from('scheme_enrollments').select('subscriber_id, profiles:subscriber_id(full_name)').eq('id', newBidRow.enrollment_id).single();
                    
                    const profiles: any = enrolData?.profiles;
                    const bidderName = profiles?.full_name || profiles?.[0]?.full_name || 'Unknown';

                    const newBid: Bid = {
                        id: newBidRow.id,
                        auctionId: newBidRow.auction_id,
                        userId: enrolData?.subscriber_id,
                        enrollmentId: newBidRow.enrollment_id,
                        userName: bidderName,
                        amount: newBidRow.amount,
                        timestamp: new Date(newBidRow.created_at).toLocaleTimeString(),
                        isProxy: newBidRow.bid_type === 'PROXY'
                    };

                    setBids(prev => [newBid, ...prev]);
                    setCurrentBid(newBidRow.amount);
                    setLastBidderName(bidderName);
                    setLastBidderEnrollmentId(newBidRow.enrollment_id);
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionData.id}` },
                (payload) => {
                    if (payload.new.status === 'LIVE') {
                        setIsUpcoming(false);
                        setTimeLeft(20 * 60);
                    }
                    if (payload.new.status === 'COMPLETED') {
                        setAuctionEnded(true);
                        handleEndAuction(); // Refresh details
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [auctionData, schemeData]);

    // --- 3. SYSTEM AUTO-BIDDER (OWNER SIDE) ---
    useEffect(() => {
        // Runs only when LIVE. Proxies are set during UPCOMING/LIVE.
        if (!isOwner || isUpcoming || auctionEnded || activeProxies.length === 0) return;

        const runAutoBidder = async () => {
            const eligibleProxies = activeProxies.filter(p => 
                p.maxAmount > currentBid && 
                p.enrollmentId !== lastBidderEnrollmentId
            );

            if (eligibleProxies.length > 0) {
                const step = 100;
                const nextBid = currentBid + step;

                // Pick the proxy with the highest limit
                eligibleProxies.sort((a, b) => b.maxAmount - a.maxAmount);
                const winnerProxy = eligibleProxies[0];

                if (nextBid <= winnerProxy.maxAmount) {
                    setTimeout(async () => {
                        console.log(`[System] Auto-bidding for ${winnerProxy.subscriberName} @ ${nextBid}`);
                        await placeBidForEnrollment(nextBid, winnerProxy.enrollmentId, true);
                    }, 1500); 
                }
            }
        };

        runAutoBidder();
    }, [currentBid, activeProxies, isOwner, isUpcoming, auctionEnded, lastBidderEnrollmentId]);


    // --- 4. TIMER ---
    useEffect(() => {
        if (auctionEnded) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (isUpcoming) {
                        setIsUpcoming(false);
                        return 20 * 60; 
                    } else {
                        // If owner, finalize. If subscriber, just wait for signal.
                        if (isOwner) handleEndAuction();
                        return 0;
                    }
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [auctionEnded, isUpcoming, isOwner]);

    // --- 5. HELPERS & ACTIONS ---

    const placeBidForEnrollment = async (amount: number, enrollmentId: string, isSystemProxy = false) => {
        const maxAllowed = schemeData?.discountMax || (schemeData?.chitValue * 0.4);
        if (amount > maxAllowed) return alert(`Bid exceeds maximum discount limit (₹${maxAllowed}).`);

        try {
            await supabase.from('bids').insert([{
                auction_id: auctionData?.id,
                enrollment_id: enrollmentId,
                amount: amount,
                bid_type: isSystemProxy ? 'PROXY' : 'ONLINE'
            }]);
        } catch (error: any) {
            console.error("Bid failed", error);
        }
    };

    const handleOwnerAddProxy = async () => {
        if (!selectedProxySub || !proxyLimitAmount || !auctionData) return;
        try {
            // This relies on the new RLS policy for owners
            await api.setProxyBidLimit(auctionData.id, selectedProxySub, parseFloat(proxyLimitAmount));
            const proxies = await api.getAuctionProxies(auctionData.id);
            setActiveProxies(proxies);
            setIsProxyModalOpen(false);
            setProxyLimitAmount('');
            alert("Proxy Configured. System will auto-bid once auction starts.");
        } catch (e: any) {
            alert("Failed to set proxy: " + e.message);
        }
    };

    const handleForceStart = async () => {
        if (!auctionData || !isOwner) return;
        if (!confirm("Start auction now?")) return;
        await supabase.from('auctions').update({ status: 'LIVE', auction_date: new Date().toISOString() }).eq('id', auctionData.id);
    };

    const handleEndAuction = async () => {
        if (!isOwner) return;
        setAuctionEnded(true);
        clearInterval(timerRef.current);
        if (auctionData) {
            try {
                const { data, error } = await supabase.rpc('finalize_auction', { p_scheme_id: id });
                if (error) throw error;
                if (data && data.length > 0) {
                    const winner = data[0];
                    const { data: winProfile } = await supabase.from('scheme_enrollments').select('profiles(full_name)').eq('id', winner.winner_id).single();
                    const profileData: any = winProfile?.profiles;
                    const winnerName = Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name;

                    setWinnerDetails({
                        type: 'HIGHEST_BIDDER',
                        winnerName: winnerName || `Ticket #${winner.ticket_id}`,
                        amount: winner.winning_amount,
                        prize: (schemeData?.chitValue || 0) - winner.winning_amount
                    });
                }
            } catch (err) { console.error("Finalization error", err); }
        }
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (auctionEnded) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] bg-white p-8 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-bounce"><Trophy className="text-yellow-600" size={48} /></div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Auction Completed!</h1>
                <div className="bg-gray-50 rounded-xl p-8 w-full max-w-md border border-gray-200 text-center shadow-lg mt-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Winner</p>
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">{winnerDetails?.winnerName || "Processing..."}</h2>
                    <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-gray-500">Discount</p><p className="font-bold text-lg">₹{winnerDetails?.amount?.toLocaleString()}</p></div>
                        <div><p className="text-xs text-gray-500">Prize Amount</p><p className="font-bold text-lg text-green-600">₹{winnerDetails?.prize?.toLocaleString()}</p></div>
                    </div>
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => navigate(`/schemes/${id}/auctions`)} className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-all">Back to List</button>
                    {(auctionData?.auctionNumber || 0) < (schemeData?.duration || 0) && (
                        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">Next Auction <ArrowRight size={16} /></button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/schemes/${id}/auctions`)} className="bg-white border border-gray-200 text-gray-600 p-2 rounded-full hover:bg-gray-50"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            Auction Room 
                            {isUpcoming ? (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-200 font-bold flex items-center gap-1"><Clock size={12} /> UPCOMING</span>
                            ) : (
                                <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded border border-red-200 font-bold flex items-center gap-1 animate-pulse"><span className="w-2 h-2 bg-red-600 rounded-full block"></span> LIVE</span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500">{schemeData?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {isOwner && isUpcoming && (
                        <button onClick={handleForceStart} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2"><Play size={16} /> Start Now</button>
                    )}
                    <div className={`text-white px-4 py-2 rounded-lg flex items-center gap-2 font-mono font-bold shadow-md ${isUpcoming ? 'bg-blue-500' : (timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-gray-900')}`}>
                        <Clock size={18} />{formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Column: Stats & Controls */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Display Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-all group">
                        <div className="flex justify-between items-start relative z-10">
                            <div><p className="text-blue-100 font-medium mb-1 flex items-center gap-2"><Gavel size={18} /> Current Highest Bid</p><h2 className="text-6xl font-bold tracking-tight mt-2 drop-shadow-md">₹{currentBid.toLocaleString()}</h2></div>
                            <div className="text-right"><p className="text-blue-200 text-sm">Chit Value</p><p className="font-bold text-xl">₹{schemeData?.chitValue?.toLocaleString() || '0'}</p></div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-blue-500/30 flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shadow-inner">{lastBidderName.charAt(0)}</div>
                            <div><p className="text-sm text-blue-200">Latest Bidder</p><p className="font-bold text-xl flex items-center gap-2">{lastBidderName} {lastBidderEnrollmentId === myEnrollmentId && <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full">YOU</span>} {bids[0]?.isProxy && <Zap size={16} className="text-yellow-400 fill-current" />}</p></div>
                        </div>
                    </div>

                    {/* Controls Section - Logic Fixed to Show Owner Controls Anytime */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-center items-center gap-4 relative">
                        {isOwner ? (
                            // OWNER VIEW: Always show controls, even in UPCOMING
                            <div className="w-full">
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-purple-800 flex items-center gap-2"><UserCog size={18}/> Owner Controls</h4>
                                        <button onClick={() => setIsProxyModalOpen(true)} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 shadow-sm flex items-center gap-1 font-medium transition-transform hover:scale-105">
                                            <Zap size={12} className="fill-current"/> Configure Proxy
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-purple-600 mb-1">Active Proxies: {activeProxies.length}</p>
                                            <div className="text-[10px] text-gray-500 italic">System will auto-bid once auction is LIVE.</div>
                                        </div>
                                        {isUpcoming && <div className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">Auction not started</div>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // SUBSCRIBER VIEW: Only show bid controls if LIVE
                            <>
                                {isUpcoming ? (
                                    <div className="text-center w-full max-w-lg mb-4">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><Clock size={32}/></div>
                                        <h3 className="font-bold text-gray-800 mb-2">Auction starts in {formatTime(timeLeft)}</h3>
                                        <p className="text-sm text-gray-500">Please wait for the foreman to start the auction.</p>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <h3 className="font-bold text-gray-800 mb-4 text-center">Place Your Bid</h3>
                                        <div className="flex gap-4 w-full max-w-lg mx-auto">
                                            <button onClick={() => placeBidForEnrollment(currentBid + 100, myEnrollmentId!)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-100 font-bold py-4 rounded-xl hover:bg-blue-100 active:scale-95 transition-all">+ ₹100</button>
                                            <button onClick={() => placeBidForEnrollment(currentBid + 500, myEnrollmentId!)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-100 font-bold py-4 rounded-xl hover:bg-blue-100 active:scale-95 transition-all">+ ₹500</button>
                                            <button onClick={() => placeBidForEnrollment(currentBid + 1000, myEnrollmentId!)} className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg active:scale-95 transition-all">+ ₹1,000</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Feed */}
                <div className="flex flex-col gap-6 h-full min-h-0">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center"><h3 className="font-bold text-gray-800 text-sm">Live Bid Log</h3><Users size={16} className="text-gray-400" /></div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                            {bids.map((bid, index) => (
                                <div key={bid.id} className={`p-3 rounded-lg border flex justify-between items-center ${index === 0 ? 'bg-blue-50 border-blue-100 animate-in slide-in-from-top-2 duration-300' : 'bg-white border-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-mono text-gray-400">{bid.timestamp}</div>
                                        <div><p className="text-sm font-bold text-gray-900 flex items-center gap-2">{bid.userId === user?.id ? 'You' : bid.userName} {bid.isProxy && <span className="bg-purple-100 text-purple-600 text-[10px] px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1"><Zap size={8} className="fill-current"/> PROXY</span>}</p></div>
                                    </div>
                                    <div className="font-bold text-blue-600">₹{bid.amount.toLocaleString()}</div>
                                </div>
                            ))}
                            {bids.length === 0 && <div className="text-center p-8 text-gray-400 text-sm flex flex-col items-center gap-2"><Clock size={24} className="opacity-20" /><span>Waiting for first bid...</span></div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Owner Proxy Modal */}
            <Modal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} title="Configure Offline Proxy" maxWidth="max-w-md">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Select an offline subscriber to place bids on their behalf automatically during the live auction.</p>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Select Subscriber</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={selectedProxySub} onChange={(e) => setSelectedProxySub(e.target.value)}>
                            <option value="">Select Subscriber</option>
                            {offlineSubscribers.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input label="Max Bid Limit (₹)" type="number" value={proxyLimitAmount} onChange={(e) => setProxyLimitAmount(e.target.value)} placeholder="e.g. 15000" />
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsProxyModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleOwnerAddProxy} disabled={!selectedProxySub || !proxyLimitAmount}>Enable Proxy</Button>
                    </div>

                    {activeProxies.length > 0 && (
                        <div className="border-t pt-4 mt-2">
                            <h5 className="text-xs font-bold text-gray-500 mb-2">Active Proxies Configured</h5>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                {activeProxies.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                        <span className="font-medium text-gray-700">{p.subscriberName || 'Unknown'}</span>
                                        <span className="font-mono font-bold text-purple-600">Max: ₹{p.maxAmount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};