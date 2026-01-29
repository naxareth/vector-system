'use client';
import { useState } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';

interface Credential {
  id: string;
  studentName: string;
  walletAddress: string;
  credentialType: string;
  courseCode: string;
  issuanceDate: string;
  status: 'active' | 'revoked' | 'pending';
  tokenId: string;
}

type SortField = 'studentName' | 'credentialType' | 'issuanceDate' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ManageCredentials() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('issuanceDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock data - replace with actual API call
  const [credentials] = useState<Credential[]>([
    {
      id: '1',
      studentName: 'John Smith',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      credentialType: 'Machine Learning',
      courseCode: 'CS401',
      issuanceDate: '2025-12-15',
      status: 'active',
      tokenId: '1155',
    },
    {
      id: '2',
      studentName: 'Sarah Johnson',
      walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      credentialType: 'Web Development',
      courseCode: 'CS302',
      issuanceDate: '2025-11-20',
      status: 'active',
      tokenId: '1156',
    },
    {
      id: '3',
      studentName: 'Michael Chen',
      walletAddress: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
      credentialType: 'Data Science',
      courseCode: 'DS201',
      issuanceDate: '2025-10-05',
      status: 'revoked',
      tokenId: '1157',
    },
    {
      id: '4',
      studentName: 'Emily Davis',
      walletAddress: '0x5A86858aA3b595FD6663c2296741eF4cd8BC4d01',
      credentialType: 'Cybersecurity',
      courseCode: 'CS501',
      issuanceDate: '2026-01-10',
      status: 'active',
      tokenId: '1158',
    },
    {
      id: '5',
      studentName: 'Robert Martinez',
      walletAddress: '0x9C1B8E2b8C31E1cD7C19e7d8F0A7B2D5E3C4A1B6',
      credentialType: 'Cloud Computing',
      courseCode: 'CS405',
      issuanceDate: '2025-09-18',
      status: 'pending',
      tokenId: '1159',
    },
  ]);

  // Filter credentials based on search and status
  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = 
      cred.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.credentialType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || cred.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort credentials
  const sortedCredentials = [...filteredCredentials].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'studentName':
        comparison = a.studentName.localeCompare(b.studentName);
        break;
      case 'credentialType':
        comparison = a.credentialType.localeCompare(b.credentialType);
        break;
      case 'issuanceDate':
        comparison = new Date(a.issuanceDate).getTime() - new Date(b.issuanceDate).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700 border-green-200',
      revoked: 'bg-red-100 text-red-700 border-red-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <RegistrarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Manage Credentials</h1>
          <p className="text-sm md:text-base text-gray-600">View and manage all issued student credentials</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Credentials
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="Search by name, wallet, credential type, or course code..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{sortedCredentials.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{credentials.length}</span> credentials
          </p>
        </div>

        {/* Credentials Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('studentName')}
                  >
                    <div className="flex items-center gap-2">
                      Student Name
                      <svg className={`w-4 h-4 ${sortField === 'studentName' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('credentialType')}
                  >
                    <div className="flex items-center gap-2">
                      Credential Type
                      <svg className={`w-4 h-4 ${sortField === 'credentialType' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Course Code
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('issuanceDate')}
                  >
                    <div className="flex items-center gap-2">
                      Issuance Date
                      <svg className={`w-4 h-4 ${sortField === 'issuanceDate' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <svg className={`w-4 h-4 ${sortField === 'status' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCredentials.length > 0 ? (
                  sortedCredentials.map((credential) => (
                    <tr key={credential.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {credential.studentName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{credential.studentName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600 font-mono">{credential.walletAddress.slice(0, 10)}...{credential.walletAddress.slice(-8)}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 font-medium">{credential.credentialType}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 font-medium">{credential.courseCode}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{new Date(credential.issuanceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(credential.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button className="text-purple-600 hover:text-purple-800 font-medium">
                            View
                          </button>
                          {credential.status === 'active' && (
                            <button className="text-red-600 hover:text-red-800 font-medium">
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No credentials found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RegistrarLayout>
  );
}
