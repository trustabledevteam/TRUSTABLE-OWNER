
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

const LogoAnimation = () => (
    <div className="py-20 flex justify-center items-center">
        <div className="flex flex-col items-center justify-center text-center py-10">
            <CheckCircle size={64} className="text-green-500 animate-pulse mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Payout Processed!</h2>
            <p className="text-gray-500 mt-2">The transaction has been completed successfully.</p>
        </div>
    </div>
);


export const Collections: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Scheme ID
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [collectionData, setCollectionData] = useState<CollectionRow[]>([]);
    const [pendingPayout, setPendingPayout] = useState<Payout | null>(null);

    // --- NEW PAYOUT MODAL STATE ---
    const [payoutModalOpen, setPayoutModalOpen] = useState(false);
    const [payoutStep, setPayoutStep] = useState(1);
    const [payoutMode, setPayoutMode] = useState<'online' | 'offline'>('offline');
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

    const prizeFileRef = useRef<HTMLInputElement>(null);
    const guarantorFileRef = useRef<HTMLInputElement>(null);
    
    // --- OLD FILTER STATE ---
    const [dateFilter, setDateFilter] = useState('Date');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('Payment Status');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('Payment Method');

    const pageTitle = 'Collection Tracking & Payout Management';

    // --- DATA FETCHING ---
    useEffect(() => {
        if (id) {
            fetchCollectionData(id);
            // MOCK PAYOUT FOR TESTING
            const mockPayout: Payout = {
              id: 'mock-payout-123', auction_id: 'mock-auction-456', enrollment_id: 'mock-enrollment-789',
              amount: 89000, due_date: new Date().toISOString(), status: 'PENDING',
              winnerName: 'Raj Kumar (Mock)', auctionNumber: 7,
            };
            setPendingPayout(mockPayout);
        }
    }, [id]);

    const fetchCollectionData = async (schemeId: string) => {
        setLoading(true);
        const data = await api.getSchemeCollectionData(schemeId);
        if (data && data.scheme) {
            const today = new Date();
            const start = new Date(data.scheme.start_date);
            const dueDay = data.scheme.due_day || 5;
            const monthlyDue = data.scheme.monthly_due || 0;
            const gracePeriod = data.scheme.grace_period_days || 3;
            const defaultPeriod = data.scheme.default_status_period || 90;
            let monthDiff = (today.getFullYear() - start.getFullYear()) * 12;
            monthDiff -= start.getMonth();
            monthDiff += today.getMonth();
            const currentCycleIndex = today.getDate() > dueDay ? monthDiff + 1 : monthDiff;

            const processedRows: CollectionRow[] = data.subscribers.map((sub: any) => {
                const totalPaid = sub.transactions.reduce((acc: number, t: any) => acc + t.amount, 0);
                const lastTxn = sub.transactions[0];
                const paidInstallmentsCount = Math.floor(totalPaid / monthlyDue);
                const pendingInstallments = Math.max(0, currentCycleIndex - paidInstallmentsCount);
                let status: 'Active' | 'Late' | 'Default' = 'Active';
                let overdueDays = 0;
                let currentDueDate = new Date();

                if (pendingInstallments === 0) {
                    status = 'Active';
                    overdueDays = 0;
                    currentDueDate = new Date();
                    if (today.getDate() > dueDay) currentDueDate.setMonth(currentDueDate.getMonth() + 1);
                    currentDueDate.setDate(dueDay);
                } else {
                    const missedMonthDate = new Date(start);
                    missedMonthDate.setMonth(start.getMonth() + paidInstallmentsCount);
                    missedMonthDate.setDate(dueDay);
                    if (missedMonthDate < today) {
                        const diffTime = Math.abs(today.getTime() - missedMonthDate.getTime());
                        overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (overdueDays > (gracePeriod + defaultPeriod)) status = 'Default';
                        else if (overdueDays > 0) status = 'Late';
                        else status = 'Active';
                    }
                    const nextVisualDueDate = new Date();
                    if (today.getDate() > dueDay) nextVisualDueDate.setMonth(nextVisualDueDate.getMonth() + 1);
                    nextVisualDueDate.setDate(dueDay);
                    currentDueDate = nextVisualDueDate;
                }
                return {
                    id: sub.id, subscriberName: sub.profiles?.full_name || 'Unknown', subscriberPhone: sub.profiles?.phone || '',
                    dueDate: currentDueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                    lastPaymentDate: lastTxn ? new Date(lastTxn.payment_date || lastTxn.created_at).toLocaleDateString('en-GB') : '-',
                    paidVia: lastTxn ? lastTxn.mode : '-', overdueDays, status,
                };
            });
            setCollectionData(processedRows);
        }
        setLoading(false);
    };


    const resetPayoutModal = () => {
        setPayoutModalOpen(false);
        setSelectedPayout(null);
        setPayoutStep(1);
        setPayoutMode('offline');
        setConsentChecked(false);
        setOtpSent(false);
        setOtpValue('');
        setPrizeFile(null);
        setGuarantorFile(null);
        setIsAnimating(false);
    };

    const handleOpenPayout = (payout: Payout) => {
        setSelectedPayout(payout);
        // Using mock context for testing UI flow
        setPayoutContext({
            payout,
            auction: { winning_bid: 9000, auction_date: new Date().toISOString() },
            scheme: { name: 'Gold Scheme', chit_id: 'LD628E', chit_value: 89000, members_count: 20, foreman_commission: 5 },
            winner: { profile: { full_name: payout.winnerName, phone: '+91 9876543210', address: '123, Gandhi Road, Chennai' } },
            kycDocs: [{document_type: 'aadhaar'}, {document_type: 'addressProof'}]
        });
        setPayoutModalOpen(true);
    };

    // --- MOCK API CALLS FOR TESTING ---
    const updateStep = async (step: number) => console.log(`[MOCK] Step updated to ${step}`);
    const sendOtp = async () => { console.log('[MOCK] Sending OTP...'); alert("Mock OTP: 1234"); };
    const verifyOtp = async (otp: string) => { console.log(`[MOCK] Verifying OTP ${otp}...`); if (otp !== '1234') throw new Error('Invalid OTP'); };
    const finalizePayout = async (amount: number) => console.log(`[MOCK] Finalizing payout of ${amount}`);
    
    // --- NEW HANDLERS ---
    const handleNextStep = async () => {
        if (payoutStep === 1) { setPayoutStep(2); await updateStep(2); return; }
        if (payoutStep === 2) { setPayoutStep(3); await updateStep(3); return; }
        if (payoutStep === 3) {
            if (payoutMode === 'online') {
                if (!consentChecked) return alert('Please check the consent box.');
                if (!otpSent) { await sendOtp(); return setOtpSent(true); }
                try { await verifyOtp(otpValue); } catch(e) { return alert('Invalid OTP'); }
            }
            if (payoutMode === 'offline') {
                if (!prizeFile || !guarantorFile) return alert('Please upload both signed documents.');
            }
            setPayoutStep(4);
            await updateStep(4);
            return;
        }
        if (payoutStep === 4) { setPayoutStep(5); await updateStep(5); return; }
        if (payoutStep === 5) {
            if (payoutMode === 'offline') return setIsFinalOtpModalOpen(true);
            setPayoutStep(6); await updateStep(6);
            setTimeout(() => setIsAnimating(true), 100);
            return;
        }
    };
    
    const handleFinalProxyVerification = async () => {
        if (!selectedPayout) return;
        try {
            await verifyOtp(finalOtp);
            await finalizePayout(Number(selectedPayout.amount));
            setIsFinalOtpModalOpen(false);
            setPayoutStep(6);
            await updateStep(6);
            setTimeout(() => setIsAnimating(true), 100);
        } catch (err) { alert('OTP verification failed'); console.error(err); }
    };
    
    const triggerFileSelect = (type: 'prize' | 'guarantor') => {
        if (type === 'prize') prizeFileRef.current?.click();
        else guarantorFileRef.current?.click();
    };

    const handlePayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
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


    // --- RENDER PAYOUT WIZARD ---
    const renderPayoutStep = () => {
        switch (payoutStep) {
            case 1: // Auction Summary
                return (
                    <div className="space-y-8 animate-in fade-in duration-300 px-4">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2"><div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">01</div><h2 className="text-xl font-bold text-blue-500">Auction Summary</h2></div>
                            <div className="flex bg-gray-100 p-1 rounded-lg"><button onClick={() => setPayoutMode('online')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${payoutMode === 'online' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><Smartphone size={14} /> Online</button><button onClick={() => setPayoutMode('offline')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${payoutMode === 'offline' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}><ShieldCheck size={14} /> Offline</button></div>
                        </div>
                        <div className="space-y-6 max-w-5xl mx-auto"><h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Basic Details</h3><div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm"><div><p className="text-gray-500 text-xs mb-1">Scheme Name</p><p className="font-semibold text-gray-900">Gold Scheme</p></div><div><p className="text-gray-500 text-xs mb-1">Group ID</p><p className="font-semibold text-gray-900">LD628E</p></div><div><p className="text-gray-500 text-xs mb-1">Chit Value</p><p className="font-semibold text-gray-900">₹89,000</p></div><div><p className="text-gray-500 text-xs mb-1">Subscribers Participated</p><p className="font-semibold text-gray-900">21/12/2025</p></div><div><p className="text-gray-500 text-xs mb-1">Auction Date</p><p className="font-semibold text-gray-900">Aug 15, 2026</p></div></div><h3 className="font-bold text-gray-800 mt-8 border-b border-gray-100 pb-2">Winners Details</h3><div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm"><div><p className="text-gray-500 text-xs mb-1">Winner</p><p className="font-semibold text-gray-900">{selectedPayout?.winnerName}</p></div><div><p className="text-gray-500 text-xs mb-1">Prize Amount</p><p className="font-semibold text-gray-900">₹80,000</p></div><div><p className="text-gray-500 text-xs mb-1">Discount</p><p className="font-semibold text-gray-900">₹9,000</p></div><div><p className="text-gray-500 text-xs mb-1">Foreman Commission</p><p className="font-semibold text-gray-900">₹5,000</p></div></div></div>
                    </div>);
            case 2: return (<div className="space-y-8 animate-in fade-in duration-300 px-4"><div className="flex items-center gap-2 mb-6"><div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">02</div><h2 className="text-xl font-bold text-blue-500">Winners & Guarantor Details</h2><div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div></div><div className="max-w-6xl mx-auto space-y-8"><div className="bg-gray-50 p-6 rounded-xl border border-gray-100"><h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500" /> Winner / Subscriber Details</h3><div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div><label className="text-xs text-gray-500 mb-1 block">Winner Name</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={selectedPayout?.winnerName} readOnly /></div><div><label className="text-xs text-gray-500 mb-1 block">Subscriber ID</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value="MEM00123" readOnly /></div><div><label className="text-xs text-gray-500 mb-1 block">Phone Number</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value="+91 9876543210" readOnly /></div><div><label className="text-xs text-gray-500 mb-1 block">Address</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value="123, Gandhi Road, Chennai" readOnly /></div></div></div><div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} className="text-blue-500" /> Guarantor Details</h3></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6"><div><label className="text-xs text-gray-500 mb-1 block">Guarantor Name</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Name" /></div><div><label className="text-xs text-gray-500 mb-1 block">Phone Number</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91" /></div><div><label className="text-xs text-gray-500 mb-1 block">Email</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="email@example.com" /></div><div><label className="text-xs text-gray-500 mb-1 block">Monthly Income</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="₹" /></div><div className="lg:col-span-1"><label className="text-xs text-gray-500 mb-1 block">Address</label><input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Address" /></div></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><h4 className="font-bold text-gray-700 text-sm mb-4 border-b pb-2">Subscriber Documents (On File)</h4><div className="space-y-4">{['Income Proof (ITR / Pay Slip / 6m Bank Stmt)','Aadhaar Card','Address Proof'].map((doc, idx) => (<div key={idx}><label className="text-xs text-gray-500 mb-1 block">{doc}</label><div className="flex items-center gap-2">{doc.toLowerCase().startsWith('income') ? (<><input id={`subscriber-income`} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={handleSubscriberIncomeUpload} /><div onClick={() => (document.getElementById(`subscriber-income`) as HTMLInputElement)?.click()} className="flex-1 border border-dashed border-gray-300 bg-white rounded-lg p-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"><Upload size={16} /> {incomeUploading ? 'Uploading...' : 'Upload Latest Income Proof'}</div></>) : (<><div className="flex-1 border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-600 flex items-center gap-2"><FileText size={16} className="text-blue-400" /> {doc.split('(')[0].trim()}.pdf</div><button className="bg-blue-50 text-blue-600 border border-blue-200 p-2.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm font-medium"><Eye size={18} /> View</button></>)}</div></div>))}</div></div><div><h4 className="font-bold text-gray-700 text-sm mb-4 border-b pb-2">Guarantor Documents</h4><div className="space-y-4">{['Income Proof (ITR / Pay Slip / 6m Bank Stmt)','Aadhaar Card','Address Proof'].map((doc, idx) => (<div key={idx}><label className="text-xs text-gray-500 mb-1 block">{doc}</label><div className="flex items-center gap-2"><input id={`guarantor-file-${idx}`} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handlePayoutFileChange(e, `GUARANTOR_${idx}`)} /><div onClick={() => (document.getElementById(`guarantor-file-${idx}`) as HTMLInputElement)?.click()} className="flex-1 border border-dashed border-gray-300 bg-white rounded-lg p-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"><Upload size={16} /> Upload Document</div></div></div>))}</div></div></div></div></div>);
            case 3: return (<div className="space-y-8 animate-in fade-in duration-300 px-4"><div className="flex items-center gap-2 mb-6"><div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">03</div><h2 className="text-xl font-bold text-blue-500">{payoutMode === 'offline' ? 'Upload Signed Documents' : 'Document Signing'}</h2><div className="flex-1 h-0.5 bg-blue-500 opacity-20"></div></div>{payoutMode === 'offline' ? (<div className="max-w-4xl mx-auto space-y-8"><div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3"><Printer className="text-blue-500 mt-1" /><div><h4 className="font-bold text-blue-800 text-sm">Instructions for Offline Mode</h4><p className="text-xs text-blue-600 mt-1">1. Download and Print the Prize Claim Form and Guarantor Bond.<br />2. Get physical signatures from the Subscriber and Guarantor.<br />3. Scan or take a photo and upload the signed copies below.</p></div><button className="ml-auto bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 h-fit">Download Blank Forms</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><label className="font-bold text-gray-700 block mb-2">Signed Prize Claim Form</label><input ref={prizeFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handlePayoutFileChange(e, 'prize')} /><div onClick={() => triggerFileSelect('prize')} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer group"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Upload size={20} /></div><div><p className="text-sm font-medium text-gray-600">{prizeFile ? prizeFile.name : 'Click to upload scanned copy'}</p><p className="text-xs text-gray-400">PDF, JPG or PNG (Max 5MB)</p></div></div><div>{uploadingFiles['prize'] ? <span className="text-xs text-gray-500">Uploading...</span> : <button className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded text-sm">Upload</button>}</div></div></div><div><label className="font-bold text-gray-700 block mb-2">Signed Guarantor Bond</label><input ref={guarantorFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handlePayoutFileChange(e, 'guarantor')} /><div onClick={() => triggerFileSelect('guarantor')} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors cursor-pointer group"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Upload size={20} /></div><div><p className="text-sm font-medium text-gray-600">{guarantorFile ? guarantorFile.name : 'Click to upload scanned copy'}</p><p className="text-xs text-gray-400">PDF, JPG or PNG (Max 5MB)</p></div></div><div>{uploadingFiles['guarantor'] ? <span className="text-xs text-gray-500">Uploading...</span> : <button className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded text-sm">Upload</button>}</div></div></div></div></div>) : (<div className="bg-gray-100 border border-gray-300 shadow-inner rounded-xl p-6 max-h-[500px] overflow-y-auto custom-scrollbar"><div className="bg-white p-10 shadow-sm mx-auto max-w-3xl text-gray-800 mb-8 border border-gray-200"><div className="text-center border-b pb-4 mb-6"><h2 className="text-xl font-bold uppercase text-gray-900">Prize Claiming Form</h2><p className="text-sm text-gray-500">Trustable Chit Funds Pvt Ltd</p></div><div className="space-y-4 text-sm"><p>I, <strong>{selectedPayout?.winnerName}</strong>, subscriber of Group <strong>LD628E</strong>, Ticket No <strong>05</strong>, hereby acknowledge receipt of the prize amount of <strong>₹80,000</strong> (Rupees Eighty Thousand Only) for the auction held on <strong>15th Aug 2026</strong>.</p><p>I confirm that the details provided are accurate and I authorize the foreman to deduct applicable commissions and fees.</p><br /><p className="text-gray-400 italic">[Content truncated for brevity...]</p></div></div><div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 max-w-3xl mx-auto"><input type="checkbox" id="consent" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" /><label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">I hereby give my consent to use my Aadhaar Number / Virtual ID for e-KYC and e-Sign purposes. I understand that this data will be used to verify my identity and sign these documents digitally.</label></div>{otpSent && (<div className="max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-4 mt-4"><div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl"><div className="flex items-center justify-center gap-2 text-yellow-800 font-bold mb-2"><Fingerprint size={20} /> Enter Aadhaar OTP</div><p className="text-xs text-gray-600 mb-3">One Time Password sent to mobile ending in ******3210</p><input type="text" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} className="w-40 text-center text-xl tracking-widest border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="----" maxLength={4} /></div></div>)}</div>)}</div>);
            case 4: return (<div className="space-y-8 animate-in fade-in duration-300 px-4 flex flex-col items-center"><div className="flex items-center gap-2 mb-6 w-full max-w-md"><div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">04</div><h2 className="text-xl font-bold text-blue-500">Payout Summary</h2></div><div className="bg-white border border-gray-400 rounded-2xl p-8 w-full max-w-[400px] shadow-sm relative"><h3 className="text-center font-bold text-gray-900 text-lg mb-8">Prized Subscriber</h3><div className="space-y-4"><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Winning amount</span><span className="font-bold text-gray-900">₹25,000</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Foreman fee</span><span className="font-bold text-gray-900">₹1,500</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Discount</span><span className="font-bold text-gray-900">₹13,500</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Tax deduction</span><span className="font-bold text-gray-900">₹150</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Transaction fee</span><span className="font-bold text-gray-900">₹0.25</span></div><div className="border-t border-dashed border-gray-300 my-6"></div><div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Net winning amount</span><span className="font-bold text-gray-900 text-lg">₹24,849.75</span></div></div></div><div className="max-w-md text-[10px] text-gray-400 text-center leading-relaxed space-y-2 mt-4"><p>Prize amount is paid after deducting the bid discount as per the auction conducted under the Chit Funds Act, 1982.</p><p>Foreman commission and approved charges are adjusted strictly as per the registered chit agreement.</p><p>Net payable amount is released after statutory deductions, if any, and compliance with Section 22 of the Act.</p></div></div>);
            case 5: return (<div className="space-y-8 animate-in fade-in duration-300 px-4 flex flex-col items-center"><div className="flex items-center gap-2 mb-6 w-full max-w-md"><div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">05</div><h2 className="text-xl font-bold text-blue-500">Dividend Summary</h2></div><div className="bg-white border border-gray-400 rounded-2xl p-8 w-full max-w-[400px] shadow-sm relative"><h3 className="text-center font-bold text-gray-900 text-lg mb-8">Non-Prized Subscriber</h3><div className="space-y-4"><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Total Bid Discount</span><span className="font-bold text-gray-900">₹13,500</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Less: Foreman fee</span><span className="font-bold text-gray-900">₹1,500</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Distributable Dividend</span><span className="font-bold text-green-600">₹12,000</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Eligible Members</span><span className="font-bold text-gray-900">29</span></div><div className="border-t border-dashed border-gray-300 my-6"></div><div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Dividend Per Member</span><span className="font-bold text-green-600 text-lg">₹413.79</span></div></div></div><div className="max-w-md text-[10px] text-gray-400 text-center leading-relaxed space-y-2 mt-4"><p>Dividend is distributed from the bid discount after deducting the foreman’s commission, as permitted under the Act.</p><p>The distributable dividend is equally credited to all eligible non-prized subscribers.</p><p>Dividend amount is adjusted against future monthly subscriptions as per the chit agreement.</p></div></div>);
            case 6: return <LogoAnimation />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg text-blue-500"><RotateCcw size={24} className="rotate-90" /></div><h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-2"><Card title="Collection Analytics" action={<a href="#" className="text-xs font-bold text-blue-600">view more</a>}><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><StatCard label="Monthly Collection" value="₹89,000" trend="8.5% Up from yesterday" /><StatCard label="Overdue Amount" value="₹13,000" trend="8.5% Up from yesterday" /><StatCard label="Defaulters" value="05" trend="8.5% Up from yesterday" /></div></Card></div><div className="md:col-span-1">{pendingPayout ? (<Card title="Pending Payout" className="bg-blue-50 border-blue-200 h-full"><div className="flex justify-between items-start"><div><p className="text-sm font-bold text-gray-800">{pendingPayout.winnerName}</p><p className="text-xs text-gray-500">Prize amount</p><p className="text-xl font-bold text-blue-600 mt-1">₹{pendingPayout.amount.toLocaleString()}</p></div><div className="text-right"><p className="text-xs text-gray-500">Auction #{pendingPayout.auctionNumber}</p><p className="text-sm font-bold text-red-500 mt-4">Due <span className="text-lg">3</span> Days</p></div></div><Button variant="outline" className="w-full mt-4" onClick={() => handleOpenPayout(pendingPayout)}>Process Payout</Button></Card>) : <Card className="h-full flex items-center justify-center text-gray-400">No pending payouts.</Card>}</div></div>
            
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
                        <td className="p-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => navigate(`/schemes/${id}/subscribers/${c.id}`)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Eye size={16} /></button><button className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Edit size={16} /></button><button className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><MessageSquare size={16} /></button></div></td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>


            <Modal isOpen={payoutModalOpen} onClose={resetPayoutModal} title="" maxWidth="max-w-7xl">
                <div className="min-h-[70vh] flex flex-col"><div className="flex-1 py-4">{renderPayoutStep()}</div><div className="flex justify-between items-center px-8 pt-4 border-t border-gray-100">{payoutStep < 6 ? (<><Button variant="outline" onClick={resetPayoutModal}>Disapprove & Close</Button><div className="flex items-center gap-4">{payoutStep > 1 && <Button variant="secondary" onClick={() => setPayoutStep(p => p - 1)}>Back</Button>}<Button onClick={handleNextStep} disabled={(payoutStep === 3 && payoutMode==='online' && !consentChecked)}>{ payoutStep === 3 && payoutMode === 'online' ? (otpSent ? "Sign & Continue" : "Get OTP & Sign") : "Next Step" } <ArrowRight size={16} className="ml-2"/></Button></div></>) : (<Button onClick={resetPayoutModal} className="mx-auto">Close Window</Button>)}</div></div>
            </Modal>
            <Modal isOpen={isFinalOtpModalOpen} onClose={() => setIsFinalOtpModalOpen(false)} title="Final Payout Verification (Offline)"><div className="space-y-4"><p className="text-sm text-gray-600">Enter transaction reference ID to release payment.</p><Input label="Enter Transaction ID" value={finalOtp} onChange={e => setFinalOtp(e.target.value)} /><Button onClick={handleFinalProxyVerification} className="w-full">Verify & Release Payment</Button></div></Modal>
        </div>
    );
};
