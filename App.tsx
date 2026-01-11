
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Schemes } from './pages/Schemes';
import { SchemeDetails } from './pages/SchemeDetails';
import { SchemeSubscribers } from './pages/SchemeSubscribers';
import { SubscriberDetails } from './pages/SubscriberDetails';
import { Collections } from './pages/Collections';
import { Profile } from './pages/Profile';
import { Auctions } from './pages/Auctions';
import { AuctionSummary } from './pages/AuctionSummary';
import { LiveAuction } from './pages/LiveAuction';
import { Search } from './pages/Search';
import { SubscriberProfileView } from './pages/SubscriberProfileView';
import { Applications } from './pages/Applications';
import { Documents } from './pages/Documents';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { Messages } from './pages/Messages';
import { Register } from './pages/Register';
import { LandingPage } from './pages/LandingPage';
import { Notifications } from './pages/Notifications';
import { Leads } from './pages/Leads';
import { AdminVerify } from './pages/AdminVerify';
import { X, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './services/supabaseClient';

const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 text-center text-gray-500">
    <h2 className="text-2xl font-bold text-gray-300 mb-2">{title}</h2>
    <p>This module is under development.</p>
  </div>
);

const AuthLogin = () => {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading } = useAuth(); // Get auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if session exists (handles both successful login and already logged-in users)
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else if (!data.session) {
            // Handle cases where login doesn't return a session but no error (e.g., email confirmation needed)
            setError("Login failed. Please check your credentials or confirm your email.");
            setLoading(false);
        }
        // On success, the useEffect hook will handle navigation when the session state updates.
    } catch (e) {
        setError("Network error.");
        setLoading(false);
    }
  };

  // Show a loader while the AuthProvider is checking for an existing session
  if (isAuthLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8"/></div>;
  }

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="text-center mb-8 mt-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TRUSTABLE</h1>
          <p className="text-gray-500">Login to your account</p>
        </div>
        <div className="space-y-4">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm border border-red-100">{error}</div>}
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
             <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="admin@trustable.com" 
             />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
             <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="••••••••" 
             />
          </div>
          <button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg shadow-blue-200"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Sign In
          </button>

          <div className="text-center text-sm text-gray-500 mt-4 space-y-2">
            <div><a href="#" className="hover:underline">Forgot Password?</a></div>
            <div className="pt-2 border-t border-gray-100 mt-4">
                Don't have an account? <button onClick={() => navigate('/register')} className="text-blue-600 font-bold hover:underline">Create Account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VerificationBanner = () => {
    const { profile, isLoading } = useAuth();
    
    // This banner should only show if we have a loaded profile and its status is not 'APPROVED'.
    // Return null if:
    // 1. Auth state is still loading.
    // 2. Profile data is not available.
    // 3. Profile status is 'APPROVED'.
    if (isLoading || !profile || profile.verification_status === 'APPROVED') {
        return null;
    }

    return (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={20} />
                <div>
                    <p className="text-sm font-bold text-yellow-800">Account Pending Verification</p>
                    <p className="text-xs text-yellow-700">
                        {profile?.verification_status === 'SUBMITTED' 
                            ? 'Your documents have been submitted and are under review. You have read-only access.' 
                            : 'Please complete your company registration to activate full features.'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full">
                <Lock size={12} /> READ ONLY MODE
            </div>
        </div>
    );
}

const ProtectedRoute = () => {
    const { session, isLoading } = useAuth();

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8"/></div>;
    
    if (!session) {
        return <Navigate to="/login" />;
    }

    return (
        <Layout>
            <VerificationBanner />
            <Outlet />
        </Layout>
    );
};

const App = () => {
  return (
    <AuthProvider>
        <HashRouter>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthLogin />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<Notifications />} />
                
                <Route path="subscribers" element={<SchemeSubscribers />} />
                <Route path="auctions" element={<Auctions />} />
                <Route path="auctions/:id" element={<AuctionSummary />} />
                <Route path="collections" element={<Collections />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="documents" element={<Documents />} />
                <Route path="leads" element={<Leads />} />
                
                <Route path="schemes" element={<Schemes />} />
                <Route path="schemes/:id" element={<SchemeDetails />} />
                <Route path="schemes/:id/subscribers" element={<SchemeSubscribers />} />
                <Route path="schemes/:id/subscribers/:subscriberId" element={<SubscriberDetails />} />
                <Route path="schemes/:id/auctions" element={<Auctions />} />
                <Route path="schemes/:id/auctions/live/watch" element={<LiveAuction />} />
                <Route path="schemes/:id/collections" element={<Collections />} />
                <Route path="schemes/:id/documents" element={<Documents />} />

                <Route path="reports" element={<Reports />} />
                <Route path="compliance" element={<Placeholder title="Compliance" />} />
                <Route path="admin/verify" element={<AdminVerify />} />
                
                <Route path="search" element={<Search />} />
                <Route path="search/profile/:id" element={<SubscriberProfileView />} />
                
                <Route path="applications" element={<Applications />} />
                <Route path="settings" element={<Settings />} />
                <Route path="messages" element={<Messages />} />
                
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Route>
        </Routes>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;