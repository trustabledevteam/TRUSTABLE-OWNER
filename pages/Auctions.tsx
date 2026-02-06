import React, { useState, useEffect } from 'react';
import { Card, Badge, Modal, Button, Input } from '../components/UI';
import { Gavel, ChevronLeft, TrendingUp, FileText, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Auction } from '../types';

const AuctionStatCard = ({ label, value, trend }: { label: string, value: string, trend: string }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-green-500 flex items-center gap-1 mt-1"><TrendingUp size={12} /> {trend}</p>
    </div>
);

// --- CORRECTED COMPONENT DEFINITION ---
// Step 1: Define the props for the component using an interface.
interface UpcomingAuctionCardProps {
  auction: Auction;
  onEditClick: (auction: Auction) => void;
}

// Step 2: Use React.FC<PropsType> to correctly type the functional component.
// This tells TypeScript that it's a React component that can accept special props like 'key'.
const UpcomingAuctionCard: React.FC<UpcomingAuctionCardProps> = ({ auction, onEditClick }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                <div>
                    <h3 className="font-bold text-gray-900 text-xl">{auction.schemeName || 'Scheme Auction'}</h3>
                    <p className="text-sm text-gray-500">Scheme ID: {auction.schemeId?.substring(0,8).toUpperCase()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm border ${auction.status === 'LIVE' ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                    {auction.status === 'LIVE' ? 'LIVE NOW' : `Auction #${auction.auctionNumber}`}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-y-6 text-sm mb-8">
                <div><p className="text-gray-500 text-xs mb-1">Prize Pool (Chit Value)</p><p className="font-bold text-lg text-gray-800">₹{auction.prizePool?.toLocaleString() || '0'}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Scheduled Date</p><p className="font-bold text-lg text-gray-800">{auction.date}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Timing</p><p className="font-bold text-lg text-gray-800">{auction.time}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Eligible Members</p><p className="font-bold text-lg text-gray-800">{auction.eligibleParticipants || 'All members'}</p></div>
                <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-100"><p className="text-gray-500 text-xs mb-1 uppercase font-bold">Bidding Limits</p><p className="font-mono font-medium text-gray-700">Min: ₹{auction.minBid?.toLocaleString()} — Max: ₹{auction.maxBid?.toLocaleString()}</p></div>
            </div>
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onEditClick(auction)} disabled={auction.status === 'LIVE'}>Edit Details</Button>
                <Button onClick={() => navigate(`/schemes/${auction.schemeId}/auctions/live/watch`)} className={auction.status === 'LIVE' ? 'bg-red-600 hover:bg-red-700' : ''}>{auction.status === 'LIVE' ? 'Enter Live Room' : 'Enter Auction Room'}</Button>
            </div>
        </div>
    );
};

