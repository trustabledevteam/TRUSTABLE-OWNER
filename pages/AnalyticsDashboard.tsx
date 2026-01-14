
import React, { useState } from 'react';
import { 
  LineChart as LineChartIcon, Users, Gavel, Wallet, 
  CreditCard, AlertTriangle, ArrowRight, TrendingUp, 
  TrendingDown, Activity, ChevronLeft 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Card } from '../components/UI';

// --- MOCK DATA FOR CHARTS ---

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const salesData = [
  { name: '2015', value1: 30, value2: 10 },
  { name: '2016', value1: 55, value2: 35 },
  { name: '2017', value1: 45, value2: 25 },
  { name: '2018', value1: 60, value2: 40 },
  { name: '2019', value1: 95, value2: 80 },
];

const subscriberStatusData = [
  { name: 'Active', value: 850 },
  { name: 'Late', value: 100 },
  { name: 'Default', value: 50 },
];

const schemeGrowthData = [
  { name: 'Jan', subscribers: 100 },
  { name: 'Feb', subscribers: 120 },
  { name: 'Mar', subscribers: 150 },
  { name: 'Apr', subscribers: 200 },
  { name: 'May', subscribers: 280 },
  { name: 'Jun', subscribers: 350 },
];

const auctionDiscountData = [
  { name: 'Auc 1', discount: 15 },
  { name: 'Auc 2', discount: 18 },
  { name: 'Auc 3', discount: 25 },
  { name: 'Auc 4', discount: 22 },
  { name: 'Auc 5', discount: 30 },
];

const bidTypeData = [
  { name: 'Gold Scheme', online: 40, proxy: 10 },
  { name: 'Silver Scheme', online: 30, proxy: 20 },
  { name: 'Platinum', online: 50, proxy: 5 },
];

const cashflowData = [
  { name: 'Jan', inflow: 500000, outflow: 400000 },
  { name: 'Feb', inflow: 550000, outflow: 420000 },
  { name: 'Mar', inflow: 600000, outflow: 580000 }, // Close gap
  { name: 'Apr', inflow: 700000, outflow: 500000 },
];

const collectionModeData = [
  { name: 'Online (UPI/Net)', value: 70 },
  { name: 'Offline (Cash)', value: 30 },
];

const defaultTrendData = [
  { name: 'Jan', defaults: 2 },
  { name: 'Feb', defaults: 3 },
  { name: 'Mar', defaults: 5 },
  { name: 'Apr', defaults: 4 },
];

// --- COMPONENT HELPERS ---

// Inner Metric Component matching the image style
const DashboardMetric = ({ label, value, trend, trendValue }: { label: string, value: string, trend: 'up' | 'down', trendValue: string }) => (
  <div className="bg-gray-50 rounded-xl p-5 flex flex-col justify-center h-full hover:bg-gray-100 transition-colors">
    <p className="text-xs text-gray-500 font-medium mb-3">{label}</p>
    <h3 className="text-2xl font-bold text-gray-900 mb-3">{value}</h3>
    <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
       <TrendingUp size={14} /> {trendValue}
    </div>
  </div>
);

