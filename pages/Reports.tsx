import React, { useState } from 'react';
import { ClipboardList, Search, RotateCcw, Eye, Download, Filter } from 'lucide-react';

interface Report {
  id: string;
  month: string;
  name: string;
  schemeName: string;
  uploadedOn: string;
  category: 'OPERATIONAL' | 'FINANCIAL' | 'COMPLIANCE';
}

const mockReports: Report[] = [
  { id: '1', month: 'APR 2025', name: 'Collection_report', schemeName: 'Lakshmi Gold scheme', uploadedOn: '14 Feb 2019', category: 'OPERATIONAL' },
  { id: '2', month: 'APR 2025', name: 'Auction Summary', schemeName: 'Lakshmi Gold scheme', uploadedOn: '14 Feb 2019', category: 'OPERATIONAL' },
  { id: '3', month: 'APR 2025', name: 'Collection_report', schemeName: 'Overall Report', uploadedOn: '14 Feb 2019', category: 'OPERATIONAL' },
  { id: '4', month: 'APR 2025', name: 'P & L', schemeName: 'Lakshmi Silver scheme', uploadedOn: '14 Feb 2019', category: 'FINANCIAL' },
  { id: '5', month: 'APR 2025', name: 'Auction_Minutes_month1', schemeName: 'Lakshmi Silver scheme', uploadedOn: '14 Feb 2019', category: 'OPERATIONAL' },
  { id: '6', month: 'APR 2025', name: 'Pan_Alfred', schemeName: 'Lakshmi Silver scheme', uploadedOn: '14 Feb 2019', category: 'OPERATIONAL' },
];

export const Reports: React.FC = () => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Category');

  const filteredReports = mockReports.filter(report => {
        const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) || report.month.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'Category' || report.category === categoryFilter;
        return matchesSearch && matchesCategory;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('Category');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
         <ClipboardList className="text-gray-900" size={24} />
         <h1 className="text-2xl font-bold text-blue-500">Reports</h1>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200">
          <Filter size={20} className="text-gray-600" />
        </button>
        
        <div className="flex items-center gap-2 px-2">
           <span className="text-sm font-bold text-gray-700">Filter By</span>
        </div>

        <div className="relative flex-1 max-w-xs">
           <input 
             type="text"
             placeholder="Search by month, name"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
           />
           <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
        </div>

        <div className="relative">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-gray-300 text-sm font-medium text-gray-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px] appearance-none"
          >
            <option>Category</option>
            <option>OPERATIONAL</option>
            <option>FINANCIAL</option>
            <option>COMPLIANCE</option>
          </select>
          <div className="absolute right-3 top-3 pointer-events-none">
             <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </div>
        </div>

        <button 
            onClick={resetFilters}
            className="ml-auto text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
        >
          <RotateCcw size={16} /> Reset Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-6">MONTH</th>
              <th className="p-6">DOCUMENT NAME</th>
              <th className="p-6">SCHEME NAME</th>
              <th className="p-6">UPLOADED ON</th>
              <th className="p-6">CATEGORY</th>
              <th className="p-6 text-center">DOCUMENT</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-6 text-gray-500 font-medium uppercase">{report.month}</td>
                <td className="p-6 font-medium text-gray-900">{report.name}</td>
                <td className="p-6 text-gray-600">{report.schemeName}</td>
                <td className="p-6 text-gray-500">{report.uploadedOn}</td>
                <td className="p-6 uppercase text-gray-500">{report.category}</td>
                <td className="p-6">
                  <div className="flex items-center justify-center gap-4">
                    <button className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" title="View">
                      <Eye size={20} />
                    </button>
                    <button className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Download">
                      <Download size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};