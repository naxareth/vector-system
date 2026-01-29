'use client';
import { useState } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  walletAddress: string;
  enrollmentDate: string;
  cvrStatus: 'uploaded' | 'not-uploaded' | 'pending';
  credentialsCount: number;
  lastLogin: string;
}

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cvrFilter, setCvrFilter] = useState<string>('all');

  // Mock data - replace with actual API call
  const [students] = useState<Student[]>([
    {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@university.edu',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      enrollmentDate: '2024-09-01',
      cvrStatus: 'uploaded',
      credentialsCount: 5,
      lastLogin: '2026-01-27',
    },
    {
      id: '2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@university.edu',
      walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      enrollmentDate: '2024-09-01',
      cvrStatus: 'uploaded',
      credentialsCount: 4,
      lastLogin: '2026-01-28',
    },
    {
      id: '3',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@university.edu',
      walletAddress: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
      enrollmentDate: '2024-09-01',
      cvrStatus: 'not-uploaded',
      credentialsCount: 0,
      lastLogin: '2026-01-25',
    },
    {
      id: '4',
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@university.edu',
      walletAddress: '0x5A86858aA3b595FD6663c2296741eF4cd8BC4d01',
      enrollmentDate: '2025-01-15',
      cvrStatus: 'uploaded',
      credentialsCount: 3,
      lastLogin: '2026-01-28',
    },
    {
      id: '5',
      firstName: 'Robert',
      lastName: 'Martinez',
      email: 'robert.martinez@university.edu',
      walletAddress: '0x9C1B8E2b8C31E1cD7C19e7d8F0A7B2D5E3C4A1B6',
      enrollmentDate: '2025-01-15',
      cvrStatus: 'pending',
      credentialsCount: 1,
      lastLogin: '2026-01-26',
    },
    {
      id: '6',
      firstName: 'Jessica',
      lastName: 'Taylor',
      email: 'jessica.taylor@university.edu',
      walletAddress: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B',
      enrollmentDate: '2025-08-20',
      cvrStatus: 'not-uploaded',
      credentialsCount: 0,
      lastLogin: '2026-01-20',
    },
  ]);

  // Filter students based on search and CVR status
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.walletAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCvrFilter = cvrFilter === 'all' || student.cvrStatus === cvrFilter;
    
    return matchesSearch && matchesCvrFilter;
  });

  const getCvrStatusBadge = (status: string) => {
    const styles = {
      uploaded: 'bg-green-100 text-green-700 border-green-200',
      'not-uploaded': 'bg-gray-100 text-gray-700 border-gray-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    
    const labels = {
      uploaded: 'CVR Uploaded',
      'not-uploaded': 'No CVR',
      pending: 'CVR Pending',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <RegistrarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Students</h1>
          <p className="text-sm md:text-base text-gray-600">View all registered students and their CVR status</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
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
                  placeholder="Search by name, email, or wallet address..."
                />
              </div>
            </div>

            {/* CVR Status Filter */}
            <div>
              <label htmlFor="cvr-status" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by CVR Status
              </label>
              <select
                id="cvr-status"
                value={cvrFilter}
                onChange={(e) => setCvrFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium"
              >
                <option value="all">All Students</option>
                <option value="uploaded">CVR Uploaded</option>
                <option value="pending">CVR Pending</option>
                <option value="not-uploaded">No CVR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{students.length}</span> students
          </p>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Enrollment Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    CVR Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Credentials
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600 font-mono">{student.walletAddress.slice(0, 10)}...{student.walletAddress.slice(-8)}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{new Date(student.enrollmentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getCvrStatusBadge(student.cvrStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{student.credentialsCount}</span>
                          <span className="text-xs text-gray-500">issued</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{new Date(student.lastLogin).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-purple-600 hover:text-purple-800 font-medium">
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">No students found</p>
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
