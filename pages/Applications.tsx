import React, { useState, useEffect } from 'react';
import { Package, Check, X, FileText, Eye, PenTool, ArrowRight, Download, CheckCircle, Loader2, ChevronLeft, RefreshCw, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from '../components/UI';
import { api } from '../services/api';
import { SchemeJoinRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { JoinRequestCard } from '../components/JoinRequestCard';

interface ESignDoc {
    id: string;
    docName: string;
    schemeName: string;
    subscriberName: string;
    subscriberId: string;
    status: 'owner_pending' | 'subscriber_pending';
    type?: 'transfer' | 'general';
}

// Mock E-Sign Docs (kept as placeholder until E-Sign module is fully backend-integrated)
const mockESignDocs: ESignDoc[] = [
    {
        id: '102',
        docName: 'Transfer Request',
        schemeName: 'Lakshmi Gold Scheme - D1452',
        subscriberName: 'Naga -> Arjuna',
        subscriberId: 'MEM008',
        status: 'owner_pending',
        type: 'transfer'
    }
];

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'esign'>('applications');
  
  // Real Data State
  const [applications, setApplications] = useState<SchemeJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [consentChecked, setConsentChecked] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  // Fetch Real Requests
  useEffect(() => {
    if (user?.id) {
      fetchApplications(user.id);
    } else if (!user) { // Only set loading to false if user is definitively not logged in.
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchApplications = async (userId: string) => {
      setIsLoading(true);
      try {
          const data = await api.getPendingRequests(userId);
          setApplications(data);
      } catch (error: any) {
          console.error("Failed to load applications:", error.message, error);
          alert("Failed to load applications: " + error.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAction = async (id: string, action: 'ACCEPT' | 'DENY') => {
      setProcessingId(id);
      try {
          await api.processRequest(id, action);
          // Optimistic update: remove from list immediately
          setApplications(prev => prev.filter(app => app.id !== id));
          alert(`Request ${action === 'ACCEPT' ? 'Accepted' : 'Denied'}`); 
      } catch (error: any) {
          console.error(`Error processing request:`, error);
          alert(`Failed to ${action.toLowerCase()} request: ` + error.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleViewProfile = (subscriberId: string) => {
    navigate(`/search/profile/${subscriberId}`); 
  };

  const handleSignDocument = (doc: ESignDoc) => {
      if (doc.type === 'transfer') {
          // Open Local Transfer Wizard
          setTransferStep(1);
          setConsentChecked(false);
          setOtpSent(false);
          setOtpValue('');
          setTransferModalOpen(true);
      } else {
          // Navigate to Collections page for standard payouts
          navigate('/collections', { 
              state: { 
                  openPayoutProcess: true, 
                  initialStep: 3, 
                  documentContext: doc 
              } 
          });
      }
  };

  const handleTransferNext = () => {
      if (transferStep === 3) {
          // Signing Logic
          if (!otpSent) {
              setOtpSent(true);
              alert("OTP Sent: 1234");
          } else {
              if (otpValue === '1234') {
                  setTransferStep(4);
              } else {
                  alert("Invalid OTP");
              }
          }
      } else {
          setTransferStep(prev => prev + 1);
      }
  };

  // ... (Keep existing renderTransferStep logic unchanged)
  const renderTransferStep = () => {
      switch(transferStep) {
          case 1: // Old Subscriber Details (Read Only)
              return (
                  <div className="space-y-8 p-4">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">01</div>
                          <h2 className="text-2xl font-bold text-blue-500">Subscriber Details</h2>
                          <div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Subscriber Name</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="Naga" readOnly />
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Subscriber ID</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="MEM008" readOnly />
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Scheme Name</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="Gold Scheme" readOnly />
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Payments made</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="12/20" readOnly />
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Pending Payments</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="₹0" readOnly />
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Current Status</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="Active" readOnly />
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-500 block mb-2">Reason for Transfer</label>
                              <input className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" value="Personal Reason" readOnly />
                          </div>
                      </div>
                  </div>
              );
          case 2: // New Subscriber Details (Read Only + Approve)
              return (
                  <div className="space-y-8 p-4">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">02</div>
                          <h2 className="text-2xl font-bold text-blue-500">New Subscriber Details</h2>
                          <div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                          <div className="col-span-1">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">Subscriber Name</label>
                              <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" value="Arjuna" readOnly />
                          </div>
                          <div className="col-span-1">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">Phone Number</label>
                              <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" value="+91 9876543210" readOnly />
                          </div>
                          <div className="col-span-1">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
                              <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" value="arjuna@example.com" readOnly />
                          </div>
                          <div className="col-span-1">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">KYC Verification</label>
                              <div className="w-full border border-green-200 bg-green-50 rounded-lg p-2.5 text-sm text-green-700 font-bold flex items-center gap-2">
                                  <CheckCircle size={16} /> YES
                              </div>
                          </div>
                          <div className="col-span-1">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">Aadhaar</label>
                              <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" value="XXXX-XXXX-1234" readOnly />
                          </div>
                          <div className="col-span-1">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">PAN</label>
                              <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" value="ABCDE1234F" readOnly />
                          </div>
                          <div className="col-span-2">
                              <label className="text-xs font-semibold text-gray-500 block mb-1">Address</label>
                              <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" value="No 12, Main Street, Chennai" readOnly />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          {['Aadhaar Card', 'Pan Card', 'Address Proof', 'Income Proof'].map((doc, idx) => (
                              <div key={idx}>
                                  <label className="text-xs font-semibold text-gray-500 block mb-2">{doc}</label>
                                  <button className="w-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg p-3 text-sm flex items-center justify-center gap-2 transition-colors">
                                      <Eye size={16} /> View Document
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case 3: // Signing
              return (
                  <div className="space-y-8 p-4">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">03</div>
                          <h2 className="text-2xl font-bold text-blue-500">Transfer Document</h2>
                          <div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                          <div className="bg-white p-10 shadow-sm mx-auto max-w-2xl text-gray-800">
                              <h3 className="text-center text-xl font-bold mb-6 uppercase border-b pb-4">Transfer Subscriber Form</h3>
                              <p className="text-sm mb-4"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                              <p className="text-sm mb-4"><strong>Subject:</strong> Application for Substitution of Defaulting/Transferring Subscriber in [Gold Scheme] - Ticket No. [05].</p>
                              <p className="text-sm mb-6">
                                  I, <strong>Arjuna</strong> (Transferee), son/daughter of [Father's Name], holding PAN [Number], Aadhaar [Number], hereby agree to accept the liabilities and benefits of the Chit held by <strong>Naga</strong> (Transferor).
                              </p>
                              
                              <div className="grid grid-cols-3 gap-6 mt-12 pt-6 border-t border-gray-100">
                                  <div className="text-center">
                                      <div className="h-16 flex items-end justify-center mb-2">
                                          <img src="https://via.placeholder.com/100x40/ccffcc/000000?text=Signed" alt="Signed" className="opacity-70" />
                                      </div>
                                      <p className="text-xs font-bold text-gray-600 border-t pt-2">Transferor Signature</p>
                                      <p className="text-[10px] text-green-600">Verified</p>
                                  </div>
                                  <div className="text-center">
                                      <div className="h-16 flex items-end justify-center mb-2">
                                          <img src="https://via.placeholder.com/100x40/ccffcc/000000?text=Signed" alt="Signed" className="opacity-70" />
                                      </div>
                                      <p className="text-xs font-bold text-gray-600 border-t pt-2">Transferee Signature</p>
                                      <p className="text-[10px] text-green-600">Verified</p>
                                  </div>
                                  <div className="text-center">
                                      <div className="h-16 flex items-end justify-center mb-2">
                                          {otpSent && otpValue === '1234' ? (
                                               <span className="font-bold text-lg text-green-600">Moni Roy</span>
                                          ) : (
                                              <span className="text-gray-300 italic">Pending</span>
                                          )}
                                      </div>
                                      <p className="text-xs font-bold text-gray-600 border-t pt-2">Foreman (Owner)</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 max-w-3xl mx-auto">
                        <input type="checkbox" id="consent" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                        <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">I, the Foreman, confirm the verification of all documents and hereby give my consent to use my Aadhaar for e-Signing to authorize this transfer.</label>
                      </div>

                      {otpSent && (
                        <div className="max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-4 mt-4">
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                <p className="text-sm text-gray-600 mb-3">One Time Password sent to your registered mobile number.</p>
                                <input type="text" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} className="w-40 text-center text-xl tracking-widest border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="----" maxLength={4} />
                            </div>
                        </div>
                      )}
                  </div>
              );
            case 4: // Success
              return (
                  <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                          <CheckCircle size={40} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Authorized!</h2>
                      <p className="text-gray-600">The transfer from Naga to Arjuna has been successfully authorized and recorded.</p>
                  </div>
              );
          default:
              return null;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="text-blue-500" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">Applications & Signatures</h1>
      </div>

      <div className="flex space-x-8 border-b border-gray-200">
        <button 
            onClick={() => setActiveTab('applications')}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'applications' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Join Requests 
            {applications.length > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{applications.length}</span>}
        </button>
        <button 
            onClick={() => setActiveTab('esign')}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'esign' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            E-Sign Documents
            {mockESignDocs.length > 0 && <span className="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{mockESignDocs.length}</span>}
        </button>
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-6 animate-in fade-in">
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : applications.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-gray-800">All Caught Up!</h3>
                    <p className="text-gray-500">No pending join requests.</p>
                </div>
            ) : (
                applications.map(req => (
                    <JoinRequestCard 
                        key={req.id} 
                        request={req} 
                        onAction={handleAction} 
                        onViewProfile={() => handleViewProfile(req.app_subscribers.id)} 
                        isProcessing={processingId === req.id}
                    />
                ))
            )}
        </div>
      )}
      
      {activeTab === 'esign' && (
        <div className="space-y-4 animate-in fade-in">
            {mockESignDocs.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-lg"><FileText size={20} /></div>
                        <div>
                            <h4 className="font-bold text-gray-800">{doc.docName}</h4>
                            <p className="text-xs text-gray-500">{doc.schemeName} | {doc.subscriberName}</p>
                        </div>
                    </div>
                    <Button onClick={() => handleSignDocument(doc)} className="flex items-center gap-2">
                        <PenTool size={16}/> E-Sign Now
                    </Button>
                </div>
            ))}
        </div>
      )}

      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Authorization" maxWidth="max-w-4xl">
          <div className="min-h-[60vh] flex flex-col">
              <div className="flex-1 py-4">
                  {renderTransferStep()}
              </div>
              <div className="flex justify-between items-center px-8 pt-4 border-t border-gray-100">
                  {transferStep < 4 ? (
                      <>
                          <Button variant="outline" onClick={() => setTransferModalOpen(false)}>Close</Button>
                          <div className="flex items-center gap-4">
                              {transferStep > 1 && <Button variant="secondary" onClick={() => setTransferStep(p => p - 1)}>Back</Button>}
                              <Button onClick={handleTransferNext} disabled={(transferStep === 3 && !consentChecked)}>
                                  {transferStep === 3 ? (otpSent ? "Authorize Transfer" : "Get OTP to Authorize") : "Next Step"} <ArrowRight size={16} className="ml-2"/>
                              </Button>
                          </div>
                      </>
                  ) : (
                      <Button onClick={() => setTransferModalOpen(false)} className="mx-auto">Close Window</Button>
                  )}
              </div>
          </div>
      </Modal>
    </div>
  );
};