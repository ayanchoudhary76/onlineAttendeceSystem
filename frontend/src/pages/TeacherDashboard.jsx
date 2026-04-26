import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

import TeacherSchedule from './teacher/TeacherSchedule';
import TeacherAttendance from './teacher/TeacherAttendance';
import TeacherLeave from './teacher/TeacherLeave';

const TeacherDashboard = () => {
  const location = useLocation();

  const tabs = [
    { name: 'Schedule', path: '/teacher/schedule', icon: '📅' },
    { name: 'Attendance', path: '/teacher/attendance', icon: '📊' },
    { name: 'Leave', path: '/teacher/leave', icon: '✉️' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col space-y-2">
        <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Teacher Dashboard</h1>
        {tabs.map(tab => (
          <Link
            key={tab.name}
            to={tab.path}
            className={`p-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              location.pathname.startsWith(tab.path)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-blue-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/teacher/schedule" replace />} />
          <Route path="schedule" element={<TeacherSchedule />} />
          <Route path="session/:id" element={<TeacherSchedule />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="leave" element={<TeacherLeave />} />
        </Routes>
      </div>
    </div>
  );
};

export default TeacherDashboard;
