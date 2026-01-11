import React, { useState } from 'react';
import { UserPlus, Filter, Search, RotateCcw, MoreHorizontal, Phone, MessageSquare, Briefcase, MapPin, Plus, TrendingUp } from 'lucide-react';
import { Modal, Input, Button } from '../components/UI';

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  assignedTo: string;
  cibilScore?: number;
  lastContact: string;
}

const initialLeads: Lead[] = [
  { id: '1', name: 'Vikram Singh', phone: '+91 9876543210', source: 'Website', status: 'New', assignedTo: 'Ramesh', lastContact: '2 days ago' },
  { id: '2', name: 'Sarah Jenkins', phone: '+91 9000012345', source: 'Referral', status: 'Contacted', assignedTo: 'Priya', cibilScore: 780, lastContact: 'Yesterday' },
  { id: '3', name: 'Michael Chen', phone: '+91 9123456789', source: 'Walk-in', status: 'Qualified', assignedTo: 'Ramesh', cibilScore: 650, lastContact: 'Today' },
  { id: '4', name: 'Priya Sharma', phone: '+91 9988776655', source: 'Facebook', status: 'Lost', assignedTo: 'Unassigned', lastContact: '1 week ago' },
];

export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', source: 'Walk-in', assignedTo: 'Ramesh' });

  // CIBIL Check Simulation
  const [loadingCibil, setLoadingCibil] = useState<string | null>(null);

  const checkCibil = (id: string) => {
      setLoadingCibil(id);
      setTimeout(() => {
          setLeads(prev => prev.map(l => l.id === id ? { ...l, cibilScore: Math.floor(Math.random() * (850 - 600) + 600) } : l));
          setLoadingCibil(null);
      }, 1500);
  };

  const handleAddLead = () => {
      const newLead: Lead = {
          id: Date.now().toString(),
          name: newLeadForm.name,
          phone: newLeadForm.phone,
          source: newLeadForm.source,
          status: 'New',
          assignedTo: newLeadForm.assignedTo,
          lastContact: 'Just now'
      };
      setLeads([newLead, ...leads]);
      setIsModalOpen(false);
      setNewLeadForm({ name: '', phone: '', source: 'Walk-in', assignedTo: 'Ramesh' });
  };

  const filteredLeads = leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'All Status' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
  });

  const getScoreColor = (score?: number) => {
      if (!score) return 'text-gray-400';
      if (score >= 750) return 'text-green-600 bg-green-50 border-green-200';
      if (score >= 650) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
               <UserPlus size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Leads & Enquiries</h1>
         </div>
         <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
             <Plus size={18} /> Add New Lead
         </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Leads</p>
              <h3 className="text-2xl font-bold text-gray-900">{leads.length}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Qualified</p>
              <h3 className="text-2xl font-bold text-green-600">{leads.filter(l => l.status === 'Qualified' || l.status === 'Converted').length}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
              <h3 className="text-2xl font-bold text-blue-600">12.5%</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Pending Follow-ups</p>
              <h3 className="text-2xl font-bold text-orange-500">8</h3>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
           <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
           <input 
             type="text"
             placeholder="Search by name or phone..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
           />
        </div>

        <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-sm font-medium text-gray-700 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
            <option>All Status</option>
            <option>New</option>
            <option>Contacted</option>
            <option>Qualified</option>
            <option>Converted</option>
            <option>Lost</option>
        </select>

        <button 
            onClick={() => { setSearchTerm(''); setStatusFilter('All Status'); }}
            className="text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <th className="p-4 pl-6">Name</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Source</th>
              <th className="p-4">Assigned To</th>
              <th className="p-4">Status</th>
              <th className="p-4">CIBIL Score</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-4 pl-6 font-semibold text-gray-900">{lead.name}</td>
                <td className="p-4 font-mono text-xs text-gray-600">{lead.phone}</td>
                <td className="p-4 text-gray-600">{lead.source}</td>
                <td className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {lead.assignedTo.charAt(0)}
                        </div>
                        {lead.assignedTo}
                    </div>
                </td>
                <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-700' :
                        lead.status === 'Qualified' ? 'bg-purple-100 text-purple-700' :
                        lead.status === 'Converted' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {lead.status}
                    </span>
                </td>
                <td className="p-4">
                    {lead.cibilScore ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${getScoreColor(lead.cibilScore)}`}>
                            <TrendingUp size={12} />
                            <span className="font-bold">{lead.cibilScore}</span>
                        </div>
                    ) : (
                        <button 
                            onClick={() => checkCibil(lead.id)}
                            disabled={loadingCibil === lead.id}
                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                            {loadingCibil === lead.id ? 'Checking...' : 'Check Score'}
                        </button>
                    )}
                </td>
                <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Call">
                            <Phone size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Message">
                            <MessageSquare size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="More">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Lead">
          <div className="space-y-4">
              <Input 
                label="Full Name" 
                value={newLeadForm.name}
                onChange={(e) => setNewLeadForm({...newLeadForm, name: e.target.value})}
                placeholder="Enter lead name"
              />
              <Input 
                label="Phone Number" 
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                placeholder="+91"
              />
              <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <select 
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({...newLeadForm, source: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                      <option>Walk-in</option>
                      <option>Referral</option>
                      <option>Website</option>
                      <option>Social Media</option>
                  </select>
              </div>
              <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Assign Agent</label>
                  <select 
                    value={newLeadForm.assignedTo}
                    onChange={(e) => setNewLeadForm({...newLeadForm, assignedTo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                      <option>Ramesh</option>
                      <option>Priya</option>
                      <option>Suresh</option>
                      <option>Unassigned</option>
                  </select>
              </div>
              <div className="flex justify-end pt-4 gap-3">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddLead}>Add Lead</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};