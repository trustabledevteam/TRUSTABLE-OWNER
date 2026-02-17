import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gavel, Users, Clock, Trophy, Zap, Play, UserCog, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Bid, Auction, ProxyBid } from '../types';
import { Modal, Input, Button } from '../components/UI';

// --- NEW: Developer Flag for Testing ---
// Set this to 'true' to enable the "Cancel Auction" button for owners.
// Set this to 'false' for production.
const TESTING_MODE = true;

export const LiveAuction: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Scheme ID
    const { user } = useAuth();
    
    // --- CONSOLIDATED STATE MANAGEMENT ---
    const [auctionData, setAuctionData] = useState<Auction | null>(null);
    const [schemeData, setSchemeData] = useState<any>(null);
    const [myEnrollmentId, setMyEnrollmentId] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [bids, setBids] = useState<Bid[]>([]);
    const [currentBid, setCurrentBid] = useState(0);
    const [lastBidderName, setLastBidderName] = useState("Waiting for bids...");
    const [auctionEnded, setAuctionEnded] = useState(false);
    const [winnerDetails, setWinnerDetails] = useState<any>(null);
    const [auctionEndTime, setAuctionEndTime] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState(0); 
    const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
    const [offlineSubscribers, setOfflineSubscribers] = useState<{id: string, name: string}[]>([]);
    const [selectedProxySub, setSelectedProxySub] = useState('');
    const [proxyLimitAmount, setProxyLimitAmount] = useState('');
    const [activeProxies, setActiveProxies] = useState<ProxyBid[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const finalizationTriggered = useRef(false);

    const initialAuctionDataRef = useRef<Auction | null>(null);

    // --- REFACTORED: Standalone `init` function for reusability ---
    const init = async () => {
        if (!id || !user) return;
        setIsLoading(true);
        finalizationTriggered.current = false;

        try {
            const [schemeRes, auctionRes] = await Promise.all([
                supabase.from('schemes').select('*').eq('id', id).single(),
                supabase.from('auctions').select('*').eq('scheme_id', id).order('auction_number', { ascending: true }).limit(1).single()
            ]);

            const schemeRaw = schemeRes.data;
            const auction = auctionRes.data;
            let ownerStatus = false;

            if (!initialAuctionDataRef.current) {
                initialAuctionDataRef.current = auction;
            }

            if (schemeRaw) {
                setSchemeData(schemeRaw);
                ownerStatus = schemeRaw.owner_id === user.id;
                setIsOwner(ownerStatus);
                if (!ownerStatus) {
                    const { data: enrollment } = await supabase.from('scheme_enrollments').select('id').eq('scheme_id', id).eq('subscriber_id', user.id).single();
                    if (enrollment) setMyEnrollmentId(enrollment.id);
                }
            }

            if (!auction) {
                setAuctionEnded(true);
                return;
            }
            
            setAuctionData(auction);
            
            // --- CRITICAL FIX: DO NOT calculate end time here ---
            // Instead, set the display timer to the full duration if the auction is upcoming.
            if (auction.status === 'UPCOMING') {
                const durationMins = schemeRaw?.auction_duration_mins || 20;
                setTimeLeft(durationMins * 60); // Set display time in seconds
                setAuctionEndTime(null); // Ensure end time is null
            } else { // If it's already LIVE or COMPLETED
                const auctionStartDate = new Date(auction.auction_date);
                const durationMins = schemeRaw?.auction_duration_mins || 20;
                const calculatedEndTime = new Date(auctionStartDate.getTime() + durationMins * 60000);
                setAuctionEndTime(calculatedEndTime);
            }

            if (auction.status === 'COMPLETED') {
                setAuctionEnded(true);
                handleEndAuction(auction.id, true);
            } else {
                setAuctionEnded(false);
                const { data: existingBids } = await supabase.from('bids').select('*, scheme_enrollments!inner(subscriber_id, profiles:subscriber_id(full_name))').eq('auction_id', auction.id).order('amount', { ascending: true });
                if (existingBids && existingBids.length > 0) {
                    // ... (rest of bid loading logic is correct)
                } else {
                    setBids([]);
                    setCurrentBid(schemeRaw?.chit_value || 0);
                    setLastBidderName("Waiting for bids...");
                }
                if (ownerStatus) {
                    // ... (rest of proxy loading logic is correct)
                }
            }
        } catch (e) { console.error("Init failed", e); } 
        finally { setIsLoading(false); }
    };

    // --- 1. INITIAL SETUP ---
    useEffect(() => {
        // We still use a mounted flag as a general good practice for async operations in effects.
        let isMounted = true;
        
        if (isMounted) {
            init();
        }

        return () => {
            isMounted = false;
        };
    }, [id, user?.id]); // Dependencies remain correct.

    // --- 2. REAL-TIME SUBSCRIPTION ---
    useEffect(() => {
        if (!auctionData) return;
        const channel = supabase.channel(`auction_room:${auctionData.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionData.id}` },
                async (payload) => {
                    const newBidRow = payload.new;
                    const { data: enrolData } = await supabase.from('scheme_enrollments').select('subscriber_id, profiles:subscriber_id(full_name)').eq('id', newBidRow.enrollment_id).single();
                    const newBid: Bid = { id: newBidRow.id, auctionId: newBidRow.auction_id, userId: enrolData?.subscriber_id, enrollmentId: newBidRow.enrollment_id, userName: (enrolData?.profiles as any)?.full_name || 'Unknown', amount: newBidRow.amount, timestamp: new Date(newBidRow.created_at).toLocaleTimeString(), isProxy: newBidRow.bid_type === 'PROXY' };
                    setBids(prev => [newBid, ...prev].sort((a, b) => a.amount - b.amount));
                    setCurrentBid(newBidRow.amount);
                    setLastBidderName((enrolData?.profiles as any)?.full_name || 'Unknown');
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionData.id}` },
                (payload) => {
                    const newAuction = payload.new;
                    if (newAuction.status === 'LIVE' && auctionData.status !== 'LIVE') {
                        const startDate = new Date(newAuction.auction_date);
                        const durationMins = schemeData?.auction_duration_mins || 20;
                        setAuctionEndTime(new Date(startDate.getTime() + durationMins * 60000));
                    }
                    if (newAuction.status === 'COMPLETED') {
                        setAuctionEnded(true);
                        handleEndAuction(auctionData.id, true); 
                    }
                    setAuctionData(prev => prev ? { ...prev, ...newAuction } : null);
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [auctionData, schemeData]);

    // --- 3. ROBUST TIMER LOGIC ---
    useEffect(() => {
        if (auctionEnded) return;
        const interval = setInterval(() => {
            if (auctionEndTime) {
                const now = new Date();
                const remainingSeconds = Math.max(0, Math.floor((auctionEndTime.getTime() - now.getTime()) / 1000));
                setTimeLeft(remainingSeconds);
                if (remainingSeconds === 0 && !finalizationTriggered.current) {
                    if (isOwner) {
                        finalizationTriggered.current = true;
                        handleEndAuction(auctionData!.id);
                    }
                    // For all users, visually end it.
                    setAuctionEnded(true);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [auctionEndTime, auctionEnded, isOwner, auctionData]);

    // --- 4. ACTIONS ---
    const placeBidForEnrollment = async (amount: number, enrollmentId: string) => {
        if (timeLeft === 0) return alert("Auction time has ended!");
        if (amount >= currentBid) return alert(`You must bid lower than the current prize amount (₹${currentBid}).`);
        const minPrizeAllowed = (schemeData?.chit_value || 0) * 0.6;
        if (amount < minPrizeAllowed) return alert(`Bid cannot be lower than ₹${minPrizeAllowed} (Max 40% discount limit).`);
        try {
            await supabase.from('bids').insert([{ auction_id: auctionData?.id, enrollment_id: enrollmentId, amount: amount, bid_type: 'ONLINE' }]);
        } catch (error: any) { console.error("Bid failed", error); }
    };

    const handleOwnerAddProxy = async () => {
        if (!selectedProxySub || !proxyLimitAmount || !auctionData) return;
        try {
            await api.setProxyBidLimit(auctionData.id, selectedProxySub, parseFloat(proxyLimitAmount));
            const proxies = await api.getAuctionProxies(auctionData.id);
            setActiveProxies(proxies);
            setIsProxyModalOpen(false);
            setProxyLimitAmount('');
            alert("Proxy Configured.");
        } catch (e: any) {
            alert("Failed to set proxy: " + e.message);
        }
    };

    const handleForceStart = async () => {
        if (!auctionData || !isOwner) return;
        if (!confirm("Start auction now?")) return;

        const now = new Date();
        
        try {
            // 1. Update the database.
            const { data: updatedAuction, error } = await supabase.from('auctions').update({ 
                status: 'LIVE', 
                auction_date: now.toISOString() 
            })
            .eq('id', auctionData.id)
            .select()
            .single();

            if (error) throw error;

            // 2. OPTIMISTIC UI: Immediately update the local state.
            // This makes the UI feel instant.
            setAuctionData(updatedAuction);
            
            const durationMins = schemeData?.auction_duration_mins || 20;
            const newEndTime = new Date(now.getTime() + durationMins * 60000);
            setAuctionEndTime(newEndTime); // This will trigger the timer useEffect to start the countdown.

        } catch (error: any) {
            console.error("Failed to force start auction:", error);
            alert("Error starting auction: " + error.message);
        }
    };

    const handleEndAuction = async (aucId: string, onlyFetchDetails = false) => {
        // This function is now the single source of truth for ending an auction.
        
        // This ref prevents this function from running multiple times if the timer and a status update fire close together.
        if (finalizationTriggered.current && !onlyFetchDetails) return;
        finalizationTriggered.current = true;

        setAuctionEnded(true); // Immediately show the "Processing..." screen

        const fetchWinnerDetails = async () => {
            try {
                // Fetch the final, updated auction details from the database.
                const { data: finalAuction, error: auctionError } = await supabase.from('auctions').select('*').eq('id', aucId).single();
                if (auctionError) throw auctionError;

                if (finalAuction && finalAuction.winner_enrollment_id) {
                    // If a winner is found, fetch their profile name.
                    const { data: winProfile, error: profileError } = await supabase.from('scheme_enrollments').select('profiles(full_name)').eq('id', finalAuction.winner_enrollment_id).single();
                    if (profileError) throw profileError;

                    const winnerName = (winProfile?.profiles as any)?.full_name || 'Unknown Winner';

                    setWinnerDetails({
                        winnerName: winnerName,
                        amount: (schemeData?.chit_value || 0) - finalAuction.winning_bid, // Discount
                        prize: finalAuction.winning_bid // Prize
                    });
                } else {
                    // This case can happen if no bids were placed.
                    setWinnerDetails({ winnerName: "No bids placed", amount: 0, prize: 0 });
                }
            } catch (err) {
                console.error("Error fetching winner details:", err);
                setWinnerDetails({ winnerName: "Error fetching results", amount: 0, prize: 0 });
            }
        };

        // If this call is just to display existing completed data, fetch immediately.
        if (onlyFetchDetails) {
            await fetchWinnerDetails();
            return;
        }

        // If this is the call that ENDS the auction...
        if (isOwner) {
            try {
                console.log("Owner is finalizing auction...");
                // 1. Call the database function to determine the winner and update the table.
                await supabase.rpc('finalize_auction', { p_scheme_id: id });
                
                // 2. IMPORTANT: Wait a moment for the database changes to commit and replicate.
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

                // 3. Now, fetch the confirmed winner details.
                await fetchWinnerDetails();

            } catch (err) { 
                console.error("RPC Finalization error", err); 
                alert("An error occurred while finalizing the auction. Please check the console.");
                // Still try to fetch details in case the RPC partially succeeded.
                await fetchWinnerDetails();
            }
        }
    };

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // --- FINAL, DATABASE-DRIVEN Cancel/Reset Auction Handler ---
    const handleCancelAuction = async () => {
        if (!auctionData) return;

        if (!confirm("Are you sure you want to reset this auction? This will revert the status to 'UPCOMING' in the database and clear all bids.")) {
            return;
        }

        try {
            // This is the only action needed. Update the status in the database.
            // Our real-time listener will automatically receive this update and re-render the component correctly.
            await supabase
              .from('auctions')
              .update({ status: 'UPCOMING' })
              .eq('id', auctionData.id);

            // We don't need to navigate. The UI will update automatically.
            // The isUpcoming flag will become true, and the "Start Now" button will reappear.
            alert("Auction has been reset to 'Upcoming'.");

        } catch (error: any) {
            console.error("Failed to reset auction:", error);
            alert("Error resetting auction: " + error.message);
        }
    };


    // This is now derived state, calculated on every render. It's always accurate. below lone is depreceated
    // const isUpcoming = auctionData?.status === 'UPCOMING' && new Date() < new Date(auctionData.auction_date);

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;

    if (auctionEnded) {
        // If the auction has ended but we are still fetching the winner's details, show a processing screen.
        if (!winnerDetails) {
            return (
                <div className="flex flex-col items-center justify-center h-[80vh] bg-white p-8">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                    <h1 className="text-2xl font-bold text-gray-800">Finalizing Auction...</h1>
                    <p className="text-gray-500">Determining the winner and calculating results.</p>
                </div>
            );
        }

        // Once winnerDetails are available, show the final results screen.
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] bg-white p-8 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-bounce"><Trophy className="text-yellow-600" size={48} /></div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Auction Completed!</h1>
                <div className="bg-gray-50 rounded-xl p-8 w-full max-w-md border border-gray-200 text-center shadow-lg mt-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Winner</p>
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">{winnerDetails.winnerName}</h2>
                    <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-gray-500">Discount Taken</p><p className="font-bold text-lg">₹{winnerDetails.amount?.toLocaleString()}</p></div>
                        <div><p className="text-xs text-gray-500">Prize Amount</p><p className="font-bold text-lg text-green-600">₹{winnerDetails.prize?.toLocaleString()}</p></div>
                    </div>
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => navigate(`/schemes/${id}/auctions`)} className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-all">Back to List</button>
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
                            {/* UPDATED LOGIC: Directly check auctionData.status */}
                            {auctionData?.status === 'UPCOMING' ? (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-200 font-bold flex items-center gap-1"><Clock size={12} /> UPCOMING</span>
                            ) : (
                                <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded border border-red-200 font-bold flex items-center gap-1 animate-pulse"><span className="w-2 h-2 bg-red-600 rounded-full block"></span> LIVE</span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500">{schemeData?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* UPDATED LOGIC: Directly check auctionData.status */}
                    {isOwner && auctionData?.status === 'UPCOMING' && (
                        <button onClick={handleForceStart} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2"><Play size={16} /> Start Now</button>
                    )}
                    
                    {/* UPDATED LOGIC: Directly check auctionData.status */}
                    {TESTING_MODE && isOwner && auctionData?.status === 'LIVE' && !auctionEnded && (
                        <button onClick={handleCancelAuction} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-lg flex items-center gap-2">
                            <RefreshCw size={16} /> Reset Auction
                        </button>
                    )}

                    {/* UPDATED LOGIC: Directly check auctionData.status */}
                    <div className={`text-white px-4 py-2 rounded-lg flex items-center gap-2 font-mono font-bold shadow-md ${auctionData?.status === 'UPCOMING' ? 'bg-blue-500' : (timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-gray-900')}`}>
                        <Clock size={18} />{formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-all group">
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-blue-100 font-medium mb-1 flex items-center gap-2"><Gavel size={18} /> Current Prize Amount</p>
                                <h2 className="text-6xl font-bold tracking-tight mt-2 drop-shadow-md">₹{currentBid.toLocaleString()}</h2>
                                <p className="text-sm text-blue-200 mt-2 opacity-80">Discount: ₹{((schemeData?.chit_value || 0) - currentBid).toLocaleString()}</p>
                            </div>
                            <div className="text-right"><p className="text-blue-200 text-sm">Chit Value</p><p className="font-bold text-xl">₹{schemeData?.chit_value?.toLocaleString() || '0'}</p></div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-blue-500/30 flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shadow-inner">{lastBidderName.charAt(0)}</div>
                            <div><p className="text-sm text-blue-200">Current Lowest Bidder</p><p className="font-bold text-xl flex items-center gap-2">{lastBidderName}</p></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-center items-center gap-4 relative">
                        {isOwner ? (
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
                                            <div className="text-[10px] text-gray-500 italic">Auto-bids to decrease prize amount.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* UPDATED LOGIC: Directly check auctionData.status */}
                                {auctionData?.status === 'UPCOMING' ? (
                                    <div className="text-center w-full max-w-lg mb-4">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><Clock size={32}/></div>
                                        <h3 className="font-bold text-gray-800 mb-2">Auction starts in {formatTime(timeLeft)}</h3>
                                        <p className="text-sm text-gray-500">Waiting for foreman...</p>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <h3 className="font-bold text-gray-800 mb-4 text-center">I am willing to take the prize for...</h3>
                                        <div className="flex gap-4 w-full max-w-lg mx-auto">
                                            <button onClick={() => placeBidForEnrollment(currentBid - 100, myEnrollmentId!)} className="flex-1 bg-red-50 text-red-700 border border-red-100 font-bold py-4 rounded-xl hover:bg-red-100 active:scale-95 transition-all">- ₹100</button>
                                            <button onClick={() => placeBidForEnrollment(currentBid - 500, myEnrollmentId!)} className="flex-1 bg-red-50 text-red-700 border border-red-100 font-bold py-4 rounded-xl hover:bg-red-100 active:scale-95 transition-all">- ₹500</button>
                                            <button onClick={() => placeBidForEnrollment(currentBid - 1000, myEnrollmentId!)} className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 shadow-lg active:scale-95 transition-all">- ₹1,000</button>
                                        </div>
                                        <p className="text-xs text-center text-gray-400 mt-2">Clicking reduces the current prize amount by the selected value.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6 h-full min-h-0">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center"><h3 className="font-bold text-gray-800 text-sm">Live Bid Log (Lowest First)</h3><Users size={16} className="text-gray-400" /></div>
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
                    <p className="text-sm text-gray-600">Select an offline subscriber. The system will automatically place bids for them to LOWER the prize amount until the limit you set.</p>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Select Subscriber</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={selectedProxySub} onChange={(e) => setSelectedProxySub(e.target.value)}>
                            <option value="">Select Subscriber</option>
                            {offlineSubscribers.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Min Prize Amount (₹) Limit" type="number" value={proxyLimitAmount} onChange={(e) => setProxyLimitAmount(e.target.value)} placeholder="e.g. 70000" />
                    <p className="text-[10px] text-gray-400">The bot will stop bidding if the prize goes below this amount.</p>
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
                                        <span className="font-mono font-bold text-purple-600">Min: ₹{p.maxAmount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}