import React, { useState, useMemo, useEffect } from 'react';
import { useAttendanceSummary } from '../../hooks/useAttendanceSummary';
import { useAttendanceHistory } from '../../hooks/useAttendanceHistory';

const getPercentageBadge = (pct) => {
  if (pct >= 75) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (pct >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
};

const getPercentageRing = (pct) => {
  if (pct >= 75) return 'text-green-500';
  if (pct >= 60) return 'text-amber-500';
  return 'text-red-500';
};

const StudentAttendance = () => {
  const { data: summary, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAttendanceSummary();
  const { data: history, loading: historyLoading } = useAttendanceHistory();

  useEffect(() => { document.title = 'My Attendance — SmartAttend'; }, []);

  const [expandedSubject, setExpandedSubject] = useState(null);

  // Group history by subject name for the collapsible lists
  const historyBySubject = useMemo(() => {
    const map = {};
    (history || []).forEach(record => {
      const subjectName = record.sessionId?.subjectId?.name || 'Unknown';
      if (!map[subjectName]) map[subjectName] = [];
      map[subjectName].push(record);
    });
    return map;
  }, [history]);

  const toggleExpand = (subjectName) => {
    setExpandedSubject(prev => prev === subjectName ? null : subjectName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Attendance</h2>
          <p className="text-gray-500 dark:text-gray-400">Subject-wise attendance overview and session history.</p>
        </div>
        <button
          onClick={refetchSummary}
          disabled={summaryLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {summaryLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {summaryLoading ? (
        <div className="text-center py-16 text-gray-500">Loading attendance data...</div>
      ) : summaryError ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{summaryError}</p>
          <button onClick={refetchSummary} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50">
            Retry
          </button>
        </div>
      ) : summary.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No attendance records yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summary.map((subject, idx) => {
            const isExpanded = expandedSubject === subject.name;
            const subjectHistory = historyBySubject[subject.name] || [];

            return (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Summary Card */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer select-none"
                  onClick={() => toggleExpand(subject.name)}
                >
                  {/* Percentage Circle */}
                  <div className="flex-shrink-0 relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                      <circle
                        cx="28" cy="28" r="24" fill="none" strokeWidth="4"
                        stroke="currentColor"
                        strokeDasharray={`${(subject.percentage / 100) * 150.8} 150.8`}
                        strokeLinecap="round"
                        className={getPercentageRing(subject.percentage)}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-gray-200">
                      {subject.percentage}%
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">{subject.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {subject.attendedSessions} / {subject.totalSessions} sessions attended
                    </p>
                  </div>

                  {/* Badge + Expand Arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPercentageBadge(subject.percentage)}`}>
                      {subject.percentage >= 75 ? 'Good' : subject.percentage >= 60 ? 'Low' : 'Critical'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Collapsible History */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-5 py-3">
                    {historyLoading ? (
                      <p className="text-sm text-gray-500 py-3">Loading session history...</p>
                    ) : subjectHistory.length === 0 ? (
                      <p className="text-sm text-gray-500 py-3">No session records found.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {subjectHistory.map((record, rIdx) => (
                          <li key={rIdx} className="flex items-center justify-between py-2.5 text-sm">
                            <div>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {record.sessionId?.name || 'Session'}
                              </span>
                              <span className="ml-2 text-gray-400 dark:text-gray-500 text-xs">
                                {record.sessionId?.subjectId?.code || ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                Present
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;
