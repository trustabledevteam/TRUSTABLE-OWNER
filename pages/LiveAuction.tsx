
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gavel, Users, Clock, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

interface Bid {
    id: number;
    user: string;
    amount: number;
    time: string;
    isProxy?: boolean;
}

export const LiveAuction: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    
    const [socket, setSocket] = useState<Socket | null>(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [lastBidder, setLastBidder] = useState("Waiting...");
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes per round
    const [bids, setBids] = useState<Bid[]>([]);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [auctionEnded, setAuctionEnded] = useState(false);
    const [winnerDetails, setWinnerDetails] = useState<any>(null);

    // Connect to Websocket
    useEffect(() => {
        // In dev, assuming backend is on port 3000
        const newSocket = io('http://localhost:3000/auctions');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setConnectionStatus('Live');
            newSocket.emit('join_room', { auctionId: 'mock-1', userId: user?.id }); // Mock auction ID for demo
        });

        newSocket.on('init_state', (data: any) => {
            setCurrentBid(data.currentBid);
        });

        newSocket.on('bid_update', (data: any) => {
            setCurrentBid(data.amount);
            const bidderName = data.isProxy ? "Proxy Bot (Offline)" : (data.userId === user?.id ? "You" : "User " + data.enrollmentId?.substring(0,4));
            setLastBidder(bidderName);
            
            const newBid: Bid = {
                id: Date.now(),
                user: bidderName,
                amount: data.amount,
                time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isProxy: data.isProxy
            };
            setBids(prev => [newBid, ...prev]);
            
            // Reset timer on new bid to give others a chance (Soft Close)
            setTimeLeft(60); 
        });

        newSocket.on('auction_ended', (data: any) => {
            setAuctionEnded(true);
            setWinnerDetails(data);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [id, user]);

    // Timer countdown
    useEffect(() => {
        if(auctionEnded) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Trigger end if owner
                    // In real app, server handles time. This is client simulation backup.
                    if (socket) socket.emit('end_auction', { auctionId: 'mock-1' });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [socket, auctionEnded]);

    const placeBid = (amount: number) => {
        if (socket && amount > currentBid) {
            // Mock enrollment ID for now
            socket.emit('place_bid', { auctionId: 'mock-1', enrollmentId: 'enroll-' + user?.id, amount });
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (auctionEnded) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] bg-white p-8">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Trophy className="text-yellow-600" size={48} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Auction Completed!</h1>
                <p className="text-gray-500 mb-8">The winner has been declared.</p>
                
                <div className="bg-gray-50 rounded-xl p-8 w-full max-w-md border border-gray-200 text-center">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                        {winnerDetails?.type === 'LUCKY_DRAW' ? 'Lucky Draw Winner' : 'Highest Bidder'}
                    </p>
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">Subscriber {winnerDetails?.winnerId.substring(0,6)}</h2>
                    <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Discount Amount</p>
                            <p className="font-bold">₹{currentBid.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Prize Payout</p>
                            <p className="font-bold">₹{winnerDetails?.prizeAmount?.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-4">
                    <button onClick={() => navigate(`/schemes/${id}/auctions`)} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">
                        Back to Auctions
                    </button>
                    <button onClick={() => alert("Downloading minutes...")} className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50">
                        Download Minutes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(`/schemes/${id}/auctions`)}
                        className="bg-white border border-gray-200 text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            Auction Room
                            <span className="animate-pulse bg-red-100 text-red-600 text-xs px-2 py-1 rounded border border-red-200 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-600 rounded-full block"></span> {connectionStatus}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500">ID: {id}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                     <div className={`text-white px-4 py-2 rounded-lg flex items-center gap-2 font-mono font-bold transition-colors ${timeLeft < 10 ? 'bg-red-500 animate-pulse' : 'bg-black'}`}>
                        <Clock size={18} />
                        {formatTime(timeLeft)}
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Main Auction Display */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Current Bid Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden transition-all">
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                                    <Gavel size={18} /> Current Highest Bid (Discount)
                                </p>
                                <h2 className="text-6xl font-bold tracking-tight mt-2">₹{currentBid.toLocaleString()}</h2>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-blue-500/30 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                                {lastBidder.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm text-blue-200">Latest Bidder</p>
                                <p className="font-bold text-xl">{lastBidder}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bidding Controls */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-center items-center gap-4">
                        <h3 className="font-bold text-gray-800 mb-2">Place Your Bid (Discount Amount)</h3>
                        <div className="flex gap-4 w-full max-w-lg">
                            <button 
                                onClick={() => placeBid(currentBid + 100)}
                                className="flex-1 bg-blue-100 text-blue-700 font-bold py-4 rounded-xl hover:bg-blue-200 transition-colors"
                            >
                                + ₹100
                            </button>
                            <button 
                                onClick={() => placeBid(currentBid + 500)}
                                className="flex-1 bg-blue-100 text-blue-700 font-bold py-4 rounded-xl hover:bg-blue-200 transition-colors"
                            >
                                + ₹500
                            </button>
                            <button 
                                onClick={() => placeBid(currentBid + 1000)}
                                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                            >
                                + ₹1,000
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Bidding increases the discount you offer to the group.</p>
                    </div>
                </div>

                {/* Right Sidebar: Live Feed */}
                <div className="flex flex-col gap-6 h-full min-h-0">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-sm">Live Bid Log</h3>
                            <Users size={16} className="text-gray-400" />
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {bids.map((bid, index) => (
                                <div key={bid.id} className={`p-3 rounded-lg border flex justify-between items-center ${index === 0 ? 'bg-blue-50 border-blue-100 animate-in slide-in-from-top-2' : 'bg-white border-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-mono text-gray-400">{bid.time}</div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                {bid.user}
                                                {bid.isProxy && <span className="bg-purple-100 text-purple-600 text-[10px] px-1.5 py-0.5 rounded">PROXY</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-blue-600">₹{bid.amount.toLocaleString()}</div>
                                </div>
                            ))}
                            {bids.length === 0 && (
                                <div className="text-center p-8 text-gray-400 text-sm">
                                    No bids placed yet. <br/>
                                    <span className="text-xs">If timer ends, a Lucky Draw will occur.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
