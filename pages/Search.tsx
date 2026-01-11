import React, { useState } from 'react';
import { Search as SearchIcon, X, SlidersHorizontal, MapPin, Briefcase, IndianRupee } from 'lucide-react';
import { Card, Modal, Button } from '../components/UI';
import { useNavigate } from 'react-router-dom';

interface UserResult {
  id: string;
  name: string;
  avatarUrl?: string;
  details: string;
  type: 'salary' | 'job' | 'location'; // To style the detail text color
}

const mockUsersData: UserResult[] = [
  { id: '1', name: 'Joseph kuruvila V', avatarUrl: 'https://picsum.photos/seed/1/100/100', details: '₹500000', type: 'salary' },
  { id: '2', name: 'Ragavan S', avatarUrl: 'https://picsum.photos/seed/ragavan/100/100', details: 'Software Developer', type: 'job' },
  { id: '3', name: 'Jayaprakash S', avatarUrl: 'https://picsum.photos/seed/3/100/100', details: 'Kubakonam', type: 'location' },
  { id: '4', name: 'Anitha R', avatarUrl: 'https://picsum.photos/seed/4/100/100', details: 'Teacher', type: 'job' },
  { id: '5', name: 'Karthik M', avatarUrl: 'https://picsum.photos/seed/5/100/100', details: 'Chennai', type: 'location' },
];

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserResult[]>(mockUsersData);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    job: '',
    salaryMin: '',
    salaryMax: ''
  });

  const handleRemoveUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-500 flex items-center gap-2">
        <SearchIcon size={24} /> Search for subscribers
      </h1>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-12 py-3 border border-blue-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
          placeholder="Search Subscribers"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
           <button 
             onClick={() => setIsFilterOpen(true)}
             className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
           >
             <SlidersHorizontal size={20} />
           </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-1">
        {filteredUsers.length > 0 ? filteredUsers.map((user) => (
          <div 
            key={user.id} 
            className="group flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-100 animate-in fade-in slide-in-from-bottom-1 duration-200"
            onClick={() => navigate(`/search/profile/${user.id}`)}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                 <img 
                   src={user.avatarUrl} 
                   alt={user.name} 
                   className="h-12 w-12 rounded-full object-cover border border-gray-200"
                 />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{user.name}</h3>
                <p className={`text-sm font-medium ${
                  user.type === 'salary' ? 'text-blue-500' : 
                  user.type === 'job' ? 'text-blue-500' : 'text-blue-500'
                }`}>
                  {user.details}
                </p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveUser(user.id);
              }}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
              title="Remove from list"
            >
              <X size={20} />
            </button>
          </div>
        )) : (
            <div className="text-center py-8 text-gray-500">No results found.</div>
        )}
      </div>

      {/* Filter Modal */}
      <Modal 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
        title="Filter Subscribers"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
           <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                 <MapPin size={16} className="text-blue-500" /> Location
              </label>
              <input 
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="e.g. Chennai, Bangalore"
              />
           </div>

           <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                 <Briefcase size={16} className="text-blue-500" /> Job Title
              </label>
              <input 
                value={filters.job}
                onChange={(e) => setFilters({...filters, job: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="e.g. Software Engineer"
              />
           </div>

           <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                 <IndianRupee size={16} className="text-blue-500" /> Monthly Salary Range
              </label>
              <div className="flex gap-4">
                 <input 
                   value={filters.salaryMin}
                   onChange={(e) => setFilters({...filters, salaryMin: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                   placeholder="Min"
                   type="number"
                 />
                 <input 
                   value={filters.salaryMax}
                   onChange={(e) => setFilters({...filters, salaryMax: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                   placeholder="Max"
                   type="number"
                 />
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setFilters({ location: '', job: '', salaryMin: '', salaryMax: '' });
                setIsFilterOpen(false);
              }}>
                Reset
              </Button>
              <Button onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};