// Updated MetricCard: White background with colored Top Border (Used in Detailed Views)
const MetricCard = ({ label, value, sub, borderColor }: any) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-t-4 ${borderColor}`}>
        <p className="text-gray-500 text-xs font-bold uppercase mb-2">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
);

const DetailHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className="flex items-center gap-4 mb-8">
    <button 
      onClick={onBack}
      className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
    >
      <ChevronLeft size={20} />
    </button>
    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
  </div>
);

// --- DETAILED VIEWS ---

const SubscribersAnalytics = ({ onBack }: { onBack: () => void }) => (
  <div className="animate-in fade-in slide-in-from-right-8 duration-300">
    <DetailHeader title="Subscribers & Schemes Analytics" onBack={onBack} />
    
    {/* Key Metrics Row */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <MetricCard label="Active Subscribers" value="850" sub="85% of total" borderColor="border-blue-500" />
      <MetricCard label="Late Payment" value="100" sub="10% of total" borderColor="border-orange-500" />
      <MetricCard label="Defaults" value="50" sub="5% of total" borderColor="border-red-500" />
      <MetricCard label="Scheme Fill Rate" value="92%" sub="High Demand" borderColor="border-green-500" />
    </div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card title="Subscriber Status Distribution">
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={subscriberStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {subscriberStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#22c55e', '#f59e0b', '#ef4444'][index % 3]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Subscriber Growth (Last 6 Months)">
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={schemeGrowthData}>
              <defs>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="subscribers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSub)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  </div>
);

const AuctionAnalytics = ({ onBack }: { onBack: () => void }) => (
  <div className="animate-in fade-in slide-in-from-right-8 duration-300">
    <DetailHeader title="Auction Analytics" onBack={onBack} />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
       <MetricCard label="Auctions Conducted" value="24" sub="This month" borderColor="border-purple-500" />
       <MetricCard label="Avg. Discount %" value="22.5%" sub="Slightly higher than market" borderColor="border-purple-500" />
       <MetricCard label="Unclaimed Prizes" value="2" sub="Requires follow-up" borderColor="border-purple-500" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card title="Discount Trend (Last 5 Auctions)">
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={auctionDiscountData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="discount" stroke="#8884d8" strokeWidth={3} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Bidding Mode: Proxy vs Online">
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bidTypeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Legend />
              <Bar dataKey="online" name="Online Bids" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="proxy" name="Proxy Bids" fill="#9333ea" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  </div>
);

const CashflowAnalytics = ({ onBack }: { onBack: () => void }) => (
  <div className="animate-in fade-in slide-in-from-right-8 duration-300">
    <DetailHeader title="Cashflow Analytics" onBack={onBack} />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
       <MetricCard label="Total Inflow (YTD)" value="₹45.2L" sub="Revenue" borderColor="border-green-500" />
       <MetricCard label="Total Outflow (Payouts)" value="₹38.1L" sub="Expenses" borderColor="border-red-500" />
       <MetricCard label="Liquidity Gap" value="+ ₹7.1L" sub="Healthy Reserve" borderColor="border-blue-500" />
    </div>

    <Card title="Cash Inflow vs Outflow Trend">
        <div className="h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflowData}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend verticalAlign="top" height={36}/>
              <Area type="monotone" dataKey="inflow" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
              <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
    </Card>
  </div>
);

const CollectionAnalytics = ({ onBack }: { onBack: () => void }) => (
  <div className="animate-in fade-in slide-in-from-right-8 duration-300">
    <DetailHeader title="Collection Analytics" onBack={onBack} />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card title="Monthly Collections vs Due">
                <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Jan', due: 100000, collected: 95000 },
                            { name: 'Feb', due: 120000, collected: 110000 },
                            { name: 'Mar', due: 115000, collected: 112000 },
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Legend />
                            <Bar dataKey="due" fill="#9ca3af" name="Total Due" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="collected" fill="#f97316" name="Collected" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <Card title="Payment Modes">
                <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={collectionModeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {collectionModeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#f97316'][index % 2]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    </div>

    <div className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
            <h3 className="font-bold text-orange-900">Top Defaulters (Action Required)</h3>
            <button className="text-xs bg-white border border-orange-200 text-orange-600 px-3 py-1 rounded-full">Send Notice All</button>
        </div>
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
                <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Amount Due</th>
                    <th className="p-4">Days Overdue</th>
                    <th className="p-4 text-center">Risk Level</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                    <td className="p-4 font-medium">Darrell Caldwell</td>
                    <td className="p-4 font-bold text-gray-800">₹25,000</td>
                    <td className="p-4">45 Days</td>
                    <td className="p-4 text-center"><span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">HIGH</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-4 font-medium">Rosie Pearson</td>
                    <td className="p-4 font-bold text-gray-800">₹5,000</td>
                    <td className="p-4">6 Days</td>
                    <td className="p-4 text-center"><span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs font-bold">MED</span></td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
);

const RiskAnalytics = ({ onBack }: { onBack: () => void }) => (
  <div className="animate-in fade-in slide-in-from-right-8 duration-300">
    <DetailHeader title="Risk & Default Analytics" onBack={onBack} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border-l-4 border-red-500 border-gray-100 border p-6 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-bold">Overall Default Rate</p>
                <h3 className="text-4xl font-bold text-red-600 mt-2">4.2%</h3>
                <p className="text-xs text-red-400 mt-1">+0.5% from last month</p>
            </div>
            <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={32} />
            </div>
        </div>
        <div className="bg-white border-l-4 border-green-500 border-gray-100 border p-6 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-bold">Recovery Success Rate</p>
                <h3 className="text-4xl font-bold text-gray-800 mt-2">78%</h3>
                <p className="text-xs text-green-500 mt-1">High Efficiency</p>
            </div>
            <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                <Activity size={32} />
            </div>
        </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Default Trend (Count)">
            <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={defaultTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="defaults" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card title="Risk Distribution: Prized vs Non-Prized">
             <div className="h-64 w-full min-w-0 flex items-center justify-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { name: 'Prized Subscriber Default', value: 80 }, // High risk
                                { name: 'Non-Prized Default', value: 20 }, // Low risk
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            <Cell fill="#ef4444" /> {/* Red for Prized (Dangerous) */}
                            <Cell fill="#fbbf24" /> {/* Yellow for Non-Prized */}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                 </ResponsiveContainer>
             </div>
             <p className="text-xs text-center text-gray-500 mt-2">
                 *Prized subscriber defaults pose higher financial risk.
             </p>
        </Card>
    </div>
  </div>
);

// --- MAIN DASHBOARD CONTAINER ---

export const AnalyticsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'subscribers' | 'auction' | 'cashflow' | 'collection' | 'risk'>('overview');

  if (activeView === 'subscribers') return <SubscribersAnalytics onBack={() => setActiveView('overview')} />;
  if (activeView === 'auction') return <AuctionAnalytics onBack={() => setActiveView('overview')} />;
  if (activeView === 'cashflow') return <CashflowAnalytics onBack={() => setActiveView('overview')} />;
  if (activeView === 'collection') return <CollectionAnalytics onBack={() => setActiveView('overview')} />;
  if (activeView === 'risk') return <RiskAnalytics onBack={() => setActiveView('overview')} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex items-center gap-2 mb-6">
          <div className="text-blue-500"><LineChartIcon size={24} /></div>
          <h1 className="text-2xl font-bold text-blue-500">Analytics Dashboard</h1>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
             
             {/* Top Row: Subscribers & Auction */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscribers Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-gray-800 text-sm">Subscribers & Schemes Analytics</h3>
                      <button onClick={() => setActiveView('subscribers')} className="text-xs text-gray-400 hover:text-blue-500">view more</button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <DashboardMetric label="Total Subscribers" value="1500" trend="up" trendValue="8.5% Up from yesterday" />
                      <DashboardMetric label="Total Schemes" value="60" trend="up" trendValue="8.5% Up from yesterday" />
                   </div>
                </div>

                {/* Auction Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-gray-800 text-sm">Auction Analytics</h3>
                      <button onClick={() => setActiveView('auction')} className="text-xs text-gray-400 hover:text-blue-500">view more</button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <DashboardMetric label="Auctions conducted" value="200" trend="up" trendValue="8.5% Up from yesterday" />
                      <DashboardMetric label="Total bids" value="1000" trend="up" trendValue="8.5% Up from yesterday" />
                   </div>
                </div>
             </div>

             {/* Middle Row: Sales Analytics Chart */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="mb-6">
                   <h3 className="font-bold text-blue-500 text-lg mb-1">Analytics</h3>
                   <p className="text-gray-500 text-sm font-medium">Sales Analytics</p>
                </div>
                <div className="h-64 w-full min-w-0">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                         <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                               <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                         <Tooltip />
                         <Area type="monotone" dataKey="value1" stroke="#3b82f6" strokeWidth={3} fill="url(#colorSales)" />
                         <Area type="monotone" dataKey="value2" stroke="#60a5fa" strokeWidth={3} strokeDasharray="5 5" fill="none" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Bottom Row: Collection Analytics */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-gray-800 text-sm">Collection Analytics</h3>
                   <button onClick={() => setActiveView('collection')} className="text-xs text-gray-400 hover:text-blue-500">view more</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <DashboardMetric label="Monthly Collection" value="₹89,000" trend="up" trendValue="8.5% Up from yesterday" />
                   <DashboardMetric label="Overdue Amount" value="₹13,000" trend="up" trendValue="8.5% Up from yesterday" />
                   <DashboardMetric label="Defaulters" value="05" trend="up" trendValue="8.5% Up from yesterday" />
                </div>
             </div>
          </div>

          {/* Right Column (1/3 width) - Cashflow */}
          <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="font-bold text-gray-800 text-sm">Cashflow analytics</h3>
                   <button onClick={() => setActiveView('cashflow')} className="text-xs text-gray-400 hover:text-blue-500">view more</button>
                </div>
                <div className="space-y-6">
                   <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-500 font-medium mb-2">Total Commission Earned</p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">₹89,000</h3>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                         <TrendingUp size={12} /> 8.5% Up from yesterday
                      </div>
                   </div>
                   <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-500 font-medium mb-2">Total Profits</p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">60%</h3>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                         <TrendingUp size={12} /> 8.5% Up from yesterday
                      </div>
                   </div>
                   <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-500 font-medium mb-2">Total Payouts</p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">₹89,000</h3>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                         <TrendingUp size={12} /> 8.5% Up from yesterday
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};
