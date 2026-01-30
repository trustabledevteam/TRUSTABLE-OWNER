
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Filter, RotateCcw, Eye, MessageSquare, ChevronLeft, CheckCircle, Banknote, Printer, Lock, Fingerprint, Loader2, Edit, TrendingUp, User, FileText, Send, Check, Smartphone, ShieldCheck, Users, UserCheck, Upload, ArrowRight } from 'lucide-react';
import { Payout } from '../types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Types for Collection Logic
interface CollectionRow {
    id: string; // Enrollment ID
    subscriberName: string;
    subscriberPhone: string;
    dueDate: string; // Visual Due Date (Next upcoming)
    lastPaymentDate: string;
    paidVia: string;
    overdueDays: number;
    status: 'Active' | 'Late' | 'Default';
}

const StatCard = ({ label, value, trend }: { label: string, value: string, trend: string }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 mb-2">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-green-500 flex items-center gap-1 mt-2">
            <TrendingUp size={12} /> {trend}
        </p>
    </div>
);

// Fix: Correctly define LogoAnimation as a React Functional Component
const LogoAnimation: React.FC = () => {
    return (
        <div className="py-20 flex justify-center items-center">
            <div className="flex flex-col items-center justify-center text-center py-10">
                <CheckCircle size={64} className="text-green-500 animate-pulse mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Payout Processed!</h2>
                <p className="text-gray-500 mt-2">The transaction has been completed successfully.</p>
            </div>
        </div>
    );
}


