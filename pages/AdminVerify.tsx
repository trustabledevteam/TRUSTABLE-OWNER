

import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { CheckCircle, XCircle, FileText, ExternalLink, Loader2, RefreshCw, Users } from 'lucide-react';
import { Card, Button, Modal } from '../components/UI';
import { api, requestsApi } from '../services/api'; // Import requestsApi
import { JoinRequestCard } from '../components/JoinRequestCard'; // Import new component
import { AppSubscriber, SchemeJoinRequest } from '../types'; // Import types
import { SubscriberProfileView } from './SubscriberProfileView'; // Import SubscriberProfileView

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
    const [activeTab, setActiveTab] = useState<'company_verify' | 'join_requests'>('company_verify'); // New state for tabs
    const [companyVerificationRequests, setCompanyVerificationRequests] = useState<VerificationRequest[]>([]);
    const [pendingJoinRequests, setPendingJoinRequests] = useState<SchemeJoinRequest[]>([]); // New state for join requests
    const [loadingCompanyVerify, setLoadingCompanyVerify] = useState(true);
    const [loadingJoinRequests, setLoadingJoinRequests] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // For company verify
    const [joinRequestActionLoading, setJoinRequestActionLoading] = useState<string | null>(null); // For join requests

    // State for viewing subscriber profile in modal
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedSubscriberForReview, setSelectedSubscriberForReview] = useState<AppSubscriber | null>(null);

    const fetchCompanyVerificationRequests = async () => {
        setLoadingCompanyVerify(true);
        try {
            // Fetch profiles with 'SUBMITTED' status
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select(`
                    id, full_name, email, verification_status,
                    companies:company_id (company_name, cin_number)
                `)
                .eq('verification_status', 'SUBMITTED');

            if (error) throw error;

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

            setCompanyVerificationRequests(merged);
        } catch (error) {
            console.error("Error fetching company verification requests:", error);
            alert("Failed to load company verification requests.");
        } finally {
            setLoadingCompanyVerify(false);
        }
    };

    const fetchPendingJoinRequests = async () => {
        setLoadingJoinRequests(true);
        try {
            const data = await requestsApi.getPendingRequests();
            setPendingJoinRequests(data);
        } catch (error) {
            console.error("Error fetching pending join requests:", error);
            alert("Failed to load join requests.");
        } finally {
            setLoadingJoinRequests(false);
        }
    };

    useEffect(() => {
        fetchCompanyVerificationRequests();
        fetchPendingJoinRequests(); // Fetch join requests on mount
    }, []);

    const handleApproveCompany = async (id: string) => {
        setActionLoading(id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ verification_status: 'APPROVED' })
                .eq('id', id);
            
            if (error) throw error;
            setCompanyVerificationRequests(prev => prev.filter(r => r.id !== id));
            alert("Company Account Approved Successfully!");
        } catch (error) {
            console.error("Failed to approve company:", error);
            alert("Failed to approve company.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectCompany = async (id: string) => {
        if (!confirm("Are you sure you want to reject this company application?")) return;
        setActionLoading(id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ verification_status: 'REJECTED' })
                .eq('id', id);
            
            if (error) throw error;
            setCompanyVerificationRequests(prev => prev.filter(r => r.id !== id));
            alert("Company Account Rejected Successfully!");
        } catch (error) {
            console.error("Failed to reject company:", error);
            alert("Failed to reject company.");
        } finally {
            setActionLoading(null);
        }
    };

    const getFileUrl = (path: string) => {
        const { data } = supabase.storage.from('company-onboarding-doc').getPublicUrl(path);
        return data.publicUrl;
    };

    // --- Join Request Handlers ---
    const handleJoinRequestAction = async (id: string, action: 'ACCEPT' | 'DENY') => {
        setJoinRequestActionLoading(id);
        try {
            await requestsApi.processRequest(id, action);
            setPendingJoinRequests(prev => prev.filter(r => r.id !== id)); // Optimistic UI update
            alert(`Join request ${action === 'ACCEPT' ? 'accepted' : 'denied'} successfully!`);
        } catch (error) {
            console.error(`Error processing join request ${action}:`, error);
            alert(`Failed to ${action.toLowerCase()} join request.`);
        } finally {
            setJoinRequestActionLoading(null);
        }
    };

    const handleViewSubscriberProfile = (subscriber: AppSubscriber) => {
        setSelectedSubscriberForReview(subscriber);
        setIsProfileModalOpen(true);
    };

    const handleRefreshAll = () => {
        fetchCompanyVerificationRequests();
        fetchPendingJoinRequests();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Admin Verification Portal</h1>
                <Button variant="outline" onClick={handleRefreshAll} className="flex items-center gap-2">
                    <RefreshCw size={16} /> Refresh All
                </Button>
            </div>

            {/* Tabs for different verification types */}
            <div className="flex space-x-8 border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('company_verify')}
                    className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'company_verify' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Company Verification
                </button>
                <button 
                    onClick={() => setActiveTab('join_requests')}
                    className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'join_requests' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Users size={16} className="inline-block mr-2" /> Join Requests 
                    {pendingJoinRequests.length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {pendingJoinRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'company_verify' && (
                <>
                    {loadingCompanyVerify ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} role="status" /></div>
                    ) : companyVerificationRequests.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-gray-800">All Caught Up!</h3>
                            <p className="text-gray-500">No pending company verification requests.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {companyVerificationRequests.map(req => (
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

                                        <div className="flex items-start gap-3 flex-shrink-0">
                                            <Button 
                                                variant="danger" 
                                                onClick={() => handleRejectCompany(req.id)}
                                                disabled={actionLoading === req.id}
                                                aria-label={`Reject ${req.companies?.company_name || req.full_name}`}
                                            >
                                                {actionLoading === req.id && <Loader2 className="animate-spin mr-2" size={16} />}
                                                Reject
                                            </Button>
                                            <Button 
                                                onClick={() => handleApproveCompany(req.id)}
                                                disabled={actionLoading === req.id}
                                                className="bg-green-600 hover:bg-green-700"
                                                aria-label={`Approve ${req.companies?.company_name || req.full_name}`}
                                            >
                                                {actionLoading === req.id ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
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
                                                    aria-label={`View document: ${doc.document_type.replace('_', ' ')}`}
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
                </>
            )}

            {activeTab === 'join_requests' && (
                <>
                    {loadingJoinRequests ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} role="status" /></div>
                    ) : pendingJoinRequests.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-gray-800">All Caught Up!</h3>
                            <p className="text-gray-500">No pending join requests at the moment.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {pendingJoinRequests.map(req => (
                                <JoinRequestCard 
                                    key={req.id} 
                                    request={req} 
                                    onAction={handleJoinRequestAction}
                                    onViewProfile={handleViewSubscriberProfile} 
                                    isProcessing={joinRequestActionLoading === req.id}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal to show Subscriber Profile */}
            <Modal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)}
                title="Review Subscriber Profile"
                maxWidth="max-w-5xl"
            >
                {selectedSubscriberForReview && <SubscriberProfileView subscriber={selectedSubscriberForReview} />}
            </Modal>
        </div>
    );
};
