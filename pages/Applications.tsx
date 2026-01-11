import React, { useState } from 'react';
import { Package, Check, X, FileText, Eye, PenTool, ArrowRight, Upload, ChevronLeft, Fingerprint, Download, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/UI';

interface Application {
  id: string;
  name: string;
  role: string;
  location: string;
  schemeName: string;
  schemeId: string;
  avatarUrl: string;
}

interface ESignDoc {
    id: string;
    docName: string;
    schemeName: string;
    subscriberName: string;
    subscriberId: string;
    status: 'owner_pending' | 'subscriber_pending';
    type?: 'transfer' | 'general';
}

const mockApplications: Application[] = [
  { 
    id: '1', 
    name: 'John silver', 
    role: 'Software developer', 
    location: 'Chennai',
    schemeName: 'Lakshmi Gold Scheme - D1452',
    schemeId: 'D1452',
    avatarUrl: 'https://picsum.photos/seed/john/100/100'
  },
  { 
    id: '2', 
    name: 'Peter parker', 
    role: 'Software developer', 
    location: 'Chennai',
    schemeName: 'Lakshmi Gold Scheme - D1452',
    schemeId: 'D1452',
    avatarUrl: 'https://picsum.photos/seed/peter/100/100'
  }
];

const mockESignDocs: ESignDoc[] = [
    {
        id: '101',
        docName: 'Chit Agreement',
        schemeName: 'Lakshmi Gold Scheme - D1452',
        subscriberName: 'John Silver',
        subscriberId: 'MEM005',
        status: 'owner_pending',
        type: 'general'
    },
    {
        id: '102',
        docName: 'Transfer Request',
        schemeName: 'Lakshmi Gold Scheme - D1452',
        subscriberName: 'Naga -> Arjuna',
        subscriberId: 'MEM008',
        status: 'owner_pending',
        type: 'transfer'
    },
    {
        id: '103',
        docName: 'Form 1',
        schemeName: 'Lakshmi Gold Scheme - D1452',
        subscriberName: 'Peter Parker',
        subscriberId: 'MEM008',
        status: 'subscriber_pending',
        type: 'general'
    }
];

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'applications' | 'esign'>('applications');
  
  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [consentChecked, setConsentChecked] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  const handleViewProfile = (appId: string) => {
    navigate(`/search/profile/${appId}`); 
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
                                               <span className="text-green-600 font-script text-lg">Moni Roy</span>
                                          ) : (
                                              <span className="text-gray-300 italic">Pending</span>
                                          )}
                                      </div>
                                      <p className="text-xs font-bold text-gray-600 border-t pt-2">Foreman (Owner)</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 max-w-2xl mx-auto">
                          <input 
                              type="checkbox" 
                              id="consent"
                              checked={consentChecked}
                              onChange={(e) => setConsentChecked(e.target.checked)}
                              className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
                              I hereby give my consent to use my Aadhaar Number / Virtual ID for e-KYC and e-Sign purposes to authorize this transfer.
                          </label>
                      </div>

                      {otpSent && (
                          <div className="max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-2">
                              <label className="text-xs text-gray-500 mb-1 block text-center">Enter OTP</label>
                              <input 
                                  type="text" 
                                  value={otpValue}
                                  onChange={(e) => setOtpValue(e.target.value)}
                                  className="w-full text-center tracking-widest border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="----"
                                  maxLength={4}
                              />
                          </div>
                      )}
                  </div>
              );
          case 4: // Summary
              return (
                  <div className="space-y-8 p-4 flex flex-col items-center">
                      <div className="w-full flex items-center gap-3 mb-6">
                          <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">04</div>
                          <h2 className="text-2xl font-bold text-blue-500">Transfer Summary</h2>
                          <div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div>
                      </div>

                      <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                          <h3 className="font-bold text-lg mb-6">Transfer Details</h3>
                          <div className="grid grid-cols-4 gap-6 text-sm">
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Scheme Name</p>
                                  <p className="font-semibold text-gray-900">Gold Scheme</p>
                              </div>
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Transferor</p>
                                  <p className="font-semibold text-gray-900">Naga</p>
                              </div>
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Transferee</p>
                                  <p className="font-semibold text-gray-900">Arjuna</p>
                              </div>
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Transfer Date</p>
                                  <p className="font-semibold text-gray-900">21/12/2025</p>
                              </div>
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Status</p>
                                  <p className="font-semibold text-gray-900">8/20</p>
                              </div>
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Reason</p>
                                  <p className="font-semibold text-gray-900">Personal Reasons</p>
                              </div>
                              <div>
                                  <p className="text-gray-500 text-xs mb-1">Effective From</p>
                                  <p className="font-semibold text-gray-900">Aug 15, 2026</p>
                              </div>
                          </div>
                          
                          <div className="mt-8 flex justify-end">
                              <button className="flex items-center gap-2 border border-blue-500 text-blue-500 px-4 py-2 rounded-full hover:bg-blue-50 transition-colors font-medium text-sm">
                                  <Download size={16} /> Download Document
                              </button>
                          </div>
                      </div>
                  </div>
              );
          default: return null;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
         <Package className="text-gray-900" size={24} />
         <h1 className="text-2xl font-bold text-blue-500">Applications</h1>
      </div>

       {/* Tabs */}
       <div className="flex space-x-8 border-b border-gray-200 mb-6">
            <button 
              onClick={() => setActiveTab('applications')}
              className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'applications' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Applications
            </button>
            <button 
              onClick={() => setActiveTab('esign')}
              className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'esign' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              e-Sign Tracking
            </button>
       </div>

      <div className="space-y-4">
        {activeTab === 'applications' && (
            <>
                {mockApplications.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 w-full cursor-pointer" onClick={() => handleViewProfile(app.id)}>
                        <img 
                        src={app.avatarUrl} 
                        alt={app.name} 
                        className="w-16 h-16 rounded-full object-cover border border-gray-100"
                        />
                        <div>
                        <h3 className="text-lg font-bold text-gray-800">{app.name}</h3>
                        <p className="text-sm text-blue-400 mb-1">
                            {app.role} <span className="text-gray-400 font-normal">{app.location}</span>
                        </p>
                        <p className="text-sm font-medium text-gray-700">{app.schemeName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="flex flex-col items-center gap-1 group cursor-pointer">
                        <button className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-colors shadow-sm">
                            <Check size={20} strokeWidth={3} />
                        </button>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Accept</span>
                        </div>

                        <div className="flex flex-col items-center gap-1 group cursor-pointer">
                        <button className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white transition-colors shadow-sm">
                            <X size={20} strokeWidth={3} />
                        </button>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Deny</span>
                        </div>
                    </div>
                </div>
                ))}

                {mockApplications.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No pending applications</p>
                </div>
                )}
            </>
        )}

        {activeTab === 'esign' && (
            <>
                {mockESignDocs.map((doc) => (
                    <div key={doc.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-6 w-full">
                            <div className="flex items-center gap-3 w-1/3 border-r border-gray-100 pr-4">
                                <div className="p-3 bg-blue-50 rounded-lg text-blue-500">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{doc.docName}</h3>
                                    {doc.type === 'transfer' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">TRANSFER</span>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col w-2/3">
                                <span className="text-xs text-gray-500 font-medium mb-1">SCHEME</span>
                                <h4 className="font-bold text-gray-900 text-sm mb-2">{doc.schemeName}</h4>
                                <div className="flex items-center gap-2">
                                     <span className="text-xs text-gray-500">Subscriber:</span>
                                     <span className="text-sm font-medium text-blue-600">{doc.subscriberName}</span>
                                     <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{doc.subscriberId}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0 min-w-[150px] justify-end">
                             {doc.status === 'owner_pending' ? (
                                 <button 
                                    onClick={() => handleSignDocument(doc)}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                                 >
                                     <PenTool size={16} /> Sign
                                 </button>
                             ) : (
                                 <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-bold text-orange-500 uppercase bg-orange-50 px-2 py-0.5 rounded">Waiting for Subscriber</span>
                                    <button className="text-blue-500 hover:text-blue-700 font-medium text-sm flex items-center gap-1 mt-1">
                                        <Eye size={16} /> View
                                    </button>
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
                
                {mockESignDocs.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No documents pending for signature</p>
                </div>
                )}
            </>
        )}
      </div>

      {/* Transfer Subscriber Wizard Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={transferStep === 4 ? "" : "Transfer Subscribers"}
        maxWidth="max-w-6xl"
      >
          {renderTransferStep()}

          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100 px-4">
              {transferStep === 4 ? (
                  <button 
                    onClick={() => setTransferModalOpen(false)}
                    className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
                  >
                      Back to Home <ArrowRight size={16} />
                  </button>
              ) : (
                  <>
                    <button 
                        onClick={() => setTransferStep(s => Math.max(1, s - 1))}
                        disabled={transferStep === 1}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-colors ${transferStep === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                        <ChevronLeft size={16} /> Previous Page
                    </button>

                    <button 
                        onClick={handleTransferNext}
                        disabled={transferStep === 3 && !consentChecked}
                        className={`flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-white transition-all shadow-lg hover:shadow-xl ${
                            transferStep === 3 && !consentChecked ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {transferStep === 2 ? 'Approve & Next' : transferStep === 3 ? (otpSent ? 'Sign & Continue' : 'Get OTP & Sign') : 'Next'} 
                        <div className="bg-black rounded-full p-0.5"><ArrowRight size={12} className="text-white"/></div>
                    </button>
                  </>
              )}
          </div>
      </Modal>
    </div>
  );
};