import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Generic member column (students OR teachers) ─────────────────────────────
const MemberColumn = ({ title, assigned, allUsers, loadingUsers, onAdd, onRemove, actionLoading, error }) => {
  const [search, setSearch] = useState('');

  const assignedIds = new Set(assigned.map(u => u._id));

  const unassigned = useMemo(() =>
    allUsers.filter(u => !assignedIds.has(u._id) &&
      u.name.toLowerCase().includes(search.toLowerCase())),
    [allUsers, assignedIds, search]
  );

  const filteredAssigned = useMemo(() =>
    assigned.filter(u => u.name.toLowerCase().includes(search.toLowerCase())),
    [assigned, search]
  );

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 min-w-0">
      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</h4>

      <input
        type="text"
        placeholder={`Search ${title.toLowerCase()}...`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg mb-3 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
      />

      {error && (
        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs">
          {error}
        </div>
      )}

      {/* Assigned members */}
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
        Assigned ({assigned.length})
      </p>
      <ul className="space-y-1 max-h-36 overflow-y-auto mb-4">
        {filteredAssigned.length === 0 ? (
          <li className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">None assigned</li>
        ) : filteredAssigned.map(u => (
          <li key={u._id} className="flex justify-between items-center text-sm bg-white dark:bg-gray-700 px-3 py-2 rounded-lg shadow-sm">
            <span className="text-gray-800 dark:text-gray-200 truncate">{u.name}</span>
            <button
              onClick={() => onRemove(u._id)}
              disabled={actionLoading}
              className="ml-2 flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* Unassigned search results */}
      {search.trim() && (
        <>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Add {title.slice(0, -1)} {/* "Add Student" / "Add Teacher" */}
          </p>
          <ul className="space-y-1 max-h-36 overflow-y-auto">
            {loadingUsers ? (
              <li className="text-xs text-gray-400 py-2 text-center">Loading…</li>
            ) : unassigned.length === 0 ? (
              <li className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">No results</li>
            ) : unassigned.map(u => (
              <li key={u._id} className="flex justify-between items-center text-sm bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300 truncate">{u.name}</span>
                <button
                  onClick={() => onAdd(u._id)}
                  disabled={actionLoading}
                  className="ml-2 flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// ── Main ManageSection component ─────────────────────────────────────────────
const ManageSection = ({ section: initialSection, onClose }) => {
  const { token } = useAuth();
  const [section, setSection] = useState(initialSection);

  // All students + teachers pool
  const [allStudents, setAllStudents] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Action error per column
  const [studentError, setStudentError] = useState(null);
  const [teacherError, setTeacherError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Fetch all students and teachers
  useEffect(() => {
    fetch(`${BASE_URL}/api/admin/users?role=student`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAllStudents(Array.isArray(data) ? data : []))
      .catch(() => setAllStudents([]))
      .finally(() => setLoadingStudents(false));

    fetch(`${BASE_URL}/api/admin/users?role=teacher`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAllTeachers(Array.isArray(data) ? data : []))
      .catch(() => setAllTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, [token]);

  // ── Student handlers ───────────────────────────────────────────────────────
  const handleAddStudent = async (studentId) => {
    setStudentError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sections/${section._id}/students`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add student');
      setSection(data); // response is updated section with populated arrays
    } catch (err) {
      setStudentError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    setStudentError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sections/${section._id}/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove student');
      setSection(data);
    } catch (err) {
      setStudentError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Teacher handlers ───────────────────────────────────────────────────────
  const handleAddTeacher = async (teacherId) => {
    setTeacherError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sections/${section._id}/teachers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ teacherId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add teacher');
      setSection(data);
    } catch (err) {
      setTeacherError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTeacher = async (teacherId) => {
    setTeacherError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sections/${section._id}/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove teacher');
      setSection(data);
    } catch (err) {
      setTeacherError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const assignedStudents = section?.students || [];
  const assignedTeachers = section?.teachers || [];

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        Managing members for <strong className="text-gray-900 dark:text-white">{section?.name}</strong>.
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        <MemberColumn
          title="Students"
          assigned={assignedStudents}
          allUsers={allStudents}
          loadingUsers={loadingStudents}
          onAdd={handleAddStudent}
          onRemove={handleRemoveStudent}
          actionLoading={actionLoading}
          error={studentError}
        />
        <MemberColumn
          title="Teachers"
          assigned={assignedTeachers}
          allUsers={allTeachers}
          loadingUsers={loadingTeachers}
          onAdd={handleAddTeacher}
          onRemove={handleRemoveTeacher}
          actionLoading={actionLoading}
          error={teacherError}
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

export default ManageSection;
