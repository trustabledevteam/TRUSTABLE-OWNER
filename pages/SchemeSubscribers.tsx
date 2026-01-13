
import React, { useState, useEffect, useRef } from 'react';
import { Filter, RotateCcw, Eye, Pencil, MessageSquare, MoreHorizontal, RefreshCw, UserPlus, Users, ChevronLeft, ArrowRight, Upload, CheckCircle, Search, Download, FileText, Smartphone, ShieldCheck, Lock, UserMinus, ArrowLeftRight, Trash2, Fingerprint, MapPin, Briefcase, User, FileCheck, Check, Loader2, X, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Modal, Input, Button } from '../components/UI';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Subscriber } from '../types';

export const SchemeSubscribers: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for File Inputs
  const photoFileRef = useRef<HTMLInputElement>(null);
  const panFileRef = useRef<HTMLInputElement>(null);
  const aadhaarFileRef = useRef<HTMLInputElement>(null);
  const bankFileRef = useRef<HTMLInputElement>(null);
  const addressFileRef = useRef<HTMLInputElement>(null);
  const agreementFileRef = useRef<HTMLInputElement>(null);
  const nomineeIdFileRef = useRef<HTMLInputElement>(null);

  // Offline Form State
  const [offlineForm, setOfflineForm] = useState<{
      name: string; phone: string; email: string; pan: string; aadhaar: string; gender: string; dob: string;
      permAddress1: string; permAddress2: string; permPincode: string; permCity: string; permState: string;
      sameAsPerm: boolean;
      presAddress1: string; presAddress2: string; presPincode: string; presCity: string; presState: string;
      empStatus: string; monthlyIncome: string; employer: string;
      bankName: string; accountNo: string; ifsc: string; accountType: string;
      hasNominee: boolean; nomName: string; nomDob: string; nomGender: string; nomRelation: string; 
      nomPhone: string; nomEmail: string; nomAadhaar: string; nomPan: string;
      nomAddressSame: boolean; nomAddress: string; nomineeIsMinor: boolean;
      guardianName: string; guardianRelation: string;
      photoDoc: File | null;
      panDoc: File | null;
      aadhaarDoc: File | null;
      addressProofDoc: File | null;
      bankDoc: File | null;
      agreementDoc: File | null;
      nomineeIdDoc: File | null;
      termsAgreed: boolean;
      kycAuth: boolean;
      privacyAgreed: boolean;
  }>({
      name: '', phone: '', email: '', pan: '', aadhaar: '', gender: 'Male', dob: '',
      permAddress1: '', permAddress2: '', permPincode: '', permCity: '', permState: '',
      sameAsPerm: true,
      presAddress1: '', presAddress2: '', presPincode: '', presCity: '', presState: '',
      empStatus: '', monthlyIncome: '', employer: '',
      bankName: '', accountNo: '', ifsc: '', accountType: 'Savings',
      hasNominee: true, nomName: '', nomDob: '', nomGender: 'Male', nomRelation: 'Spouse', 
      nomPhone: '', nomEmail: '', nomAadhaar: '', nomPan: '',
      nomAddressSame: true, nomAddress: '', nomineeIsMinor: false,
      guardianName: '', guardianRelation: 'Father',
      photoDoc: null, panDoc: null, aadhaarDoc: null, addressProofDoc: null, bankDoc: null, agreementDoc: null, nomineeIdDoc: null,
      termsAgreed: false, kycAuth: false, privacyAgreed: false
  });

  useEffect(() => {
    fetchSubscribers();
  }, [id]);

  const fetchSubscribers = async () => {
      setLoading(true);
      try {
        const data = await api.getSubscribers(id);
        setSubscribers(data);
      } catch (error) {
        console.error("Error fetching subscribers:", error);
      } finally {
        setLoading(false);
      }
  }

  const filteredSubscribers = subscribers.filter(sub => {
        const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

  const pageTitle = id ? 'Manage Subscribers' : 'All Subscribers';

  const handleAddSubscriber = () => {
      setOnboardStep(1);
      setIsAddModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
      if (e.target.files && e.target.files[0]) {
          setOfflineForm(prev => ({ ...prev, [field]: e.target.files![0] }));
      }
  };

  const handleOfflineNext = () => {
      if (onboardStep === 1) {
          if(!offlineForm.name || !offlineForm.phone) return alert("Name and Phone are required");
      }
      setOnboardStep(prev => prev + 1);
  };

  const handleOfflineSubmit = async () => {
      if(!user || !id) {
          alert("Error: Scheme context missing.");
          return;
      }
      if(!offlineForm.termsAgreed || !offlineForm.kycAuth || !offlineForm.privacyAgreed) {
          return alert("Please accept all declarations to proceed.");
      }

      setIsSubmitting(true);
      try {
          await api.onboardOfflineSubscriber(offlineForm, user.id, id);
          setIsAddModalOpen(false);
          await fetchSubscribers();
          alert("Subscriber added successfully!");
      } catch (err: any) {
          alert("Failed: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Render Functions (Keeping existing logic) ---
  const renderStepper = () => (
      <div className="flex items-center justify-between px-10 mb-8 relative">
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
          {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`flex flex-col items-center gap-2 bg-white px-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      onboardStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-300'
                  }`}>
                      {onboardStep > step ? <Check size={16} /> : step}
                  </div>
                  <span className={`text-xs font-medium ${onboardStep >= step ? 'text-purple-600' : 'text-gray-400'}`}>
                      {step === 1 ? 'Personal' : step === 2 ? 'Banking' : step === 3 ? 'Nominee' : 'Docs'}
                  </span>
              </div>
          ))}
      </div>
  );

  const renderOfflineStep = () => {
    switch (onboardStep) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <h4 className="font-bold text-gray-800 text-sm border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">1</span>
              Personal Details
            </h4>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Full Name *" placeholder="e.g. Lakshmi Devi" value={offlineForm.name} onChange={(e) => setOfflineForm({ ...offlineForm, name: e.target.value })} />
              <Input label="Phone Number *" placeholder="+91 98765 43210" value={offlineForm.phone} onChange={(e) => setOfflineForm({ ...offlineForm, phone: e.target.value })} />
              <Input label="Email (Optional)" placeholder="email@example.com" value={offlineForm.email} onChange={(e) => setOfflineForm({ ...offlineForm, email: e.target.value })} />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <Input label="PAN Number *" placeholder="ABCDE1234F" value={offlineForm.pan} onChange={(e) => setOfflineForm({ ...offlineForm, pan: e.target.value.toUpperCase() })} />
              <Input label="Aadhaar Number *" placeholder="1234 5678 9012" value={offlineForm.aadhaar} onChange={(e) => setOfflineForm({ ...offlineForm, aadhaar: e.target.value })} />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Gender</label>
                <select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" value={offlineForm.gender} onChange={(e) => setOfflineForm({ ...offlineForm, gender: e.target.value })} >
                  <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                </select>
              </div>
              <Input label="Date of Birth" type="date" value={offlineForm.dob} onChange={(e) => setOfflineForm({ ...offlineForm, dob: e.target.value })} />
            </div>

            <h5 className="font-medium text-gray-700 text-sm pt-2 border-t mt-4">Permanent Address *</h5>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Address Line 1 *" placeholder="House/Flat No, Building Name" value={offlineForm.permAddress1} onChange={(e) => setOfflineForm({ ...offlineForm, permAddress1: e.target.value })} />
              <Input label="Address Line 2" placeholder="Street, Landmark" value={offlineForm.permAddress2} onChange={(e) => setOfflineForm({ ...offlineForm, permAddress2: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="City *" placeholder="City" value={offlineForm.permCity} onChange={(e) => setOfflineForm({ ...offlineForm, permCity: e.target.value })} />
              <Input label="State *" placeholder="State" value={offlineForm.permState} onChange={(e) => setOfflineForm({ ...offlineForm, permState: e.target.value })} />
              <Input label="Pincode *" placeholder="6 digits" value={offlineForm.permPincode} onChange={(e) => setOfflineForm({ ...offlineForm, permPincode: e.target.value })} />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 pt-2">
              <input type="checkbox" checked={offlineForm.sameAsPerm} onChange={(e) => setOfflineForm({ ...offlineForm, sameAsPerm: e.target.checked, presAddress1: e.target.checked ? offlineForm.permAddress1 : '', presAddress2: e.target.checked ? offlineForm.permAddress2 : '', presCity: e.target.checked ? offlineForm.permCity : '', presState: e.target.checked ? offlineForm.permState : '', presPincode: e.target.checked ? offlineForm.permPincode : '', })} className="w-4 h-4 text-purple-600 rounded" />
              Present address same as permanent
            </label>

            {!offlineForm.sameAsPerm && (
              <>
                <h5 className="font-medium text-gray-700 text-sm pt-2">Present Address *</h5>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Address Line 1 *" value={offlineForm.presAddress1} onChange={(e) => setOfflineForm({ ...offlineForm, presAddress1: e.target.value })} />
                  <Input label="Address Line 2" value={offlineForm.presAddress2} onChange={(e) => setOfflineForm({ ...offlineForm, presAddress2: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="City *" value={offlineForm.presCity} onChange={(e) => setOfflineForm({ ...offlineForm, presCity: e.target.value })} />
                  <Input label="State *" value={offlineForm.presState} onChange={(e) => setOfflineForm({ ...offlineForm, presState: e.target.value })} />
                  <Input label="Pincode *" value={offlineForm.presPincode} onChange={(e) => setOfflineForm({ ...offlineForm, presPincode: e.target.value })} />
                </div>
              </>
            )}
          </div>
        );
      case 2: // Banking Details
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h4 className="font-bold text-gray-800 text-sm border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">2</span> Employment & Banking Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Employment Status</label><select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" value={offlineForm.empStatus} onChange={(e) => setOfflineForm({ ...offlineForm, empStatus: e.target.value })}><option value="">Select Status</option><option value="Salaried">Salaried</option><option value="Self-Employed">Self-Employed</option><option value="Business">Business Owner</option><option value="Retired">Retired</option></select></div>
              <Input label="Monthly Income (₹)" placeholder="e.g. 50000" value={offlineForm.monthlyIncome} onChange={(e) => setOfflineForm({ ...offlineForm, monthlyIncome: e.target.value })} />
            </div>
            {(offlineForm.empStatus === 'Salaried' || offlineForm.empStatus === 'Self-Employed') && <Input label="Employer / Business Name" value={offlineForm.employer} onChange={(e) => setOfflineForm({ ...offlineForm, employer: e.target.value })} />}
            <h5 className="font-medium text-gray-700 text-sm pt-2">Bank Account Details *</h5>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name *" placeholder="e.g. State Bank of India" value={offlineForm.bankName} onChange={(e) => setOfflineForm({ ...offlineForm, bankName: e.target.value })} />
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Account Type</label><select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" value={offlineForm.accountType} onChange={(e) => setOfflineForm({ ...offlineForm, accountType: e.target.value })}><option value="">Select Type</option><option value="Savings">Savings</option><option value="Current">Current</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Account Number *" placeholder="Enter account number" value={offlineForm.accountNo} onChange={(e) => setOfflineForm({ ...offlineForm, accountNo: e.target.value })} />
              <Input label="IFSC Code *" placeholder="e.g. SBIN0001234" value={offlineForm.ifsc} onChange={(e) => setOfflineForm({ ...offlineForm, ifsc: e.target.value.toUpperCase() })} />
            </div>
          </div>
        );
      case 3: // Nominee
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h4 className="font-bold text-gray-800 text-sm border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">3</span> Nominee Details
            </h4>
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={offlineForm.hasNominee} onChange={(e) => setOfflineForm({ ...offlineForm, hasNominee: e.target.checked })} className="w-4 h-4 text-purple-600 rounded" /> Add a nominee for this subscription</label>
            {offlineForm.hasNominee && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <Input label="Nominee Name *" placeholder="Full name" value={offlineForm.nomName} onChange={(e) => setOfflineForm({ ...offlineForm, nomName: e.target.value })} />
                  <Input label="Date of Birth" type="date" value={offlineForm.nomDob} onChange={(e) => setOfflineForm({ ...offlineForm, nomDob: e.target.value })} />
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">Gender</label><select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" value={offlineForm.nomGender} onChange={(e) => setOfflineForm({ ...offlineForm, nomGender: e.target.value })}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">Relationship *</label><select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" value={offlineForm.nomRelation} onChange={(e) => setOfflineForm({ ...offlineForm, nomRelation: e.target.value })}><option value="Spouse">Spouse</option><option value="Son">Son</option><option value="Daughter">Daughter</option><option value="Father">Father</option><option value="Mother">Mother</option></select></div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <Input label="Nominee Phone" value={offlineForm.nomPhone} onChange={(e) => setOfflineForm({ ...offlineForm, nomPhone: e.target.value })} />
                  <Input label="Nominee Email" value={offlineForm.nomEmail} onChange={(e) => setOfflineForm({ ...offlineForm, nomEmail: e.target.value })} />
                  <Input label="Nominee Aadhaar" value={offlineForm.nomAadhaar} onChange={(e) => setOfflineForm({ ...offlineForm, nomAadhaar: e.target.value })} />
                  <Input label="Nominee PAN" value={offlineForm.nomPan} onChange={(e) => setOfflineForm({ ...offlineForm, nomPan: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={offlineForm.nomAddressSame} onChange={(e) => setOfflineForm({ ...offlineForm, nomAddressSame: e.target.checked })} className="w-4 h-4 text-purple-600 rounded" /> Nominee address same as subscriber</label>
                {!offlineForm.nomAddressSame && <div><label className="text-sm font-medium text-gray-700 block mb-1">Nominee Address</label><textarea className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-16 resize-none" value={offlineForm.nomAddress} onChange={(e) => setOfflineForm({ ...offlineForm, nomAddress: e.target.value })} /></div>}
              </>
            )}
          </div>
        );
      case 4: // Documents
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h4 className="font-bold text-gray-800 text-sm border-b pb-2 flex items-center gap-2"><span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">4</span> Documents & Declarations</h4>
            {/* File Inputs Hidden */}
            <input type="file" ref={photoFileRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'photoDoc')} />
            <input type="file" ref={panFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'panDoc')} />
            <input type="file" ref={aadhaarFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'aadhaarDoc')} />
            <input type="file" ref={bankFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'bankDoc')} />
            <input type="file" ref={addressFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'addressProofDoc')} />
            <input type="file" ref={agreementFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'agreementDoc')} />
            <input type="file" ref={nomineeIdFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'nomineeIdDoc')} />

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Profile Photo *</p>
              <div onClick={() => photoFileRef.current?.click()} className={`border rounded-lg p-4 flex items-center gap-4 cursor-pointer transition-colors ${offlineForm.photoDoc ? 'border-green-300 bg-green-50' : 'border-gray-200 border-dashed hover:bg-gray-50'}`}>
                {offlineForm.photoDoc ? <><div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0"><img src={URL.createObjectURL(offlineForm.photoDoc)} className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-green-700 truncate">{offlineForm.photoDoc.name}</p><p className="text-xs text-green-600">Photo uploaded</p></div></> : <><div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><Upload size={20} className="text-gray-400" /></div><div><p className="text-sm font-medium text-gray-700">Upload Subscriber Photo</p></div></>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ ref: panFileRef, key: 'panDoc', label: 'Upload PAN Card *' }, { ref: aadhaarFileRef, key: 'aadhaarDoc', label: 'Upload Aadhaar Card *' }, { ref: bankFileRef, key: 'bankDoc', label: 'Upload Bank Proof *' }, { ref: addressFileRef, key: 'addressProofDoc', label: 'Address Proof' }].map((doc: any, idx) => (
                  <div key={idx} onClick={() => doc.ref.current?.click()} className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer ${ (offlineForm as any)[doc.key] ? 'border-green-300 bg-green-50' : 'border-gray-200 border-dashed hover:bg-gray-50'}`}>
                    {(offlineForm as any)[doc.key] ? <><CheckCircle size={18} className="text-green-600" /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-green-700 truncate">{(offlineForm as any)[doc.key].name}</p></div></> : <><Upload size={18} className="text-gray-400" /><div><p className="text-sm font-medium text-gray-700">{doc.label}</p></div></>}
                  </div>
              ))}
            </div>
            <div onClick={() => agreementFileRef.current?.click()} className={`border rounded-lg p-4 flex items-center gap-3 cursor-pointer ${offlineForm.agreementDoc ? 'border-green-300 bg-green-50' : 'border-gray-200 border-dashed hover:bg-gray-50'}`}>
              {offlineForm.agreementDoc ? <><CheckCircle size={20} className="text-green-600" /><p className="text-sm font-medium text-green-700 truncate">{offlineForm.agreementDoc.name}</p></> : <><FileText size={20} className="text-gray-400" /><p className="text-sm font-medium text-gray-700">Upload Signed Chit Agreement *</p></>}
            </div>
            <div className="space-y-3 pt-2">
              <h5 className="font-medium text-gray-700 text-sm">Declarations *</h5>
              <label className="flex items-start gap-2 text-sm text-gray-600 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={offlineForm.termsAgreed} onChange={(e) => setOfflineForm({ ...offlineForm, termsAgreed: e.target.checked })} className="w-4 h-4 text-purple-600 rounded mt-0.5" /><span>I have read and understood the Terms & Conditions</span></label>
              <label className="flex items-start gap-2 text-sm text-gray-600 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={offlineForm.kycAuth} onChange={(e) => setOfflineForm({ ...offlineForm, kycAuth: e.target.checked })} className="w-4 h-4 text-purple-600 rounded mt-0.5" /><span>I authorize the foreman to perform KYC verification</span></label>
              <label className="flex items-start gap-2 text-sm text-gray-600 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={offlineForm.privacyAgreed} onChange={(e) => setOfflineForm({ ...offlineForm, privacyAgreed: e.target.checked })} className="w-4 h-4 text-purple-600 rounded mt-0.5" /><span>I agree to the Chit Agreement & Privacy Policy</span></label>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
         {id && (
           <button onClick={() => navigate(`/schemes/${id}`)} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium group">
              <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Scheme
           </button>
         )}
         <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Users size={24} /></div>
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
             </div>
             <button onClick={handleAddSubscriber} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                <Plus size={18} /> Add Offline Subscriber
             </button>
         </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
           <input type="text" placeholder="Search by name, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Filter:</span>
            <select className="bg-gray-50 border border-gray-200 rounded-lg text-sm p-2 outline-none"><option>All Status</option><option>Active</option><option>Late</option><option>Default</option></select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500"/></div>
        ) : (
            <table className="w-full text-left">
            <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/30">
                <th className="p-4 pl-6">ID</th>
                <th className="p-4">NAME</th>
                <th className="p-4">JOINED</th>
                <th className="p-4">PAID / TOTAL</th>
                <th className="p-4">LAST PAYMENT</th>
                <th className="p-4">TYPE</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 text-center">ACTIONS</th>
                </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                {filteredSubscribers.length > 0 ? (
                filteredSubscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 pl-6 font-mono text-gray-500 text-xs">{sub.id.split('-')[0].toUpperCase()}</td>
                    <td className="p-4 font-medium text-gray-900 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{sub.name.charAt(0)}</div>{sub.name}</td>
                    <td className="p-4 text-gray-500">{sub.joinDate}</td>
                    <td className="p-4 font-medium">{sub.paymentsMade} <span className="text-gray-400">/ {sub.totalInstallments}</span></td>
                    <td className="p-4 text-gray-500">{sub.lastPaymentDate}</td>
                    <td className="p-4"><span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${sub.type === 'Online' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{sub.type}</span></td>
                    <td className="p-4"><Badge variant={sub.status === 'Active' ? 'success' : sub.status === 'Late' ? 'warning' : 'danger'}>{sub.status}</Badge></td>
                    <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={() => navigate(id ? `/schemes/${id}/subscribers/${sub.id}` : `/subscribers/${sub.id}`)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors" title="View Details"><Eye size={18} /></button>
                            <button className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors" title="Message"><MessageSquare size={18} /></button>
                        </div>
                    </td>
                    </tr>
                ))
                ) : (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No subscribers found.</td></tr>
                )}
            </tbody>
            </table>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Onboard Offline Subscriber" maxWidth="max-w-4xl">
          <div className="pt-2 pb-6">
              {renderStepper()}
              <div className="px-4 min-h-[400px]">{renderOfflineStep()}</div>
              <div className="flex justify-between items-center px-4 mt-8 pt-6 border-t border-gray-100">
                  <button onClick={() => setOnboardStep(s => Math.max(1, s - 1))} disabled={onboardStep === 1} className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${onboardStep === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>Back</button>
                  {onboardStep < 4 ? <button onClick={handleOfflineNext} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all transform hover:scale-105">Next <ArrowRight size={18} /></button> : <button onClick={handleOfflineSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-all transform hover:scale-105 disabled:opacity-70">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <>Complete Onboarding <CheckCircle size={18} /></>}</button>}
              </div>
          </div>
      </Modal>
    </div>
  );
};
