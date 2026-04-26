import React, { useState, useEffect, useMemo } from 'react';
import { useMySchedule } from '../../hooks/useMySchedule';
import { useSectionAttendance } from '../../hooks/useSectionAttendance';

const TeacherAttendance = () => {
  const { data: scheduleData, loading: scheduleLoading } = useMySchedule();
  const { data: attendanceData, loading: attendanceLoading, error: attendanceError, fetchAttendance } = useSectionAttendance();

  useEffect(() => { document.title = 'Attendance Reports — SmartAttend'; }, []);

  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Extract unique sections from the teacher's full timetable
  const sections = useMemo(() => {
    const seen = new Map();
    // Use the full timetable (schedule includes all of today's slots)
    (scheduleData.schedule || []).forEach(s => {
      const id = s.sectionId?._id;
      if (id && !seen.has(id)) {
        seen.set(id, { _id: id, name: s.sectionId?.name });
      }
    });
    return Array.from(seen.values());
  }, [scheduleData.schedule]);

  // Auto-select first section when sections load
  useEffect(() => {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0]._id);
    }
  }, [sections, selectedSectionId]);

  // Fetch attendance when section or subject filter changes
  useEffect(() => {
    if (selectedSectionId) {
      fetchAttendance(selectedSectionId, selectedSubjectId);
    }
  }, [selectedSectionId, selectedSubjectId, fetchAttendance]);

  // Build subject options from the fetched attendance data
  const subjectOptions = attendanceData.subjectSessionCounts || [];

  const report = attendanceData.report || [];

  const getPercentageBadge = (pct) => {
    if (pct >= 75) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (pct >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Reports</h2>
        <p className="text-gray-500 dark:text-gray-400">View per-student attendance for your assigned sections.</p>
      </div>

      {scheduleLoading ? (
        <div className="text-center py-16 text-gray-500">Loading sections...</div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No sections found. Your schedule may be empty today, or no sections are assigned to you.</p>
        </div>
      ) : (
        <>
          {/* Section Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              {sections.map(sec => (
                <button
                  key={sec._id}
                  onClick={() => { setSelectedSectionId(sec._id); setSelectedSubjectId(''); }}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedSectionId === sec._id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter by subject:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="">All Subjects</option>
              {subjectOptions.map((s, idx) => (
                <option key={idx} value={s.subjectId || ''}>
                  {s.subjectName} ({s.total} sessions)
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Table */}
          {attendanceLoading ? (
            <div className="text-center py-12 text-gray-500">Loading attendance data...</div>
          ) : attendanceError ? (
            <div className="text-center py-12 text-red-500">Error: {attendanceError}</div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Student Name</th>
                    <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Subject</th>
                    <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Attended</th>
                    <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Total</th>
                    <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {report.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                        No attendance records found for this section.
                      </td>
                    </tr>
                  ) : (
                    report.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.studentName}</td>
                        <td className="px-6 py-4">{row.subjectName}</td>
                        <td className="px-6 py-4 text-center">{row.attended}</td>
                        <td className="px-6 py-4 text-center">{row.total}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getPercentageBadge(row.percentage)}`}>
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherAttendance;
