


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, ArrowRight, Loader2, ShieldCheck, User } from 'lucide-react';
// Fix: `requestsApi` is part of the `api` export.
import { api } from '../services/api';
import { Input, Button } from '../components/UI';

export const PublicJoinScheme: React.FC = () => {
    const { schemeId } = useParams();
    const navigate = useNavigate();
    
    const [scheme, setScheme] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [success, setSuccess] = useState(false);

    // Form State
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        occupation: '',
        income: '',
        pan: '',
        aadhaar: '',
        terms: false
    });

    const [files, setFiles] = useState<{ pan: File | null, aadhaar: File | null }>({
        pan: null,
        aadhaar: null
    });

    useEffect(() => {
        if (schemeId) {
            fetchSchemeDetails();
        }
    }, [schemeId]);

    const fetchSchemeDetails = async () => {
        try {
            const data = await api.getSchemeDetails(schemeId!);
            setScheme(data);
        } catch (e) {
            console.error("Failed to load scheme", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pan' | 'aadhaar') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
        }
    };

    const handleSubmit = async () => {
        if (!schemeId) return;
        if (!form.terms) return alert("Please accept the terms and conditions.");
        
        setSubmitting(true);
        try {
            // 1. Create Profile & Request
            // Fix: Use `api` instead of `requestsApi`.
            const subscriberId = await api.applyForScheme(schemeId, form);

            // 2. Upload Docs
            // Fix: Use `api` instead of `requestsApi`.
            if (files.pan) await api.uploadOnlineSubscriberDoc(subscriberId, schemeId, files.pan, 'pan_card');
            // Fix: Use `api` instead of `requestsApi`.
            if (files.aadhaar) await api.uploadOnlineSubscriberDoc(subscriberId, schemeId, files.aadhaar, 'aadhaar_card');

            setSuccess(true);
        } catch (e: any) {
            console.error("Join failed", e);
            alert("Application failed: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    if (!scheme) return <div className="text-center p-10">Scheme not found or invalid link.</div>;

    if (success) {
        return (
            <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Sent!</h1>
                    <p className="text-gray-600 mb-6">
                        You have successfully requested to join <strong>{scheme.name}</strong>. The foreman will verify your details and approve your request shortly.
                    </p>
                    <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">Return to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-white">
                    <h1 className="text-2xl font-bold mb-2">Join {scheme.name}</h1>
                    <div className="flex items-center gap-6 text-blue-100 text-sm">
                        <span>Value: ₹{scheme.chitValue.toLocaleString()}</span>
                        <span>•</span>
                        <span>Monthly: ₹{scheme.monthlyDue.toLocaleString()}</span>
                        <span>•</span>
                        <span>Duration: {scheme.duration} Mos</span>
                    </div>
                </div>

                <div className="p-8">
                    {/* Progress */}
                    <div className="flex items-center justify-center mb-8">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                        <div className={`w-16 h-1 bg-gray-200 ${step >= 2 ? 'bg-blue-600' : ''}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <User size={20} className="text-blue-500" /> Personal Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Full Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="As per Aadhaar" />
                                <Input label="Phone Number" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+91" />
                                <Input label="Email Address" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                                <Input label="Occupation" value={form.occupation} onChange={(e) => setForm({...form, occupation: e.target.value})} />
                                <Input label="Monthly Income" type="number" value={form.income} onChange={(e) => setForm({...form, income: e.target.value})} prefix="₹" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={() => {
                                    if(form.name && form.phone) setStep(2);
                                    else alert("Name and Phone are required");
                                }} className="px-8">
                                    Next <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <ShieldCheck size={20} className="text-blue-500" /> KYC Verification
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="PAN Number" value={form.pan} onChange={(e) => setForm({...form, pan: e.target.value.toUpperCase()})} />
                                <Input label="Aadhaar Number" value={form.aadhaar} onChange={(e) => setForm({...form, aadhaar: e.target.value})} />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'pan')} />
                                    <div className={`p-3 rounded-full ${files.pan ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {files.pan ? <CheckCircle size={24} /> : <Upload size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">{files.pan ? files.pan.name : "Upload PAN Card"}</p>
                                        <p className="text-xs text-gray-400">PDF, JPG or PNG (Max 5MB)</p>
                                    </div>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'aadhaar')} />
                                    <div className={`p-3 rounded-full ${files.aadhaar ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {files.aadhaar ? <CheckCircle size={24} /> : <Upload size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">{files.aadhaar ? files.aadhaar.name : "Upload Aadhaar Card"}</p>
                                        <p className="text-xs text-gray-400">Front & Back (Max 5MB)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={form.terms} onChange={(e) => setForm({...form, terms: e.target.checked})} className="mt-1 w-5 h-5 text-blue-600 rounded" />
                                    <span className="text-sm text-gray-600">I agree to the <span className="text-blue-600 underline">Terms & Conditions</span> and authorize the foreman to perform background checks for this application.</span>
                                </label>
                            </div>

                            <div className="flex justify-between pt-6 border-t border-gray-100 mt-6">
                                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={handleSubmit} isLoading={submitting} disabled={!form.terms}>
                                    Submit Application
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-gray-400 text-sm mt-8">Powered by TRUSTABLE</p>
        </div>
    );
};
