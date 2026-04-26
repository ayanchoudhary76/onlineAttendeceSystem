import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useSectionAttendance = () => {
  const [data, setData] = useState({ report: [], subjectSessionCounts: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchAttendance = useCallback(async (sectionId, subjectId = '') => {
    if (!sectionId) return;
    setLoading(true);
    setError(null);
    try {
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/teacher/sections/${sectionId}/attendance`;
      if (subjectId) url += `?subjectId=${subjectId}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch attendance data');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { data, loading, error, fetchAttendance };
};