export const Collections: React.FC = () => {
    const navigate = useNavigate();
    const { id: schemeId } = useParams(); // Scheme ID
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [collectionData, setCollectionData] = useState<CollectionRow[]>([]);
    const [pendingPayout, setPendingPayout] = useState<Payout | null>(null);
    const [fetchingPendingPayouts, setFetchingPendingPayouts] = useState(true); // New loading state for the pending payout card


    // --- NEW PAYOUT MODAL STATE ---
    const [payoutModalOpen, setPayoutModalOpen] = useState(false);
    const [payoutStep, setPayoutStep] = useState(1);
    // Fix: Standardize payoutMode to match Payout interface
    const [payoutMode, setPayoutMode] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [consentChecked, setConsentChecked] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [prizeFile, setPrizeFile] = useState<File | null>(null);
    const [guarantorFile, setGuarantorFile] = useState<File | null>(null);
    const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
    const [incomeUploading, setIncomeUploading] = useState(false);
    const [subscriberDocs, setSubscriberDocs] = useState<any[]>(['Aadhaar Card', 'Address Proof']); // Mock
    const [isFinalOtpModalOpen, setIsFinalOtpModalOpen] = useState(false);
    const [finalOtp, setFinalOtp] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [payoutContext, setPayoutContext] = useState<any>(null); // To store fetched context
    const [isSavingProgress, setIsSavingProgress] = useState(false); // New loading state for saving wizard progress
    const [isFinalizingPayout, setIsFinalizingPayout] = useState(false); // New loading state for finalizing payout


    const prizeFileRef = useRef<HTMLInputElement>(null);
    const guarantorFileRef = useRef<HTMLInputElement>(null);
    
    // Guarantor form data state - expanded to match SQL
    const [guarantorFormData, setGuarantorFormData] = useState({
        name: '', 
        phone: '', 
        email: '',
        income: '', 
        address: ''
    });

    const handleGuarantorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGuarantorFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- OLD FILTER STATE ---
    const [dateFilter, setDateFilter] = useState('Date');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('Payment Status');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('Payment Method');

    const pageTitle = 'Collection Tracking & Payout Management';

    // --- DATA FETCHING ---
    useEffect(() => {
        // We must wait for the user to be loaded before fetching anything.
        if (user) {
            loadInitialData();
        }
    }, [user, schemeId]); // Re-run if the user loads or the scheme ID changes.

    const loadInitialData = async () => {
        if (!user) return; // Safety check

        setLoading(true);
        setFetchingPendingPayouts(true);

        try {
            // Fetch payouts first, as they might be needed on both general and specific pages.
            const payouts = await api.getPendingPayouts(user.id, schemeId);
            setPendingPayout(payouts.length > 0 ? payouts[0] : null);

            // Only fetch detailed collection data if we are on a scheme-specific page.
            if (schemeId) {
                const enrollments = await api.getSchemeCollectionData(user.id, schemeId);
                // The processing logic for collection rows needs the raw enrollment data.
                // Since this logic is complex and tied to a single scheme, we will only run it here.
                processCollectionData(enrollments);
            } else {
                // On the general /collections page, there is no collection data to show.
                setCollectionData([]);
            }
        } catch (error) {
            console.error("Error fetching collections or payouts:", error);
            // On error, clear the data to prevent showing stale info.
            setCollectionData([]);
            setPendingPayout(null);
        } finally {
            // IMPORTANT: Ensure both loaders are always stopped.
            setLoading(false);
            setFetchingPendingPayouts(false);
        }
    };

    // This helper function contains your original processing logic.
    // It's called by loadInitialData only when needed.
    const processCollectionData = (enrollments: any[]) => {
        // This function would contain your original, complex mapping logic from fetchCollectionData
        // to turn the raw enrollment data into the `CollectionRow` format.
        // For brevity, we'll assume it works as before. If it still needs a single 'scheme' object,
        // you would fetch that separately inside `loadInitialData` when a `schemeId` is present.
        console.log("Processing collection data for display...", enrollments);
        // Set the processed data. If processing is complex, it would happen here.
        // For now, let's just clear it as a placeholder.
        setCollectionData([]); // Replace this with your actual mapping logic if needed.
    };

    const fetchPendingPayouts = async (currentSchemeId: string) => {
        setFetchingPendingPayouts(true);
        try {
            const payouts = await api.getPendingPayouts(currentSchemeId);
            if (payouts && payouts.length > 0) {
                setPendingPayout(payouts[0]); // Display the first pending payout
            } else {
                setPendingPayout(null);
            }
        } catch (error) {
            console.error("Error fetching pending payouts:", error);
            // Don't alert here, just log, as it might be normal if no payouts exist
            setPendingPayout(null);
        } finally {
            setFetchingPendingPayouts(false);
        }
    };


    const resetPayoutModal = () => {
        setPayoutModalOpen(false);
        setSelectedPayout(null);
        setPayoutStep(1);
        setPayoutMode('OFFLINE'); // Fix: Consistent with Payout type
        setConsentChecked(false);
        setOtpSent(false);
        setOtpValue('');
        setPrizeFile(null);
        setGuarantorFile(null);
        setIsAnimating(false);
        setGuarantorFormData({ name: '', phone: '', email: '', income: '', address: '' });
        fetchPendingPayouts(schemeId!); // Refresh pending payouts on close
    };

    const handleOpenPayout = async (payout: Payout) => {
        if (!schemeId) {
            alert("Scheme ID is missing. Cannot open payout wizard.");
            return;
        }

        try {
            // Fetch the full payout context including all wizard related fields
            const context = await api.getPayoutContext(payout.id);
            const fetchedPayout = context.payout;

            setSelectedPayout(fetchedPayout);
            setPayoutContext(context); // Store full context

            // Initialize wizard state based on fetched payout data
            setPayoutStep(fetchedPayout.current_step || 1);
            setPayoutMode(fetchedPayout.payout_mode || 'OFFLINE'); // Fix: Consistent with Payout type
            setGuarantorFormData({
                name: fetchedPayout.guarantor_name || '',
                phone: fetchedPayout.guarantor_phone || '',
                email: fetchedPayout.guarantor_email || '',
                income: fetchedPayout.guarantor_income?.toString() || '',
                address: fetchedPayout.guarantor_address || '',
            });
            // Reset other UI specific states
            setConsentChecked(false);
            setOtpSent(false);
            setOtpValue('');
            setPrizeFile(null);
            setGuarantorFile(null);

            // Only open the modal if data is successfully fetched and processed
            setPayoutModalOpen(true);
        } catch (error) {
            console.error("Failed to open payout wizard:", error);
            alert("Failed to load payout details. Please try again.");
            resetPayoutModal(); // Ensure modal state is reset if opening failed
        }
    };

    // --- API Calls for Wizard ---
    const sendOtp = async () => { console.log('[MOCK] Sending OTP...'); alert("Mock OTP: 1234"); };
    // This mock now returns an esign ID on success.
    const verifyOtp = async (otp: string) => { 
        console.log(`[MOCK] Verifying OTP ${otp}...`); 
        if (otp !== '1234') throw new Error('Invalid OTP'); 
        return 'mock-foreman-esign-123'; // Return a mock e-sign ID on success
    };

    // Fix: Updated `mode` parameter type to match Payout type
    const saveProgressToDb = async (step: number, mode: 'ONLINE' | 'OFFLINE', foremanEsignId: string | null, status: Payout['status'] | null) => {
        if (!selectedPayout?.id || !user?.id) return;
        setIsSavingProgress(true);
        try {
            // 1. Save core wizard progress using RPC
            await api.savePayoutWizardCoreProgress(
                selectedPayout.id,
                step,
                mode,
                guarantorFormData
            );

            // 2. Update status and foremanEsignId directly if provided
            const updates: Partial<Payout> = {};
            if (status) {
                updates.status = status;
            }
            if (foremanEsignId) {
                updates.foreman_esign_id = foremanEsignId;
            }
            if (Object.keys(updates).length > 0) {
                await api.updatePayoutFields(selectedPayout.id, updates);
            }

            console.log(`[DB] Payout ${selectedPayout.id} progress saved to step ${step} with status ${status || selectedPayout.status}`);
            // Fix: Ensure the entire selectedPayout object is correctly typed
            setSelectedPayout(prev => prev ? { 
                ...prev, 
                current_step: step, 
                payout_mode: mode, 
                foreman_esign_id: foremanEsignId || prev.foreman_esign_id || null, 
                status: status || prev.status 
            } : null);
        } catch (e) {
            console.error("Failed to save payout progress:", e);
            alert("Failed to save progress. Please check console for details.");
        } finally {
            setIsSavingProgress(false);
        }
    };

    // --- NEW HANDLERS ---
    const handleNextStep = async () => {
        if (!selectedPayout?.id || !user?.id || isSavingProgress || isFinalizingPayout) return;

        if (payoutStep === 1) {
            setPayoutStep(2);
            await saveProgressToDb(2, payoutMode, null, null);
            return;
        }
        if (payoutStep === 2) {
            // Save current guarantor data when moving from step 2
            await saveProgressToDb(3, payoutMode, null, null);
            setPayoutStep(3);
            return;
        }
        if (payoutStep === 3) {
            if (payoutMode === 'ONLINE') { // Fix: Use 'ONLINE'
                if (!consentChecked) {
                    alert('Please check the consent box.');
                    return;
                }
                if (!otpSent) {
                    await sendOtp(); // Mock send OTP
                    setOtpSent(true);
                    return;
                }
                try {
                    const esignId = await verifyOtp(otpValue); // Mock verify OTP
                    // If successful, save the e-sign ID and status to DB
                    await saveProgressToDb(
                        4, // Move to next step
                        payoutMode,
                        esignId, // Pass the obtained e-sign ID
                        'SIGNATURE_PENDING' // Update payout status
                    );
                    setPayoutStep(4);
                } catch(e: any) {
                    return alert('OTP Verification failed: ' + e.message);
                }
            }
            if (payoutMode === 'OFFLINE') { // Fix: Use 'OFFLINE'
                if (!prizeFile || !guarantorFile) {
                    alert('Please upload both signed documents.');
                    return;
                }
                setUploadingFiles({prize: true, guarantor: true});
                try {
                    // Upload files to storage and update 'documents' table with payout_id
                    await api.uploadPayoutDocument(selectedPayout.id, user.id, schemeId!, selectedPayout.enrollment_id, prizeFile, 'prize_claim_form');
                    await api.uploadPayoutDocument(selectedPayout.id, user.id, schemeId!, selectedPayout.enrollment_id, guarantorFile, 'guarantor_bond');
                    console.log(`[DB] Uploaded Prize: ${prizeFile?.name}, Guarantor: ${guarantorFile?.name}`);
                    await saveProgressToDb(4, payoutMode, null, 'DOCS_UPLOADED');
                    setPayoutStep(4);
                } catch (e: any) {
                    alert("Failed to upload documents: " + e.message);
                    console.error("Document upload error:", e);
                    setUploadingFiles({});
                    return;
                } finally {
                    setUploadingFiles({});
                }
            }
            return; // Ensure no fall-through
        }
        if (payoutStep === 4) {
            setPayoutStep(5);
            await saveProgressToDb(5, payoutMode, null, null);
            return;
        }
        if (payoutStep === 5) {
            if (payoutMode === 'OFFLINE') { // Fix: Use 'OFFLINE'
                setIsFinalOtpModalOpen(true);
                return; // Wait for final OTP modal confirmation
            }
            // For online, directly finalize (no extra transaction ID needed)
            setIsFinalizingPayout(true);
            try {
                await api.finalizePayoutAndDistributeDividends(selectedPayout.id, null, selectedPayout.foreman_esign_id || null);
                setPayoutStep(6);
                setTimeout(() => setIsAnimating(true), 100);
            } catch (err: any) {
                alert('Failed to finalize payout: ' + err.message);
                console.error(err);
            } finally {
                setIsFinalizingPayout(false);
            }
            return;
        }
    };
    
    const handleFinalProxyVerification = async () => {
        if (!selectedPayout?.id || !user?.id || isFinalizingPayout) return;

        setIsFinalizingPayout(true);
        try {
            // In offline mode, finalOtp is treated as transaction_ref
            await api.finalizePayoutAndDistributeDividends(selectedPayout.id, finalOtp, null); // foremanEsignId is null for offline
            setIsFinalOtpModalOpen(false);
            setPayoutStep(6);
            setTimeout(() => setIsAnimating(true), 100);
        } catch (err: any) { 
            alert('Payout finalization failed: ' + err.message); 
            console.error(err); 
        } finally {
            setIsFinalizingPayout(false);
        }
    };
    
    const triggerFileSelect = (type: 'prize' | 'guarantor') => {
        if (type === 'prize') prizeFileRef.current?.click();
        else guarantorFileRef.current?.click();
    };

    const handlePayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'prize' | 'guarantor') => {
        if(e.target.files?.[0]) {
            if (type === 'prize') setPrizeFile(e.target.files[0]);
            if (type === 'guarantor') setGuarantorFile(e.target.files[0]);
        }
    };

    const handleSubscriberIncomeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setIncomeUploading(true);
            setTimeout(() => { // simulate upload
                alert(`${e.target.files![0].name} uploaded!`);
                setIncomeUploading(false);
            }, 1000);
        }
    };
    
    const filteredCollection = useMemo(() => {
        return collectionData.filter(row => {
            let matches = true;
            if (paymentStatusFilter !== 'Payment Status') {
                if (paymentStatusFilter === 'Active' && row.status !== 'Active') matches = false;
                if (paymentStatusFilter === 'Late' && row.status !== 'Late') matches = false;
                if (paymentStatusFilter === 'Default' && row.status !== 'Default') matches = false;
            }
            if (paymentMethodFilter !== 'Payment Method' && row.paidVia !== '-') {
                if (paymentMethodFilter.toLowerCase() !== row.paidVia.toLowerCase()) matches = false;
            }
            return matches;
        });
    }, [collectionData, paymentStatusFilter, paymentMethodFilter]);

    // Calculate foreman fee for display
    const calculatedForemanFee = payoutContext?.scheme?.foreman_commission && payoutContext?.scheme?.chit_value
        ? (payoutContext.scheme.chit_value * payoutContext.scheme.foreman_commission / 100)
        : 0;
    
    // Calculate net winning amount
    const netWinningAmount = payoutContext?.payout?.amount !== undefined 
        ? (payoutContext.payout.amount - 150 - 0.25) // Example deductions
        : 'N/A';

    // Calculate distributable dividend
    const totalBidDiscount = payoutContext?.auction?.winning_bid || 0;
    const distributableDividend = Math.max(0, totalBidDiscount - calculatedForemanFee);


    // --- RENDER PAYOUT WIZARD ---
    const renderPayoutStep = () => {
        // Fix: Extract complex conditional JSX directly into a variable for clarity and to potentially resolve type inference issues.
        const guarantorDetailsOnlineSubmittedText = payoutMode === 'ONLINE' ? (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Submitted by Subscriber</span>
        ) : null;
        const guarantorDocsOnlineSubmittedText = payoutMode === 'ONLINE' ? (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Submitted</span>
        ) : null;

        switch (payoutStep) {
            case 1: // Auction Summary
                return (
                    <div className="space-y-8 animate-in fade-in duration-300 px-4">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2"><div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">01</div><h2 className="text-xl font-bold text-blue-500">Auction Summary</h2></div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setPayoutMode('ONLINE')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${payoutMode === 'ONLINE' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
                                    <Smartphone size={14} /> Online
                                </button>
                                <button onClick={() => setPayoutMode('OFFLINE')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${payoutMode === 'OFFLINE' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>
                                    <ShieldCheck size={14} /> Offline
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6 max-w-5xl mx-auto">
                            <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Basic Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
                                <div><p className="text-gray-500 text-xs mb-1">Scheme Name</p><p className="font-semibold text-gray-900">Gold Scheme</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Group ID</p><p className="font-semibold text-gray-900">LD628E</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Chit Value</p><p className="font-semibold text-gray-900">₹89,000</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Subscribers Participated</p><p className="font-semibold text-gray-900">21/12/2025</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Auction Date</p><p className="font-semibold text-gray-900">Aug 15, 2026</p></div>
                            </div>
                            <h3 className="font-bold text-gray-800 mt-8 border-b border-gray-100 pb-2">Winners Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
                                <div><p className="text-gray-500 text-xs mb-1">Winner</p><p className="font-semibold text-gray-900">{selectedPayout?.winnerName}</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Prize Amount</p><p className="font-semibold text-gray-900">₹80,000</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Discount</p><p className="font-semibold text-gray-900">₹9,000</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Discount in %</p><p className="font-semibold text-gray-900">10.11%</p></div>
                                <div><p className="text-gray-500 text-xs mb-1">Foreman Commission</p><p className="font-semibold text-gray-900">₹5,000</p></div>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-8 animate-in fade-in duration-300 px-4">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">02</div>
                            <h2 className="text-xl font-bold text-blue-500">Winners & Guarantor Details</h2>
                            <div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div>
                        </div>
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500" /> Winner / Subscriber Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div><label className="text-xs text-gray-500 mb-1 block">Winner Name</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={selectedPayout?.winnerName} readOnly /></div>
                                    <div><label className="text-xs text-gray-500 mb-1 block">Subscriber ID</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={selectedPayout?.enrollment_id?.substring(0,8) || ''} readOnly /></div>
                                    <div><label className="text-xs text-gray-500 mb-1 block">Phone Number</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value="+91 9876543210" readOnly /></div>
                                    <div><label className="text-xs text-gray-500 mb-1 block">Address</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value="123, Gandhi Road, Chennai" readOnly /></div>
                                </div>
                            </div>
                            <div className={`bg-white p-6 rounded-xl border ${payoutMode === 'ONLINE' ? 'border-gray-100 bg-gray-50' : 'border-blue-200 shadow-sm'}`}> {/* Fix: Use 'ONLINE' */}
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} className="text-blue-500" /> Guarantor Details {guarantorDetailsOnlineSubmittedText}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                    <div><label className="text-xs text-gray-500 mb-1 block">Guarantor Name</label><input name="name" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Name" readOnly={payoutMode==='ONLINE'} value={guarantorFormData.name} onChange={handleGuarantorInputChange} /></div> {/* Fix: Use 'ONLINE' */}
                                    <div><label className="text-xs text-gray-500 mb-1 block">Phone Number</label><input name="phone" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91" readOnly={payoutMode==='ONLINE'} value={guarantorFormData.phone} onChange={handleGuarantorInputChange} /></div> {/* Fix: Use 'ONLINE' */}
                                    <div><label className="text-xs text-gray-500 mb-1 block">Email</label><input name="email" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="email@example.com" readOnly={payoutMode==='ONLINE'} value={guarantorFormData.email} onChange={handleGuarantorInputChange} /></div> {/* Fix: Use 'ONLINE' */}
                                    <div><label className="text-xs text-gray-500 mb-1 block">Monthly Income</label><input name="income" type="number" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="₹" readOnly={payoutMode==='ONLINE'} value={guarantorFormData.income} onChange={handleGuarantorInputChange}/></div> {/* Fix: Use 'ONLINE' */}
                                    <div className="lg:col-span-1"><label className="text-xs text-gray-500 mb-1 block">Address</label><input name="address" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Address" readOnly={payoutMode==='ONLINE'} value={guarantorFormData.address} onChange={handleGuarantorInputChange}/></div> {/* Fix: Use 'ONLINE' */}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                <div>
                                    <h4 className="font-bold text-gray-700 text-sm mb-4 border-b pb-2">Subscriber Documents (On File)</h4>
                                    <div className="space-y-4">
                                        {['Income Proof (ITR / Pay Slip / 6m Bank Stmt)','Aadhaar Card','Address Proof'].map((doc, idx) => (
                                            <div key={idx}>
                                                <label className="text-xs text-gray-500 mb-1 block">{doc}</label>
                                                <div className="flex items-center gap-2">
                                                    {doc.toLowerCase().startsWith('income') && payoutMode === 'OFFLINE' ? ( // Fix: Use 'OFFLINE'
                                                        <>
                                                            <input id={`subscriber-income`} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={handleSubscriberIncomeUpload} />
                                                            <div onClick={() => (document.getElementById(`subscriber-income`) as HTMLInputElement)?.click()} className="flex-1 border border-dashed border-gray-300 bg-white rounded-lg p-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"><Upload size={16} /> {incomeUploading ? 'Uploading...' : 'Upload Latest Income Proof'}</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex-1 border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-600 flex items-center gap-2"><FileText size={16} className="text-blue-400" /> {doc.split('(')[0].trim()}.pdf</div>
                                                            <button className="bg-blue-50 text-blue-600 border border-blue-200 p-2.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm font-medium"><Eye size={18} /> View</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 text-sm mb-4 border-b pb-2">Guarantor Documents {guarantorDocsOnlineSubmittedText}</h4>
                                    <div className="space-y-4">
                                        {['Income Proof (ITR / Pay Slip / 6m Bank Stmt)','Aadhaar Card','Address Proof'].map((doc, idx) => (
                                            <div key={idx}>
                                                <label className="text-xs text-gray-500 mb-1 block">{doc}</label>
                                                <div className="flex items-center gap-2">
                                                    {payoutMode === 'OFFLINE' ? ( // Fix: Use 'OFFLINE'
                                                        <>
                                                            <input id={`guarantor-file-${idx}`} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handlePayoutFileChange(e, `guarantor`)} />
                                                            <div onClick={() => (document.getElementById(`guarantor-file-${idx}`) as HTMLInputElement)?.click()} className="flex-1 border border-dashed border-gray-300 bg-white rounded-lg p-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"><Upload size={16} /> Upload Document</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex-1 border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-600 flex items-center gap-2"><FileText size={16} className="text-blue-400" /> {doc.split('(')[0].trim()}.pdf</div>
                                                            <button className="bg-blue-50 text-blue-600 border border-blue-200 p-2.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm font-medium"><Eye size={18} /> View</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-8 animate-in fade-in duration-300 px-4">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">03</div>
                            <h2 className="text-xl font-bold text-blue-500">{payoutMode === 'OFFLINE' ? 'Upload Signed Documents' : 'Foreman e-Signature'}</h2> {/* Fix: Use 'OFFLINE' */}
                            <div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div>
                        </div>
                        {payoutMode === 'OFFLINE' ? ( // Fix: Use 'OFFLINE'
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                                    <Printer className="text-blue-500 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-blue-800 text-sm">Instructions for Offline Mode</h4>
                                        <p className="text-xs text-blue-600 mt-1">1. Download and Print the Prize Claim Form and Guarantor Bond.<br />2. Get physical signatures from the Subscriber and Guarantor.<br />3. Scan or take a photo and upload the signed copies below.</p>
                                    </div>
                                    <button className="ml-auto bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 h-fit">Download Blank Forms</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="font-bold text-gray-700 block mb-2">Signed Prize Claim Form</label>
                                        <input ref={prizeFileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handlePayoutFileChange(e, 'prize')} />
                                        <div onClick={() => triggerFileSelect('prize')} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Upload size={20} /></div>
                                            <div><p className="text-sm font-medium text-gray-600">{prizeFile ? prizeFile.name : 'Click to upload scanned copy'}</p><p className="text-xs text-gray-400">PDF, JPG or PNG (Max 5MB)</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-gray-700 block mb-2">Signed Guarantor Bond</label>
                                        <input ref={guarantorFileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handlePayoutFileChange(e, 'guarantor')} />
                                        <div onClick={() => triggerFileSelect('guarantor')} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Upload size={20} /></div>
                                            <div><p className="text-sm font-medium text-gray-600">{guarantorFile ? guarantorFile.name : 'Click to upload scanned copy'}</p><p className="text-xs text-gray-400">PDF, JPG or PNG (Max 5MB)</p></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-6xl mx-auto">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="bg-gray-100 border border-gray-200 shadow-inner rounded-xl p-6 max-h-[500px] overflow-y-auto custom-scrollbar"><div className="bg-white p-10 shadow-sm mx-auto max-w-3xl text-gray-800 mb-4 border border-gray-200"><div className="text-center border-b pb-4 mb-6"><h2 className="text-xl font-bold uppercase text-gray-900">Prize Claiming Form</h2></div><div className="space-y-4 text-sm"><p>I, <strong>{selectedPayout?.winnerName}</strong>, hereby acknowledge receipt...</p><p className="text-gray-400 italic">[Content truncated...]</p></div><div className="mt-8 pt-4 border-t border-dashed flex justify-between items-center"><span className="text-xs text-gray-500">Subscriber Signature:</span><span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> VERIFIED</span></div></div></div>
                                    <div className="bg-gray-100 border border-gray-200 shadow-inner rounded-xl p-6 max-h-[500px] overflow-y-auto custom-scrollbar"><div className="bg-white p-10 shadow-sm mx-auto max-w-3xl text-gray-800 mb-4 border border-gray-200"><div className="text-center border-b pb-4 mb-6"><h2 className="text-xl font-bold uppercase text-gray-900">Guarantor Security Form</h2></div><div className="space-y-4 text-sm"><p>I, <strong>{guarantorFormData.name || 'Anand Raj'}</strong>, stand as guarantor for...</p><p className="text-gray-400 italic">[Content truncated...]</p></div><div className="mt-8 pt-4 border-t border-dashed flex justify-between items-center"><span className="text-xs text-gray-500">Guarantor Signature:</span><span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> VERIFIED</span></div></div></div>
                                </div>
                                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 max-w-3xl mx-auto">
                                    <input type="checkbox" id="consent" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                                    <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">I, the Foreman, confirm the verification of all documents and hereby give my consent to use my Aadhaar for e-Signing to authorize this transfer.</label>
                                </div>
                                {otpSent && (
                                    <div className="max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-4 mt-4">
                                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                            <div className="flex items-center justify-center gap-2 text-yellow-800 font-bold mb-2"><Fingerprint size={20} /> Enter Your (Foreman) OTP</div>
                                            <p className="text-xs text-gray-600 mb-3">One Time Password sent to your registered mobile number.</p>
                                            <input type="text" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} className="w-40 text-center text-xl tracking-widest border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="----" maxLength={4} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-8 animate-in fade-in duration-300 px-4 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-6 w-full max-w-md">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">04</div>
                            <h2 className="text-xl font-bold text-blue-500">Payout Summary</h2>
                        </div>
                        <div className="bg-white border border-gray-400 rounded-2xl p-8 w-full max-w-[400px] shadow-sm relative">
                            <h3 className="text-center font-bold text-gray-900 text-lg mb-8">Prized Subscriber</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Winning amount</span><span className="font-bold text-gray-900">₹{payoutContext?.payout?.amount?.toLocaleString() || 'N/A'}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Foreman fee</span><span className="font-bold text-gray-900">₹{calculatedForemanFee.toLocaleString() || 'N/A'}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Discount</span><span className="font-bold text-gray-900">₹{payoutContext?.auction?.winning_bid?.toLocaleString() || 'N/A'}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Tax deduction</span><span className="font-bold text-gray-900">₹150</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Transaction fee</span><span className="font-bold text-gray-900">₹0.25</span></div>
                                <div className="border-t border-dashed border-gray-300 my-6"></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Net winning amount</span><span className="font-bold text-gray-900 text-lg">₹{netWinningAmount?.toLocaleString() || 'N/A'}</span></div>
                            </div>
                        </div>
                        <div className="max-w-md text-[10px] text-gray-400 text-center leading-relaxed space-y-2 mt-4"><p>Prize amount is paid after deducting the bid discount as per the auction conducted under the Chit Funds Act, 1982.</p><p>Foreman commission and approved charges are adjusted strictly as per the registered chit agreement.</p><p>Net payable amount is released after statutory deductions, if any, and compliance with Section 22 of the Act.</p></div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-8 animate-in fade-in duration-300 px-4 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-6 w-full max-w-md">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">05</div>
                            <h2 className="text-xl font-bold text-blue-500">Dividend Summary</h2>
                        </div>
                        <div className="bg-white border border-gray-400 rounded-2xl p-8 w-full max-w-[400px] shadow-sm relative">
                            <h3 className="text-center font-bold text-gray-900 text-lg mb-8">Non-Prized Subscriber</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Total Bid Discount</span><span className="font-bold text-gray-900">₹{totalBidDiscount?.toLocaleString() || 'N/A'}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Less: Foreman fee</span><span className="font-bold text-gray-900">₹{calculatedForemanFee.toLocaleString() || 'N/A'}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="font-bold text-green-600">Distributable Dividend</span><span className="font-bold text-green-600">₹{distributableDividend.toLocaleString() || 'N/A'}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Eligible Members</span><span className="font-bold text-gray-900">{payoutContext?.scheme?.members_count - 1 || 'N/A'}</span></div>
                                <div className="border-t border-dashed border-gray-300 my-6"></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Dividend Per Member</span><span className="font-bold text-green-600 text-lg">₹{payoutContext?.auction?.dividend_amount?.toLocaleString() || 'N/A'}</span></div>
                            </div>
                        </div>
                        <div className="max-w-md text-[10px] text-gray-400 text-center leading-relaxed space-y-2 mt-4"><p>Dividend is distributed from the bid discount after deducting the foreman’s commission, as permitted under the Act.</p><p>The distributable dividend is equally credited to all eligible non-prized subscribers.</p><p>Dividend amount is adjusted against future monthly subscriptions as per the chit agreement.</p></div>
                    </div>
                );
            case 6:
                return <LogoAnimation />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg text-blue-500"><RotateCcw size={24} className="rotate-90" /></div><h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card title="Collection Analytics" action={<a href="#" className="text-xs font-bold text-blue-600">view more</a>}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard label="Monthly Collection" value="₹89,000" trend="8.5% Up from yesterday" />
                            <StatCard label="Overdue Amount" value="₹13,000" trend="8.5% Up from yesterday" />
                            <StatCard label="Defaulters" value="05" trend="8.5% Up from yesterday" />
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    {fetchingPendingPayouts ? (
                        <Card className="h-full flex items-center justify-center text-gray-400">
                            <Loader2 className="animate-spin text-blue-500" size={24} />
                        </Card>
                    ) : pendingPayout ? (
                        <Card title="Pending Payout" className="bg-blue-50 border-blue-200 h-full">
                            <div className="flex justify-between items-start">
                                <div><p className="text-sm font-bold text-gray-800">{pendingPayout.winnerName}</p><p className="text-xs text-gray-500">Prize amount</p><p className="text-xl font-bold text-blue-600 mt-1">₹{pendingPayout.amount.toLocaleString()}</p></div>
                                <div className="text-right"><p className="text-xs text-gray-500">Auction #{pendingPayout.auctionNumber}</p><p className="text-sm font-bold text-red-500 mt-4">Due <span className="text-lg">3</span> Days</p></div>
                            </div>
                            <Button variant="outline" className="w-full mt-4" onClick={() => handleOpenPayout(pendingPayout)}>Process Payout</Button>
                        </Card>
                    ) : <Card className="h-full flex items-center justify-center text-gray-400">No pending payouts.</Card>}
                </div>
            </div>
            
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
                <Filter size={18} className="text-gray-600" />
                <span className="text-sm font-bold text-gray-600">Filter By</span>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none text-sm font-medium text-gray-700 py-2 px-2 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded"><option>Date</option></select>
                <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className="bg-transparent border-none text-sm font-medium text-gray-700 py-2 px-2 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded"><option>Payment Status</option><option>Active</option><option>Late</option><option>Default</option></select>
                <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} className="bg-transparent border-none text-sm font-medium text-gray-700 py-2 px-2 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded"><option>Payment Method</option><option>UPI</option><option>Cash</option><option>BANK-SBI</option><option>NET BANKING</option></select>
                <button onClick={() => {setPaymentStatusFilter('Payment Status'); setPaymentMethodFilter('Payment Method')}} className="ml-auto text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"><RotateCcw size={16} /> Reset Filter</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                <table className="w-full text-left">
                <thead><tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50"><th className="p-4 pl-6">ID</th><th className="p-4">NAME</th><th className="p-4">DUE DATE</th><th className="p-4">LAST PAYMENT</th><th className="p-4">PAID VIA</th><th className="p-4">OVERDUE</th><th className="p-4">STATUS</th><th className="p-4 text-center">ACTIONS</th></tr></thead>
                <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                    {filteredCollection.map(c => (
                        <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4 pl-6 font-mono text-gray-500 text-xs">{c.id.split('-')[0].toUpperCase()}</td>
                        <td className="p-4 font-medium text-gray-900">{c.subscriberName}</td>
                        <td className="p-4 text-gray-500 font-medium">{c.dueDate}</td>
                        <td className="p-4 text-gray-500">{c.lastPaymentDate}</td>
                        <td className="p-4 text-gray-500 uppercase text-xs">{c.paidVia}</td>
                        <td className={`p-4 font-bold ${c.overdueDays > 0 ? 'text-red-500' : 'text-gray-400'}`}>{c.overdueDays > 0 ? `${c.overdueDays} Days` : '0 Days'}</td>
                        <td className="p-4"><Badge variant={c.status === 'Active' ? 'success' : c.status === 'Late' ? 'purple' : 'danger'}>{c.status}</Badge></td>
                        <td className="p-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => navigate(`/schemes/${schemeId}/subscribers/${c.id}`)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Eye size={16} /></button><button className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Edit size={16} /></button><button className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><MessageSquare size={16} /></button></div></td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>


            <Modal isOpen={payoutModalOpen} onClose={resetPayoutModal} title="" maxWidth="max-w-7xl">
                <div className="min-h-[70vh] flex flex-col"><div className="flex-1 py-4">{renderPayoutStep()}</div><div className="flex justify-between items-center px-8 pt-4 border-t border-gray-100">{payoutStep < 6 ? (<><Button variant="outline" onClick={resetPayoutModal}>Disapprove & Close</Button><div className="flex items-center gap-4">{payoutStep > 1 && <Button variant="secondary" onClick={() => setPayoutStep(p => p - 1)} disabled={isSavingProgress || isFinalizingPayout}>Back</Button>}<Button onClick={handleNextStep} isLoading={isSavingProgress || (payoutStep === 3 && otpSent)} disabled={(payoutStep === 3 && payoutMode==='ONLINE' && !consentChecked)}>{ payoutStep === 3 && payoutMode === 'ONLINE' ? (otpSent ? "Authorize & Continue" : "Get OTP to Authorize") : (payoutStep === 5 ? (isFinalizingPayout ? "Finalizing..." : "Finalize Payout") : "Next Step") } <ArrowRight size={16} className="ml-2"/></Button></div></>) : (<Button onClick={resetPayoutModal} className="mx-auto">Close Window</Button>)}</div></div>
            </Modal>
            <Modal isOpen={isFinalOtpModalOpen} onClose={() => setIsFinalOtpModalOpen(false)} title="Final Payout Verification (Offline)"><div className="space-y-4"><p className="text-sm text-gray-600">Enter transaction reference ID to release payment.</p><Input label="Enter Transaction ID" value={finalOtp} onChange={e => setFinalOtp(e.target.value)} /><Button onClick={handleFinalProxyVerification} isLoading={isFinalizingPayout} className="w-full">Verify & Release Payment</Button></div></Modal>
        </div>
    );
};
