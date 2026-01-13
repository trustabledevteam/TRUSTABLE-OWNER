
import React from 'react';
import { Check, X, MapPin, Briefcase, Info, Loader2 } from 'lucide-react';
import { SchemeJoinRequest, AppSubscriber } from '../types'; // Import types

interface JoinRequestCardProps {
  request: SchemeJoinRequest;
  onAction: (id: string, action: 'ACCEPT' | 'DENY') => void;
  onViewProfile: (subscriber: AppSubscriber) => void;
  isProcessing?: boolean; // New prop for loading state
}

export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({ request, onAction, onViewProfile, isProcessing }) => {
  const sub = request.app_subscribers;
  const scheme = request.schemes;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 cursor-pointer w-full sm:w-auto" onClick={() => onViewProfile(sub)}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
            <img 
            src={sub.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.full_name)}&background=random`} 
            alt={sub.full_name}
            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" 
            />
            {/* Assuming green means online/available, not part of request status */}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" aria-label="Online"></div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{sub.full_name}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
            {sub.occupation && (
                <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                <Briefcase size={12} /> {sub.occupation}
                </span>
            )}
            {sub.city && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={12} /> {sub.city}
                </span>
            )}
          </div>
          <p className="text-xs mt-2 text-gray-500">
            Wants to join: <span className="text-blue-700 font-bold">{scheme.name}</span> 
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase">{scheme.chit_id}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-end">
        {/* View Details Button */}
        <button 
          onClick={() => onViewProfile(sub)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="View full KYC & Employment"
          aria-label="View subscriber profile"
          disabled={isProcessing}
        >
          <Info size={20} />
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2 border-l pl-4 border-gray-100">
            <button 
                onClick={() => onAction(request.id, 'ACCEPT')}
                className="flex flex-col items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Accept request"
                aria-label="Accept join request"
                disabled={isProcessing}
            >
                <div className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center group-hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    {isProcessing ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
                </div>
                <span className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-tighter">Accept</span>
            </button>

            <button 
                onClick={() => onAction(request.id, 'DENY')}
                className="flex flex-col items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Deny request"
                aria-label="Deny join request"
                disabled={isProcessing}
            >
                <div className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
                    {isProcessing ? <Loader2 size={22} className="animate-spin" /> : <X size={22} />}
                </div>
                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Deny</span>
            </button>
        </div>
      </div>
    </div>
  );
};
