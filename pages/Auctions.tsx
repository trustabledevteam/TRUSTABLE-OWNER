
import React, { useState, useEffect } from 'react';
import { Card, Badge, Modal, Button, Input } from '../components/UI';
import { Gavel, Calendar, Clock, FileText, ChevronLeft, Play, ShieldCheck, TrendingUp, UserX, UserCheck, Edit, CalendarIcon, TimerIcon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Auction } from '../types';

const AuctionStatCard = ({ label, value, trend }: { label: string, value: string, trend: string }) => (
    <div className="bg-white p-4 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> {trend}
        </p>
    </div>
);

export const Auctions: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Scheme ID
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [nextAuction, setNextAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', minBid: '', maxBid: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
      if(id) {
          loadData(id);
      }
  }, [id]);

  const loadData = async (schemeId: string) => {
      setLoading(true);
      try {
          const auctionData = await api.getAuctions(schemeId);
          setAuctions(auctionData);

          const upcoming = auctionData.filter(a => a.status !== 'Completed');
          const next = upcoming.length > 0 ? upcoming[0] : null;
          setNextAuction(next);
      } catch (error) {
          console.error("Failed to load auctions:", error);
      } finally {
          setLoading(false);
      }
  };
  
  const handleOpenEditModal = (auction: Auction) => {
    setEditingAuction(auction);
    // Format date for input type='date' (YYYY-MM-DD)
    const dateForInput = auction.rawDate ? auction.rawDate.toISOString().split('T')[0] : '';
    // Format time for input type='time' (HH:MM)
    const timeForInput = auction.time ? 
        new Date(`1970-01-01T${auction.time.replace(/ (AM|PM)/, ':00 $1')}`).toTimeString().substring(0,5) 
        : '15:00';

    setEditForm({
        date: dateForInput,
        time: timeForInput,
        minBid: auction.minBid?.toString() || '',
        maxBid: auction.maxBid?.toString() || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAuction = async () => {
    if (!editingAuction || !id) return;
    
    setIsUpdating(true);
    try {
        await api.updateAuction(editingAuction.id, id, {
            date: editForm.date,
            time: editForm.time,
            minBid: parseFloat(editForm.minBid),
            maxBid: parseFloat(editForm.maxBid)
        });
        alert("Auction updated successfully!");
        setIsEditModalOpen(false);
        await loadData(id);
    } catch (e: any) {
        console.error("Failed to update auction", e);
        alert("Error: " + e.message);
    } finally {
        setIsUpdating(false);
    }
  };

  const completedAuctions = auctions.filter(a => a.status === 'Completed');

  return (
    <div className="space-y-6 bg-gray-50 -m-6 p-6 min-h-screen">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Gavel size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Auction Management</h1>
      </div>

      {/* Analytics Section */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-blue-800">Auction Analytics</h2>
              <a href="#" className="text-xs text-blue-600 font-bold hover:underline">view more</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AuctionStatCard label="Monthly Collection" value="₹89,000" trend="8.5% Up" />
              <AuctionStatCard label="Overdue Amount" value="₹13,000" trend="8.5% Up" />
              <AuctionStatCard label="Defaulters" value="05" trend="8.5% Up" />
              <AuctionStatCard label="Upcoming Auctions" value="01" trend="in 5 days" />
          </div>
      </div>

      <div className="flex space-x-8 border-b border-gray-200">
        <button 
            onClick={() => setActiveTab('upcoming')}
            className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Upcoming
        </button>
        <button 
            onClick={() => setActiveTab('completed')}
            className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Completed
        </button>
      </div>

      {activeTab === 'upcoming' && (
          <div>
              {loading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
              ) : nextAuction ? (
                  <div key={nextAuction.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="font-bold text-gray-900 text-lg">{nextAuction.schemeName}</h3>
                              <p className="text-sm text-gray-500">Scheme ID: {nextAuction.schemeId.substring(0,8)}</p>
                          </div>
                          <span className="text-blue-600 font-bold">#{nextAuction.auctionNumber}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-4 text-sm mb-6">
                         <div><p className="text-gray-500 text-xs">Prize Pool</p><p className="font-semibold">₹{nextAuction.prizePool?.toLocaleString()}</p></div>
                         <div><p className="text-gray-500 text-xs">Date</p><p className="font-semibold">{nextAuction.date}</p></div>
                         <div><p className="text-gray-500 text-xs">Timing</p><p className="font-semibold">{nextAuction.time}</p></div>
                         <div><p className="text-gray-500 text-xs">Eligible participants</p><p className="font-semibold">{nextAuction.eligibleParticipants} members</p></div>
                         <div className="col-span-2"><p className="text-gray-500 text-xs">Bid limits</p><p className="font-semibold">₹{nextAuction.minBid?.toLocaleString()} - ₹{nextAuction.maxBid?.toLocaleString()}</p></div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => handleOpenEditModal(nextAuction)}>Edit</Button>
                        <Button onClick={() => navigate(`/schemes/${id}/auctions/live/watch`)}>Enter Room</Button>
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                      No upcoming auctions scheduled.
                  </div>
              )}
          </div>
      )}

      {activeTab === 'completed' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             {loading ? (
                 <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
             ) : completedAuctions.length > 0 ? (
                 <table className="w-full text-left">
                     <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                         <tr>
                             <th className="p-4 pl-6">Auction No</th>
                             <th className="p-4">Date</th>
                             <th className="p-4">Winner</th>
                             <th className="p-4">Winning Bid</th>
                             <th className="p-4">Dividend / Member</th>
                             <th className="p-4">Payout</th>
                             <th className="p-4 text-center">Minutes</th>
                         </tr>
                     </thead>
                     <tbody className="text-sm divide-y divide-gray-50">
                         {completedAuctions.map(auc => (
                             <tr key={auc.id} className="hover:bg-blue-50/30">
                                 <td className="p-4 pl-6 font-mono text-gray-600">#{auc.auctionNumber}</td>
                                 <td className="p-4 text-gray-900">{auc.date}</td>
                                 <td className="p-4 font-bold text-blue-600">{auc.winnerName || 'N/A'}</td>
                                 <td className="p-4 text-gray-900">₹{auc.winningBidAmount?.toLocaleString() || 0}</td>
                                 <td className="p-4 text-green-600 font-medium">+ ₹{auc.dividendAmount?.toLocaleString() || 0}</td>
                                 <td className="p-4">
                                     <Badge variant={auc.payoutStatus === 'Paid' ? 'success' : 'warning'}>{auc.payoutStatus || 'PENDING'}</Badge>
                                 </td>
                                 <td className="p-4 text-center">
                                     <button className="text-gray-500 hover:text-blue-600 p-2"><FileText size={18} /></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             ) : (
                <div className="p-8 text-center text-gray-400">No completed auctions yet.</div>
             )}
          </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={
          <div className="flex items-center gap-2">
            <ChevronLeft size={18} /> AUCTION
          </div>
      }>
          <div className="space-y-4">
              <Input label="Scheme Name" value={editingAuction?.schemeName || ''} readOnly className="bg-gray-100" />
              <Input label="Prize Pool" value={`₹${editingAuction?.prizePool?.toLocaleString() || ''}`} readOnly className="bg-gray-100" />
              <div className="grid grid-cols-2 gap-4">
                  <Input label="Date" type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                  <Input label="Time" type="time" value={editForm.time} onChange={(e) => setEditForm({...editForm, time: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Bid Limits (min - max)</label>
                <div className="grid grid-cols-2 gap-4">
                    <Input type="number" placeholder="Min Amount" value={editForm.minBid} onChange={(e) => setEditForm({...editForm, minBid: e.target.value})} />
                    <Input type="number" placeholder="Max Amount" value={editForm.maxBid} onChange={(e) => setEditForm({...editForm, maxBid: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end pt-4 gap-3">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateAuction} isLoading={isUpdating}>Confirm</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
