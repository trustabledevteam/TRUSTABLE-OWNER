import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Gavel, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Grid,
  ShieldCheck,
  FileBox,
  MessageSquare,
  Package,
  MoreHorizontal,
  LineChart,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children?: React.ReactNode;
}

const SidebarItem = ({ icon: Icon, label, to, isActive }: { icon: any, label: string, to: string, isActive: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-50 text-blue-600 font-medium' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
    <span>{label}</span>
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight">TRUSTABLE</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Home" to="/dashboard" isActive={location.pathname === '/dashboard'} />
          <SidebarItem icon={Grid} label="My Schemes" to="/schemes" isActive={location.pathname.startsWith('/schemes')} />
          <SidebarItem icon={Users} label="Manage Subscribers" to="/subscribers" isActive={location.pathname.startsWith('/subscribers')} />
          <SidebarItem icon={UserPlus} label="Leads & Enquiries" to="/leads" isActive={location.pathname.startsWith('/leads')} />
          <SidebarItem icon={Gavel} label="Manage Auctions" to="/auctions" isActive={location.pathname.startsWith('/auctions')} />
          <SidebarItem icon={CreditCard} label="Collection & Payouts" to="/collections" isActive={location.pathname.startsWith('/collections')} />
          <SidebarItem icon={LineChart} label="Analytics Dashboard" to="/analytics" isActive={location.pathname === '/analytics'} />
          <SidebarItem icon={FileBox} label="Documents" to="/documents" isActive={location.pathname === '/documents'} />
          <SidebarItem icon={FileText} label="Reports" to="/reports" isActive={location.pathname === '/reports'} />
          <SidebarItem icon={ShieldCheck} label="Compliance" to="/compliance" isActive={location.pathname === '/compliance'} />
          {profile?.role === 'ADMIN' && (
            <SidebarItem icon={UserCheck} label="Admin Verification" to="/admin/verify" isActive={location.pathname === '/admin/verify'} />
          )}
          <SidebarItem icon={Search} label="Search" to="/search" isActive={location.pathname === '/search'} />
          <SidebarItem icon={Settings} label="Settings" to="/settings" isActive={location.pathname === '/settings'} />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => {
                // Handle logout logic here if needed
                window.location.href = '/'; 
            }}
            className="flex items-center space-x-3 px-4 py-3 w-full text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center md:hidden">
             {/* Mobile menu trigger would go here */}
             <span className="font-bold text-blue-600">TRUSTABLE</span>
          </div>
          
          <div className="flex-1 px-8 hidden md:block">
            {/* Page Title Removed as requested */}
          </div>

          <div className="flex items-center space-x-4">
            <button 
              className={`p-2 rounded-full transition-colors ${location.pathname === '/messages' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              title="Messages"
              onClick={() => navigate('/messages')}
            >
              <MessageSquare size={20} />
            </button>
            
            <button 
              className={`p-2 rounded-full transition-colors ${location.pathname === '/applications' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              title="Applications"
              onClick={() => navigate('/applications')}
            >
              <Package size={20} />
            </button>
            
            <div className="relative">
              <button 
                className={`p-2 rounded-full transition-colors relative ${location.pathname === '/notifications' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                onClick={() => navigate('/notifications')}
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>

            <div 
              className="flex items-center space-x-3 pl-4 border-l border-gray-200 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => navigate('/profile')}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">Moni Roy</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <img 
                src="https://picsum.photos/40/40" 
                alt="User" 
                className="h-10 w-10 rounded-full border border-gray-200"
              />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};