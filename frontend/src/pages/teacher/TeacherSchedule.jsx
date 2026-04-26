import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMySchedule } from '../../hooks/useMySchedule';
import { useAuth } from '../../context/AuthContext';
import ScheduleCard from '../../components/teacher/ScheduleCard';
import ExtraClassForm from '../../components/teacher/ExtraClassForm';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';

const ScheduleSkeleton = () => (
  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
    <div className="flex items-start gap-4">
      <Skeleton width="5rem" height="2.5rem" />
      <div className="flex-grow space-y-2">
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="0.75rem" width="40%" />
      </div>
      <Skeleton width="5rem" height="2rem" />
    </div>
  </div>
);

const TeacherSchedule = () => {
  const { data, loading, error, refetch } = useMySchedule();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);

  useEffect(() => { document.title = 'My Schedule — SmartAttend'; }, []);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const uniqueSections = useMemo(() => {
    const seen = new Map();
    (data.schedule || []).forEach(s => {
      const id = s.sectionId?._id;
      if (id && !seen.has(id)) seen.set(id, { _id: id, name: s.sectionId?.name });
    });
    return Array.from(seen.values());
  }, [data.schedule]);

  const uniqueSubjects = useMemo(() => {
    const seen = new Map();
    (data.schedule || []).forEach(s => {
      const id = s.subjectId?._id;
      if (id && !seen.has(id)) seen.set(id, { _id: id, name: s.subjectId?.name, code: s.subjectId?.code });
    });
    return Array.from(seen.values());
  }, [data.schedule]);

  const handleStartClass = async (slot) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/teacher/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          timeSlotId: slot._id,
          sectionId: slot.sectionId?._id || slot.sectionId,
          subjectId: slot.subjectId?._id || slot.subjectId,
          name: slot.subjectId?.name || 'Class',
          isExtraClass: false
        })
      });
      const session = await res.json();
      if (!res.ok) throw new Error(session.message || 'Failed to start session');
      navigate(`/teacher/session/${session._id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const allItems = useMemo(() => {
    const extras = (data.extraSessions || []).map(s => ({
      ...s,
      startTime: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: '-',
      isExtraClass: true,
      session: { _id: s._id, status: s.status, isActive: s.isActive }
    }));
    return [...(data.schedule || []), ...extras].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Schedule</h2>
          <p className="text-gray-500 dark:text-gray-400">{todayName}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => setIsExtraModalOpen(true)}>+ Schedule Extra Class</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <ScheduleSkeleton /><ScheduleSkeleton /><ScheduleSkeleton />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <Button variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No classes scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems.map((slot, idx) => (
            <ScheduleCard key={slot._id || idx} slot={slot} onStartClass={handleStartClass} />
          ))}
        </div>
      )}

      <Modal isOpen={isExtraModalOpen} onClose={() => setIsExtraModalOpen(false)} title="Schedule Extra Class">
        <ExtraClassForm
          sections={uniqueSections}
          subjects={uniqueSubjects}
          onSuccess={() => { setIsExtraModalOpen(false); refetch(); }}
          onCancel={() => setIsExtraModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default TeacherSchedule;

