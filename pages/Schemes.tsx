import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Plus, Filter, LayoutGrid, RotateCcw, ArrowRight, Upload, Calendar, CheckCircle, Clock, Loader2, AlertTriangle, Lock, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Scheme } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Schemes: React.FC = () => {
  //const { isReadOnly, user } = useAuth();
  const { user } = useAuth();
  const isReadOnly = false; 
  const [schemes, setSchemes] = useState<any[]>([]); // Use any to allow extended props locally
  const [isLoading, setIsLoading] = useState(true);
  
  // -- PERSISTENT STATE INITIALIZATION --
  const loadSavedState = () => {
      const saved = localStorage.getItem('scheme_wizard_draft');
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) {
              return null;
          }
      }
      return null;
  };

  const savedState = loadSavedState();

  const [isModalOpen, setIsModalOpen] = useState(savedState?.isModalOpen || false);
  const [step, setStep] = useState(savedState?.step || 1);
  const [schemeFilter, setSchemeFilter] = useState('All Schemes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const initialForm = {
      name: '', chitId: '', psoNumber: '', 
      chitValue: '', membersCount: '', 
      duration: '', monthlyDue: '', 
      commission: '', startDate: '',
      // Auction Rules
      auctionFreq: 'Monthly', 
      discountMin: '', discountMax: '', 
      gracePeriod: '', lateFee: '',
      securityType: '1-2 Guarantors', 
      defaultPeriod: '', 
      auctionDay: '', dueDay: '',
      auctionDuration: '20' // New field default
  };

  const [formData, setFormData] = useState(savedState?.formData || initialForm);

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
      psoOrder: null, chitAgreement: null, form1: null, form10: null, fdReceipt: null
  });

  // -- SAVE STATE ON CHANGE --
  useEffect(() => {
      if (isModalOpen) {
          localStorage.setItem('scheme_wizard_draft', JSON.stringify({
              isModalOpen,
              step,
              formData
          }));
      }
  }, [isModalOpen, step, formData]);

  const clearSavedState = () => {
      localStorage.removeItem('scheme_wizard_draft');
      setStep(1);
      setFormData(initialForm);
      setFiles({ psoOrder: null, chitAgreement: null, form1: null, form10: null, fdReceipt: null });
  };

  // --- HELPER FUNCTIONS FOR DATES ---
  
  const calculateEndDate = (startDate: string, durationMonths: number) => {
      if(!startDate || !durationMonths) return '-';
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(start.getMonth() + durationMonths);
      return end.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const calculateNextAuction = (auctionDay: number) => {
      if(!auctionDay) return '-';
      const today = new Date();
      const nextAuction = new Date();
      nextAuction.setDate(auctionDay);

      // If auction day for this month has passed, move to next month
      if (today.getDate() > auctionDay) {
          nextAuction.setMonth(nextAuction.getMonth() + 1);
      }
      return nextAuction.toLocaleDateString('en-GB');
  };

  // --- AUTO CALCULATIONS ---
  useEffect(() => {
      // 1. Duration = Members Count
      if (formData.membersCount) {
          setFormData((prev: any) => ({ ...prev, duration: prev.membersCount }));
      }

      // 2. Monthly Due = Chit Value / Members Count
      if (formData.chitValue && formData.membersCount) {
          const val = parseFloat(formData.chitValue);
          const mem = parseFloat(formData.membersCount);
          if (mem > 0) {
              const due = Math.ceil(val / mem); // Ceil to ensure total covers value
              setFormData((prev: any) => ({ ...prev, monthlyDue: due.toString() }));
          }
      }
  }, [formData.chitValue, formData.membersCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
      }
  };

  // Fetch Data
  useEffect(() => {
    if (user?.id) {
        fetchSchemes();
    }
  }, [user?.id]);

  const fetchSchemes = async () => {
      setIsLoading(true);
      try {
        const data = await api.getSchemes(user?.id);
        setSchemes(data);
      } catch (err) {
        console.error("Failed to fetch schemes", err);
      } finally {
        setIsLoading(false);
      }
  };

  const handleNext = () => {
      // VALIDATION LOGIC
      if (step === 1) {
          if (!formData.name || !formData.chitValue || !formData.membersCount || !formData.psoNumber) return alert("Please fill all required fields including PSO Number");
          
          // Foreman Commission Cap (7%)
          if (parseFloat(formData.commission) > 7) return alert("Foreman commission cannot exceed 7%");
          
          // Start Date Future Check
          const today = new Date();
          const start = new Date(formData.startDate);
          if (start <= today) return alert("Start date must be in the future");
      }

      if (step === 2) {
          // Discount Cap (40%) - Chit Funds Act 1982
          const chitVal = parseFloat(formData.chitValue);
          const maxAllowedDiscount = chitVal * 0.40;
          
          if (parseFloat(formData.discountMax) > maxAllowedDiscount) {
              return alert(`Maximum discount cannot exceed 40% of chit value (₹${maxAllowedDiscount})`);
          }
          
          if (parseFloat(formData.discountMin) > parseFloat(formData.discountMax)) {
              return alert("Minimum discount cannot be greater than maximum discount");
          }

          if(!formData.auctionDay || !formData.dueDay) return alert("Please specify auction and due days");
          if(parseInt(formData.auctionDay) > 31 || parseInt(formData.dueDay) > 31) return alert("Enter valid day of month (1-31)");
          
          if(!formData.auctionDuration || parseInt(formData.auctionDuration) < 5) return alert("Auction duration must be at least 5 minutes");
      }

      setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        // 1. Create Scheme Record
        const newScheme = await api.createScheme(formData, user.id);
        
        // 2. Upload Docs
        const docPromises = Object.entries(files).map(async ([key, file]) => {
            if (file) {
                await api.uploadSchemeDoc(newScheme.id, user.id, file as File, key);
            }
        });
        
        await Promise.all(docPromises);

        // 3. Success
        clearSavedState(); // Clear draft on success
        setStep(4);
        setIsModalOpen(true); // Keep modal open to show success
        fetchSchemes(); 
    } catch (err) {
        console.error("Scheme creation failed", err);
        alert("Failed to create scheme. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      clearSavedState();
  }

  const resetFilters = () => {
    setSchemeFilter('All Schemes');
  };

  const handleNewScheme = () => {
    if (isReadOnly) {
        alert("Action Restricted: Your account is pending approval from the administrator. You cannot create new schemes yet.");
        return;
    }
    setIsModalOpen(true);
  };

  const filteredSchemes = schemes.filter(s => {
    if (schemeFilter === 'All Schemes') return true;
    if (schemeFilter === 'Pending') return s.status === 'PENDING_APPROVAL';
    if (schemeFilter === 'Approved') return s.status === 'APPROVED' || s.status === 'ACTIVE';
    return s.status === schemeFilter;
  });

  const getStepTitle = () => {
      switch(step) {
          case 1: return "Basic Scheme Details";
          case 2: return "Auction Settings & Rules";
          case 3: return "Document Upload";
          case 4: return "Success";
          default: return "";
      }
  };

  const renderWizardHeader = () => {
      if (step === 4) return "";
      return (
        <div className="flex items-center gap-3 w-full">
           <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
             {step.toString().padStart(2, '0')}
           </div>
           <h2 className="text-xl font-bold text-blue-500 whitespace-nowrap">{getStepTitle()}</h2>
           <div className="flex-1 h-0.5 bg-blue-300/30 rounded-full mt-1"></div>
        </div>
      );
  };

  const renderWizardStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8 py-2">
            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Chit Scheme Name</label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Chit ID (Custom)</label>
                <input name="chitId" value={formData.chitId} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">PSO Number</label>
                <input name="psoNumber" value={formData.psoNumber} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" placeholder="e.g. 484938943" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Total Chit Value (₹)</label>
                <input name="chitValue" type="number" value={formData.chitValue} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Total Members</label>
                <input name="membersCount" type="number" value={formData.membersCount} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide flex items-center gap-2">
                    Duration (Months) <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full lowercase font-bold flex items-center gap-1"><Calculator size={10} /> auto</span>
                </label>
                <input name="duration" type="number" value={formData.duration} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-lg p-3 text-gray-500 cursor-not-allowed" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide flex items-center gap-2">
                    Monthly Due (₹) <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full lowercase font-bold flex items-center gap-1"><Calculator size={10} /> auto</span>
                </label>
                <input name="monthlyDue" type="number" value={formData.monthlyDue} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-lg p-3 text-gray-500 cursor-not-allowed" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Foreman Commission (%)</label>
                <input name="commission" type="number" max="7" value={formData.commission} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" placeholder="Max 7%" />
                <p className="text-xs text-orange-500 mt-1 font-medium">Maximum allowed commission is 7%</p>
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Start Date</label>
                <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 transition-shadow hover:shadow-sm" />
                <p className="text-xs text-gray-400 mt-1">Must be a future date</p>
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <button onClick={handleNext} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full flex items-center font-bold text-sm transition-all transform hover:scale-105 shadow-lg">
                Next <div className="ml-3 bg-black rounded-full p-1"><ArrowRight size={14} className="text-white"/></div>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 py-2">
            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Discount Minimum (₹)</label>
                <input name="discountMin" type="number" value={formData.discountMin} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Discount Maximum (₹)</label>
                <input name="discountMax" type="number" value={formData.discountMax} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
                <p className="text-xs text-orange-500 mt-1 font-medium">Capped at 40% of Chit Value</p>
              </div>
              
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Security Requirement</label>
                <select name="securityType" value={formData.securityType} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800 bg-white">
                    <option>1-2 Guarantors</option>
                    <option>Security Document</option>
                    <option>No Security Required</option>
                </select>
              </div>

              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Default Status Period (Days)</label>
                <input name="defaultPeriod" type="number" value={formData.defaultPeriod} onChange={handleChange} placeholder="e.g. 90" className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
                <p className="text-xs text-gray-400 mt-1">Days after missed payment to mark as Default</p>
              </div>

              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Auction Day (of Month)</label>
                <input name="auctionDay" type="number" min="1" max="31" value={formData.auctionDay} onChange={handleChange} placeholder="e.g. 5" className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
                <p className="text-xs text-gray-400 mt-1">Which day of the month auction is held</p>
              </div>

              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Payment Due Day (of Month)</label>
                <input name="dueDay" type="number" min="1" max="31" value={formData.dueDay} onChange={handleChange} placeholder="e.g. 10" className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
                <p className="text-xs text-gray-400 mt-1">Last date to pay monthly due</p>
              </div>

              {/* NEW FIELD: Auction Duration */}
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Auction Duration (Minutes)</label>
                <input name="auctionDuration" type="number" min="5" value={formData.auctionDuration} onChange={handleChange} placeholder="e.g. 20" className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
                <p className="text-xs text-gray-400 mt-1">How long the live auction remains open</p>
              </div>

              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Late Fee (₹)</label>
                <input name="lateFee" type="number" value={formData.lateFee} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
              </div>
              
              <div className="col-span-1">
                <label className="text-sm font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Grace Period (Days)</label>
                <input name="gracePeriod" type="number" value={formData.gracePeriod} onChange={handleChange} className="w-full border border-gray-400 rounded-lg p-3 focus:outline-none focus:border-blue-500 text-gray-800" />
              </div>
            </div>

            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-gray-500 font-bold hover:text-gray-700">Back</button>
              <button onClick={handleNext} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full flex items-center font-bold text-sm transition-all transform hover:scale-105 shadow-lg">
                Next <div className="ml-3 bg-black rounded-full p-1"><ArrowRight size={14} className="text-white"/></div>
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8 py-2">
            <div className="grid grid-cols-2 gap-x-12 gap-y-10">
               {[
                 { label: 'PSO order', key: 'psoOrder' },
                 { label: 'Chit agreement', key: 'chitAgreement' },
                 { label: 'Form 1', key: 'form1' },
                 { label: 'Form 10', key: 'form10' },
                 { label: 'FD receipt', key: 'fdReceipt' }
               ].map((doc, idx) => (
                 <div key={idx} className="col-span-1">
                    <label className="text-sm font-semibold text-gray-500 mb-3 block uppercase tracking-wide">{doc.label}</label>
                    <div className="relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={handleFileChange(doc.key)} />
                        <div className={`border border-blue-300 rounded-lg p-3 flex items-center justify-between transition-colors ${files[doc.key] ? 'bg-green-50 border-green-300' : 'bg-blue-50/20 hover:bg-blue-50/50'}`}>
                           <span className={`text-xs font-medium ml-2 ${files[doc.key] ? 'text-green-600' : 'text-gray-500'}`}>
                               {files[doc.key] ? files[doc.key]?.name : "Upload doc here"}
                           </span>
                           <div className="text-blue-500 p-2 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors">
                             {files[doc.key] ? <CheckCircle size={18} className="text-green-600" /> : <Upload size={18} />}
                           </div>
                        </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="flex justify-between pt-8 mt-12">
              <button onClick={handleBack} className="text-gray-500 font-bold hover:text-gray-700">Back</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full flex items-center font-bold text-sm transition-all transform hover:scale-105 shadow-lg disabled:opacity-70">
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Application"} 
                {!isSubmitting && <div className="ml-3 bg-black rounded-full p-1"><ArrowRight size={14} className="text-white"/></div>}
              </button>
            </div>
          </div>
        );
      case 4:
          return (
             <div className="flex flex-col items-center justify-center py-16 px-4 animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-green-500 w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Scheme Created Successfully</h2>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 max-w-lg text-center">
                    <p className="text-gray-700 text-lg flex flex-col gap-2">
                        <span>Your scheme is currently <strong>PENDING APPROVAL</strong>.</span>
                        <span className="text-sm text-gray-500">It will not be visible to public subscribers until approved by the admin.</span>
                        <span className="flex items-center justify-center gap-2 font-medium text-blue-600 mt-2">
                           <Clock size={20} /> Review typically takes 24hrs
                        </span>
                    </p>
                </div>
                <button onClick={handleCloseModal} className="mt-8 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
                    Close
                </button>
             </div>
          );
      default: return null;
    }
  }

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      <div className="flex items-center gap-2 mb-6">
         <LayoutGrid className="text-blue-500" size={24} />
         <h1 className="text-2xl font-bold text-blue-500">My Schemes</h1>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 mb-8">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Filter size={20} className="text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-700">Filter By</span>
        <div className="relative">
          <select 
            value={schemeFilter}
            onChange={(e) => setSchemeFilter(e.target.value)}
            className="bg-gray-100 border-none text-sm font-medium text-gray-700 py-2 px-4 rounded-lg focus:ring-0 cursor-pointer min-w-[150px]"
          >
            <option>All Schemes</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved / Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <button 
          onClick={resetFilters}
          className="ml-auto text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
        >
          <RotateCcw size={16} /> Reset Filter
        </button>
      </div>

      {/* Scheme Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100">
                <div className="h-20 bg-gray-200"></div>
                <div className="p-6 space-y-4">
                   <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                   <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSchemes.length > 0 ? (
            filteredSchemes.map((scheme, idx) => (
                <div key={`${scheme.id}-${idx}`} className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border ${scheme.status === 'PENDING_APPROVAL' ? 'border-yellow-200' : 'border-gray-100'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                <div className={`p-6 text-white relative overflow-hidden ${scheme.status === 'PENDING_APPROVAL' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                    <h3 className="font-bold text-xl mb-1 relative z-10">{scheme.name}</h3>
                    <p className="font-bold text-2xl relative z-10">₹{scheme.chitValue.toLocaleString()}</p>
                    
                    <Badge 
                        variant={scheme.status === 'PENDING_APPROVAL' ? 'warning' : 'success'} 
                        className="absolute top-4 right-4 z-10 shadow-sm"
                    >
                        {scheme.status === 'PENDING_APPROVAL' ? 'Pending Approval' : scheme.status}
                    </Badge>
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-y-6 text-sm mb-8">
                    <div>
                        <p className="text-gray-500 text-xs mb-1">Duration</p>
                        <p className="font-semibold text-gray-900">{scheme.duration} months</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs mb-1">Monthly Due</p>
                        <p className="font-semibold text-gray-900">₹{scheme.monthlyDue.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs mb-1">Subscribers</p>
                        <p className="font-semibold text-gray-900">{scheme.subscribersCount} / {scheme.membersCount}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs mb-1">Auction</p>
                        <p className="font-semibold text-gray-900">{calculateNextAuction(scheme.auctionDay)}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Termination</p>
                        <p className="font-semibold text-gray-900">{calculateEndDate(scheme.startDate, scheme.duration)}</p>
                    </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        {scheme.status === 'PENDING_APPROVAL' && (
                            <div className="text-xs text-yellow-600 flex items-center gap-1">
                                <AlertTriangle size={12} /> Public view hidden
                            </div>
                        )}
                        <div className="flex justify-end flex-1">
                            {scheme.status === 'APPROVED' || scheme.status === 'ACTIVE' ? (
                                <Link to={`/schemes/${scheme.id}`}>
                                    <button className="border border-blue-500 text-blue-500 px-6 py-1.5 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors">
                                    Manage
                                    </button>
                                </Link>
                            ) : (
                                <button disabled className="border border-gray-300 text-gray-400 px-6 py-1.5 rounded-full text-sm font-medium cursor-not-allowed flex items-center gap-2">
                                    <Lock size={12} /> Locked
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            ))
          ) : (
              <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">No schemes found.</p>
              </div>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={handleNewScheme}
        className={`fixed bottom-8 right-8 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-transform hover:scale-105 ${isReadOnly ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        <Plus size={20} /> New Scheme
      </button>

      {/* Create Scheme Modal Wizard */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
            // Optional: Don't clear on simple close to persist draft
            // But if user clicks 'X' they might expect reset. 
            // Let's NOT clear here so persistence works as requested.
            // Only clear on explicit "Success" close or manual "Reset" button if added.
            setIsModalOpen(false);
        }} 
        title={renderWizardHeader()}
        maxWidth="max-w-6xl"
      >
        <div className="p-4">
          {renderWizardStep()}
        </div>
      </Modal>
    </div>
  );
};