
import React, { useState, useEffect } from 'react';
import { FileText, Search, RotateCcw, Eye, Download, Filter, ChevronLeft, BookOpen, FileSpreadsheet, ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

interface Document {
  id: string;
  subscriberUid: string;
  subscriberName: string;
  name: string;
  uploadedOn: string;
  size: string;
  category: string;
  filePath: string;
}

export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [activeTab, setActiveTab] = useState<'documents' | 'ledger'>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Category');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => {
      const fetchDocs = async () => {
          setLoading(true);
          const data = await api.getAllDocuments(id);
          setDocuments(data);
          setLoading(false);
      };
      fetchDocs();
  }, [id]);

  const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              doc.subscriberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              doc.subscriberUid.includes(searchTerm);
        const matchesCategory = categoryFilter === 'Category' || doc.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

  const pageTitle = id ? 'Scheme Documents' : 'Documents Management';

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('Category');
  };

  const handleDownload = async (doc: Document) => {
      try {
          setDownloadingId(doc.id);
          const blob = await api.downloadDocument(doc.filePath);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.name; 
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
      } catch (error: any) {
          console.error("Download failed:", error);
          // Show alert if it's a permission/RLS issue or file missing
          alert(`Failed to download: ${error.message || 'Check your permissions.'}`);
      } finally {
          setDownloadingId(null);
      }
  };

  const handlePreview = async (doc: Document) => {
      try {
          setPreviewingId(doc.id);
          const url = await api.getPreviewUrl(doc.filePath);
          // Open in new tab
          window.open(url, '_blank');
      } catch (error: any) {
          console.error("Preview failed:", error);
          alert(`Failed to preview: ${error.message || 'Check your permissions.'}`);
      } finally {
          setPreviewingId(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
         {id && (
           <button 
             onClick={() => navigate(`/schemes/${id}`)}
             className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group"
           >
              <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Scheme
           </button>
         )}
         <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                <FileText size={24} />
             </div>
             <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
         </div>
      </div>

      {/* Main Tabs */}
      <div className="flex space-x-8 border-b border-gray-200 mb-6">
        <button 
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'documents' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Scheme Documents
        </button>
        <button 
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'ledger' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Statutory Ledgers
        </button>
      </div>

      {/* DOCUMENT VIEW */}
      {activeTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
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
                    placeholder="Search by UID, name"
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
                    className="bg-white border border-gray-300 text-sm font-medium text-gray-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[200px] appearance-none"
                >
                    <option>Category</option>
                    <option>KYC</option>
                    <option>AGREEMENTS</option>
                    <option>SECURITY</option>
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
                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500"/></div>
                ) : (
                    <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/30">
                        <th className="p-6">SUBSCRIBER UID</th>
                        <th className="p-6">DOCUMENT NAME</th>
                        <th className="p-6">UPLOADED ON</th>
                        <th className="p-6">SIZE</th>
                        <th className="p-6">CATEGORY</th>
                        <th className="p-6 text-center">DOCUMENT</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                        {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-6 font-mono text-gray-600 font-bold text-xs">{doc.subscriberUid.substring(0, 8)}...</td>
                            <td className="p-6 font-medium text-gray-900 flex flex-col">
                                <span>{doc.name}</span>
                                <span className="text-xs text-gray-400 font-normal">{doc.subscriberName}</span>
                            </td>
                            <td className="p-6 text-gray-500">{doc.uploadedOn}</td>
                            <td className="p-6 text-gray-500">{doc.size}</td>
                            <td className="p-6">
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-gray-100 text-gray-600`}>
                                    {doc.category}
                                </span>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center justify-center gap-4">
                                <button 
                                    onClick={() => handlePreview(doc)}
                                    disabled={previewingId === doc.id}
                                    className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" 
                                    title="View"
                                >
                                    {previewingId === doc.id ? <Loader2 size={20} className="animate-spin" /> : <Eye size={20} />}
                                </button>
                                <button 
                                    onClick={() => handleDownload(doc)}
                                    disabled={downloadingId === doc.id}
                                    className={`text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors ${downloadingId === doc.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Download"
                                >
                                    {downloadingId === doc.id ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                                </button>
                                </div>
                            </td>
                            </tr>
                        ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-400">No documents found.</td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                )}
            </div>
          </div>
      )}

      {/* LEDGER VIEW (Placeholder for now) */}
      {activeTab === 'ledger' && (
          <div className="p-12 text-center border border-dashed border-gray-300 rounded-xl">
              <BookOpen className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500">Statutory Ledgers Module</p>
          </div>
      )}
    </div>
  );
};
