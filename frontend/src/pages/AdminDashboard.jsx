import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

import AdminStructure from './admin/AdminStructure';
import AdminTimetable from './admin/AdminTimetable';
import AdminLeaves from './admin/AdminLeaves';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminUsers from './admin/AdminUsers';

const AdminDashboard = () => {
  const location = useLocation();

  const tabs = [
    { name: 'Structure', path: '/admin/structure' },
    { name: 'Timetable', path: '/admin/timetable' },
    { name: 'Leaves', path: '/admin/leaves' },
    { name: 'Analytics', path: '/admin/analytics' },
    { name: 'Users', path: '/admin/users' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex flex-col space-y-2">
        <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>
        {tabs.map(tab => (
          <Link
            key={tab.name}
            to={tab.path}
            className={`p-3 rounded-lg font-medium transition-colors ${
              location.pathname.startsWith(tab.path)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            {tab.name}
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<div className="p-4 bg-white rounded shadow text-gray-500">Select a module from the left menu.</div>} />
          <Route path="structure" element={<AdminStructure />} />
          <Route path="timetable" element={<AdminTimetable />} />
          <Route path="leaves" element={<AdminLeaves />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;
