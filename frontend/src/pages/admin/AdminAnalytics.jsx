import React, { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAnalytics } from '../../hooks/useAnalytics';
import DataTable from '../../components/ui/DataTable';
import Skeleton from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';

const getBarColor = (pct) => {
  if (pct >= 75) return '#22c55e';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
};

const ChartSkeleton = () => (
  <div className="flex items-end gap-3 h-[260px] px-4 pt-4">
    {[70, 45, 90, 55, 80, 35].map((h, i) => (
      <Skeleton key={i} width="100%" height={`${h}%`} className="flex-1" />
    ))}
  </div>
);

const TableRowSkeleton = () => (
  <div className="flex gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
    <Skeleton height="1rem" width="25%" />
    <Skeleton height="1rem" width="20%" />
    <Skeleton height="1rem" width="30%" />
    <Skeleton height="1rem" width="15%" />
  </div>
);

const AdminAnalytics = () => {
  const { data, loading, error, refetch } = useAnalytics();

  useEffect(() => { document.title = 'Analytics — SmartAttend'; }, []);

  const lowAttendanceColumns = [
    { header: 'Student Name', accessor: 'studentName' },
    { header: 'Section', accessor: 'sectionName' },
    { header: 'Subject', accessor: 'subjectName' },
    { header: 'Percentage', accessor: 'percentageBadge' }
  ];

  const teacherColumns = [
    { header: 'Teacher Name', accessor: 'teacherName' },
    { header: 'Sections', accessor: 'sectionsAssigned' },
    { header: 'Sessions', accessor: 'totalSessions' },
    { header: 'Avg Attendance', accessor: 'avgPercentageBadge' }
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400">System-wide attendance and activity reports.</p>
        </div>
        {/* Summary card skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
              <Skeleton width="3rem" height="3rem" className="rounded-full flex-shrink-0" />
              <div className="flex-grow space-y-2">
                <Skeleton height="0.75rem" width="60%" />
                <Skeleton height="1.5rem" width="40%" />
              </div>
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <Skeleton height="1rem" width="40%" className="mb-4" />
          <ChartSkeleton />
        </div>
        {/* Table skeletons */}
        {[1,2].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <Skeleton height="1rem" width="35%" className="mb-4" />
            <TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
        <p className="text-red-600 dark:text-red-400">Failed to load analytics: {error}</p>
        <Button variant="secondary" onClick={refetch}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, sectionStats, lowAttendance, teacherActivity } = data;

  const lowAttendanceData = lowAttendance.map(row => ({ ...row, percentageBadge: `${row.percentage}%` }));
  const teacherData = teacherActivity.map(row => ({ ...row, avgPercentageBadge: `${row.avgPercentage}%` }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400">System-wide attendance and activity reports.</p>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xl">🎓</div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalStudents}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xl">👨‍🏫</div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Teachers</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalTeachers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xl">📊</div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Overall Attendance</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.overallPercentage}%</p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Section-wise Attendance</h3>
        {sectionStats.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No section data available yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectionStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="sectionName" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                formatter={(value) => [`${value}%`, 'Attendance']}
              />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {sectionStats.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Low Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Low Attendance Students <span className="text-sm font-normal text-gray-400">(below 75%)</span>
        </h3>
        <DataTable
          columns={lowAttendanceColumns}
          data={lowAttendanceData}
          emptyMessage="All students are above 75% attendance. 🎉"
        />
      </div>

      {/* Teacher Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Teacher Activity</h3>
        <DataTable
          columns={teacherColumns}
          data={teacherData}
          emptyMessage="No teacher session data recorded yet."
        />
      </div>
    </div>
  );
};

export default AdminAnalytics;