export const Auctions: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [editForm, setEditForm] = useState({ date: '', time: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user, id]);

  const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
          const auctionData = await api.getAuctions(user.id, id);
          setAuctions(auctionData);
      } catch (error) {
          console.error("Failed to load auctions:", error);
      } finally {
          setLoading(false);
      }
  };
  
  const handleOpenEditModal = (auction: Auction) => {
    setEditingAuction(auction);
    let dateForInput = '', timeForInput = '10:00';
    if (auction.rawDate && !isNaN(auction.rawDate.getTime())) {
        const d = auction.rawDate;
        dateForInput = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        timeForInput = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    setEditForm({ date: dateForInput, time: timeForInput });
    setIsEditModalOpen(true);
  };

  const handleUpdateAuction = async () => {
    if (!editingAuction) return;
    if (!editForm.date || !editForm.time) {
        alert("Please select both a date and time.");
        return;
    }
    setIsUpdating(true);
    try {
        await api.updateAuction(editingAuction.id, editingAuction.schemeId, { date: editForm.date, time: editForm.time });
        alert("Auction updated successfully!");
        setIsEditModalOpen(false);
        await loadData();
    } catch (e: any) {
        console.error("Failed to update auction", e);
        alert("Error: " + e.message);
    } finally {
        setIsUpdating(false); 
    }
  };

  const now = new Date();
  
  const upcomingAuctions = auctions.filter(a => {
      if (!a.rawDate) return false;
      const startTime = new Date(a.rawDate);
      const endTime = new Date(startTime.getTime() + (a.auctionDurationMins || 20) * 60000);
      return (a.status === 'UPCOMING' || a.status === 'LIVE') && now <= endTime;
  });

  const completedAuctions = auctions.flatMap(liveAuction => 
    (liveAuction.auction_history || []).map((history: any) => ({
        id: `${liveAuction.id}-${history.auction_number}`,
        auctionNumber: history.auction_number,
        date: new Date(history.auction_date).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}),
        winnerName: 'N/A',
        winningBidAmount: history.winning_bid,
        dividendAmount: history.dividend_amount,
        payoutStatus: 'PENDING',
        schemeName: liveAuction.schemeName,
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 bg-gray-50 -m-6 p-6 min-h-screen">
      {/* ... Header and Analytics ... */}
      <div className="flex items-center gap-3">
        {id && <button onClick={() => navigate(`/schemes/${id}`)} className="bg-white border border-gray-200 text-gray-600 p-2 rounded-full hover:bg-gray-50"><ChevronLeft size={20} /></button>}
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Gavel size={24} /></div>
        <h1 className="text-2xl font-bold text-gray-900">Auction Management</h1>
      </div>
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-blue-800">Auction Analytics</h2><span className="text-xs text-blue-600 font-bold bg-white px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100">View Report</span></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AuctionStatCard label="Monthly Collection" value="₹89,000" trend="8.5% Up" />
              <AuctionStatCard label="Overdue Amount" value="₹13,000" trend="8.5% Up" />
              <AuctionStatCard label="Defaulters" value="05" trend="8.5% Up" />
              <AuctionStatCard label="Upcoming Auctions" value={upcomingAuctions.length.toString()} trend="Scheduled" />
          </div>
      </div>
      <div className="flex space-x-8 border-b border-gray-200">
        <button onClick={() => setActiveTab('upcoming')} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Upcoming</button>
        <button onClick={() => setActiveTab('completed')} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Completed</button>
      </div>

      {activeTab === 'upcoming' && (
          <div className="space-y-6 max-w-3xl">
              {loading ? (
                  <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : upcomingAuctions.length > 0 ? (
                  upcomingAuctions.map(auction => (
                      <UpcomingAuctionCard 
                          key={auction.id} // This is for React, it will not cause an error now
                          auction={auction} 
                          onEditClick={handleOpenEditModal}
                      />
                  ))
              ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200 gap-4">
                      <div className="bg-gray-50 p-4 rounded-full"><AlertTriangle className="text-gray-400" size={32} /></div>
                      <p className="text-gray-500 font-medium">No upcoming auctions scheduled.</p>
                      <p className="text-xs text-gray-400 max-w-xs text-center">Auctions are scheduled automatically when a scheme becomes active.</p>
                  </div>
              )}
          </div>
      )}
      
      {activeTab === 'completed' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : completedAuctions.length > 0 ? (
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <tr><th className="p-4 pl-6">Auction No</th><th className="p-4">Scheme</th><th className="p-4">Date</th><th className="p-4">Winner</th><th className="p-4">Winning Bid</th><th className="p-4">Dividend / Member</th><th className="p-4">Payout Status</th><th className="p-4 text-center">Minutes</th></tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50">
                        {completedAuctions.map(auc => (
                            <tr key={auc.id} className="hover:bg-blue-50/30">
                                <td className="p-4 pl-6 font-mono font-medium text-gray-600">#{auc.auctionNumber}</td>
                                <td className="p-4 font-medium text-gray-800">{auc.schemeName}</td>
                                <td className="p-4 text-gray-900">{auc.date}</td>
                                <td className="p-4 font-bold text-blue-600">{auc.winnerName}</td>
                                <td className="p-4 text-gray-900">₹{auc.winningBidAmount?.toLocaleString() || 0}</td>
                                <td className="p-4 text-green-600 font-medium">+ ₹{auc.dividendAmount?.toLocaleString() || 0}</td>
                                <td className="p-4"><Badge variant={auc.payoutStatus === 'Paid' ? 'success' : 'warning'}>{auc.payoutStatus}</Badge></td>
                                <td className="p-4 text-center"><button className="text-gray-400 hover:text-blue-600 p-2"><FileText size={18} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
            <div className="p-12 text-center text-gray-400 bg-gray-50/50">No completed auctions yet.</div>
            )}
        </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Auction Details">
          <div className="space-y-5">
              <Input label="Scheme Name" value={editingAuction?.schemeName || ''} readOnly className="bg-gray-100 text-gray-500" />
              <Input label="Prize Pool (Chit Value)" value={`₹${editingAuction?.prizePool?.toLocaleString() || '0'}`} readOnly className="bg-gray-100 text-gray-500" />
              <div className="grid grid-cols-2 gap-4">
                  <Input label="Auction Date" type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                  <Input label="Start Time" type="time" value={editForm.time} onChange={(e) => setEditForm({...editForm, time: e.target.value})} />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="text-sm font-bold text-blue-800 block mb-3">Bidding Limits (Fixed)</label>
                <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-gray-500 mb-1 block">Minimum Bid (5%)</span><p className="font-mono font-bold text-gray-700 bg-white border border-blue-200 rounded p-2 text-sm">₹{((editingAuction?.prizePool || 0) * 0.05).toLocaleString()}</p></div>
                    <div><span className="text-xs text-gray-500 mb-1 block">Maximum Bid (40%)</span><p className="font-mono font-bold text-gray-700 bg-white border border-blue-200 rounded p-2 text-sm">₹{((editingAuction?.prizePool || 0) * 0.40).toLocaleString()}</p></div>
                </div>
              </div>
              <div className="flex justify-end pt-4 gap-3 border-t border-gray-100 mt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateAuction} isLoading={isUpdating}>Save Changes</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};