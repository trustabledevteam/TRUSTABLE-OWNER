import React from 'react';
import { Card, Button } from '../components/UI';
import { LayoutDashboard, Download, Eye, Gavel, ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export const AuctionSummary: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Determine a default scheme ID for navigation purposes
  const schemeId = "1"; 

  const participants = [
    { id: '00001', name: 'Christine Brooks', date: '14 Feb 2019', bid: '₹25000', status: 'WINNER' },
    { id: '00002', name: 'Rosie Pearson', date: '14 Feb 2019', bid: '₹25000', status: 'PARTICIPATED' },
    { id: '00003', name: 'Darrell Caldwell', date: '14 Feb 2019', bid: '₹25000', status: 'PARTICIPATED' },
    { id: '00004', name: 'Gilbert Johnston', date: '14 Feb 2019', bid: '₹25000', status: 'PARTICIPATED' },
    { id: '00005', name: 'Alan Cain', date: '14 Feb 2019', bid: '₹25000', status: 'NOT PARTICIPATED' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-2">
         <button 
           onClick={() => navigate(-1)}
           className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group"
         >
            <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to previous screen
         </button>
         <div className="flex items-center gap-2">
            <div className="text-gray-500"><Gavel size={24} /></div>
            <h1 className="text-2xl font-bold text-gray-900">Auction Summary</h1>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
               <div>
                  <p className="text-xs text-gray-500 mb-1">Scheme Name</p>
                  <p className="font-semibold text-gray-900 text-sm">Gold Scheme</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Group ID</p>
                  <p className="font-semibold text-gray-900 text-sm">LD628E</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Chit Value</p>
                  <p className="font-semibold text-gray-900 text-sm">₹89,000</p>
               </div>
               <div className="md:col-span-1">
                  <p className="text-xs text-gray-500 mb-1">Subscribers Participated</p>
                  <p className="font-semibold text-gray-900 text-sm">21/12/2025</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Auction</p>
                  <p className="font-semibold text-gray-900 text-sm">01</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Auction Date</p>
                  <p className="font-semibold text-gray-900 text-sm">Aug 15, 2026</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Auction Month</p>
                  <p className="font-semibold text-gray-900 text-sm">Gold Scheme</p>
               </div>
            </div>
         </div>

         <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Winners Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
               <div>
                  <p className="text-xs text-gray-500 mb-1">Winner</p>
                  <p className="font-semibold text-gray-900 text-sm">Raj Kumar</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Prize Amount</p>
                  <p className="font-semibold text-gray-900 text-sm">₹80,000</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Discount</p>
                  <p className="font-semibold text-gray-900 text-sm">₹9,000</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Discount in %</p>
                  <p className="font-semibold text-gray-900 text-sm">₹9,000</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Foreman Commission</p>
                  <p className="font-semibold text-gray-900 text-sm">₹5,000</p>
               </div>
            </div>
         </div>

         <div className="mb-2">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Documents</h3>
            <div className="flex flex-wrap gap-4">
               <button className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 transition-colors">
                  Auction Summary <Download size={16} />
               </button>
               <button className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 transition-colors">
                  Auction Minutes <Download size={16} />
               </button>
            </div>
         </div>
      </div>

      <div>
         <h3 className="text-lg font-bold text-gray-900 mb-4">Over View</h3>
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                     <th className="p-4 pl-6">ID</th>
                     <th className="p-4">SUBSCRIBERS</th>
                     <th className="p-4">DATE</th>
                     <th className="p-4">BID</th>
                     <th className="p-4">STATUS</th>
                     <th className="p-4 text-center">ACTIONS</th>
                  </tr>
               </thead>
               <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                  {participants.map((p) => (
                     <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 pl-6 text-gray-500">{p.id}</td>
                        <td className="p-4 font-medium text-gray-900">{p.name}</td>
                        <td className="p-4 text-gray-500">{p.date}</td>
                        <td className="p-4 text-gray-500">{p.bid}</td>
                        <td className="p-4">
                           <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                             p.status === 'WINNER' ? 'bg-green-100 text-green-600' :
                             p.status === 'PARTICIPATED' ? 'bg-teal-50 text-teal-600' :
                             'bg-teal-50 text-teal-600'
                           }`}>
                             {p.status}
                           </span>
                        </td>
                        <td className="p-4 text-center">
                           <button 
                             onClick={() => navigate(`/schemes/${schemeId}/subscribers/${p.id}`)}
                             className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-full"
                           >
                              <Eye size={16} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};