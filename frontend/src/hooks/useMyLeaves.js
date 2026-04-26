import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useMyLeaves = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchMyLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/teacher/leaves`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch leave history');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyLeaves();
  }, [fetchMyLeaves]);

  return { data, loading, error, refetch: fetchMyLeaves };
};
