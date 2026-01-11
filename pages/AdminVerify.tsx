import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { CheckCircle, XCircle, FileText, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Card, Button } from '../components/UI';

interface VerificationRequest {
    id: string;
    full_name: string;
    email: string;
    verification_status: string;
    companies: {
        company_name: string;
        cin_number: string;
    };
    docs: {
        id: string;
        document_type: string;
        file_path: string;
    }[];
}

export const AdminVerify: React.FC = () => {
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        // Fetch profiles with 'SUBMITTED' status
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select(`
                id, full_name, email, verification_status,
                companies:company_id (company_name, cin_number)
            `)
            .eq('verification_status', 'SUBMITTED');

        if (error) {
            console.error(error);
            setLoading(false);
            return;
        }

        // Fetch documents for these profiles
        const profileIds = profiles.map(p => p.id);
        const { data: documents } = await supabase
            .from('documents')
            .select('*')
            .in('owner_id', profileIds);

        const merged: VerificationRequest[] = profiles.map((p: any) => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            verification_status: p.verification_status,
            // Handle array result from join if company_id is unique
            companies: Array.isArray(p.companies) ? p.companies[0] : p.companies,
            docs: documents?.filter(d => d.owner_id === p.id) || []
        }));

        setRequests(merged);
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        const { error } = await supabase
            .from('profiles')
            .update({ verification_status: 'APPROVED' })
            .eq('id', id);
        
        if (!error) {
            setRequests(prev => prev.filter(r => r.id !== id));
            alert("Account Approved Successfully!");
        } else {
            alert("Failed to approve");
        }
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!confirm("Are you sure you want to reject this application?")) return;
        setActionLoading(id);
        const { error } = await supabase
            .from('profiles')
            .update({ verification_status: 'REJECTED' })
            .eq('id', id);
        
        if (!error) {
            setRequests(prev => prev.filter(r => r.id !== id));
        }
        setActionLoading(null);
    };

    const getFileUrl = (path: string) => {
        const { data } = supabase.storage.from('company-onboarding-doc').getPublicUrl(path);
        return data.publicUrl;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Admin Verification Portal</h1>
                <Button variant="outline" onClick={fetchRequests} className="flex items-center gap-2">
                    <RefreshCw size={16} /> Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-gray-800">All Caught Up!</h3>
                    <p className="text-gray-500">No pending verification requests.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map(req => (
                        <Card key={req.id} className="border-l-4 border-l-blue-500">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-900">{req.companies?.company_name || 'Unregistered Company'}</h3>
                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">SUBMITTED</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Owner: <span className="font-medium">{req.full_name}</span> ({req.email})</p>
                                    <p className="text-sm text-gray-600">CIN: <span className="font-mono bg-gray-100 px-1 rounded">{req.companies?.cin_number}</span></p>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Button 
                                        variant="danger" 
                                        onClick={() => handleReject(req.id)}
                                        disabled={actionLoading === req.id}
                                    >
                                        Reject
                                    </Button>
                                    <Button 
                                        onClick={() => handleApprove(req.id)}
                                        disabled={actionLoading === req.id}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {actionLoading === req.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                                        Approve
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Submitted Documents</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {req.docs.length > 0 ? req.docs.map(doc => (
                                        <a 
                                            key={doc.id} 
                                            href={getFileUrl(doc.file_path)} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                                        >
                                            <FileText size={20} className="text-gray-400 group-hover:text-blue-500" />
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-medium text-gray-700 truncate capitalize">{doc.document_type.replace('_', ' ')}</p>
                                                <p className="text-[10px] text-blue-500 flex items-center gap-1">View <ExternalLink size={10} /></p>
                                            </div>
                                        </a>
                                    )) : (
                                        <p className="text-sm text-red-400 italic">No documents uploaded.</p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};