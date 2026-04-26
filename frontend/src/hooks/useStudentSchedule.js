import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useStudentSchedule = () => {
  const [data, setData] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/student/timetable`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch timetable');
      const result = await res.json();

      // Handle both array (legacy) and { slots, message? } response
      if (Array.isArray(result)) {
        setData(result);
      } else {
        setData(result.slots || []);
        if (result.message) setMessage(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return { data, message, loading, error, refetch: fetchSchedule };
};
