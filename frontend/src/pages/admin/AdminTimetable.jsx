import React, { useState, useMemo, useEffect } from 'react';
import { useTimeSlots } from '../../hooks/useTimeSlots';
import { useSections } from '../../hooks/useSections';
import { useSubjects } from '../../hooks/useSubjects';
import { useTeachers } from '../../hooks/useTeachers';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import TimeSlotForm from '../../components/admin/TimeSlotForm';
import TimeSlotCard from '../../components/admin/TimeSlotCard';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GridSkeleton = () => (
  <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex gap-2 p-4">
      {DAYS.map(d => (
        <div key={d} className="flex-1 space-y-2">
          <Skeleton height="1rem" />
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
        </div>
      ))}
    </div>
  </div>
);

const AdminTimetable = () => {
  const { data: timeSlots, loading: slotsLoading, error: slotsError, refetch: refetchSlots } = useTimeSlots();
  const { data: sections, loading: sectionsLoading } = useSections();
  const { data: subjects, loading: subjectsLoading } = useSubjects();
  const { data: teachers, loading: teachersLoading } = useTeachers();
  const { token } = useAuth();

  useEffect(() => { document.title = 'Timetable Builder — SmartAttend'; }, []);

  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Confirm-delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const filteredSlots = useMemo(() => {
    if (!selectedSectionFilter) return timeSlots;
    return timeSlots.filter(slot => slot.sectionId?._id === selectedSectionFilter || slot.sectionId === selectedSectionFilter);
  }, [timeSlots, selectedSectionFilter]);

  const timePeriods = useMemo(() => {
    const periodsMap = new Map();
    filteredSlots.forEach(slot => {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!periodsMap.has(key)) periodsMap.set(key, { startTime: slot.startTime, endTime: slot.endTime });
    });
    return Array.from(periodsMap.values()).sort((a, b) => a.startTime < b.startTime ? -1 : 1);
  }, [filteredSlots]);

  const confirmDelete = (slot) => {
    setDeleteTarget(slot);
    setDeleteError(null);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/timeslots/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteTarget(null);
        refetchSlots();
      } else {
        const err = await res.json();
        setDeleteError(err.message || 'Failed to delete slot');
      }
    } catch {
      setDeleteError('Network error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (slot) => { setEditingSlot(slot); setIsModalOpen(true); };
  const openNewModal = () => { setEditingSlot(null); setIsModalOpen(true); };

  const isDataLoading = slotsLoading || sectionsLoading || subjectsLoading || teachersLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timetable Builder</h2>
          <p className="text-gray-500 dark:text-gray-400">Schedule classes for sections and teachers.</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="">All Sections</option>
            {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <Button onClick={openNewModal}>+ Add Time Slot</Button>
        </div>
      </div>

      {isDataLoading ? (
        <GridSkeleton />
      ) : slotsError ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{slotsError}</p>
          <Button variant="secondary" onClick={refetchSlots}>Retry</Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
          {timePeriods.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No time slots scheduled yet.</div>
          ) : (
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 w-24 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 sticky left-0 z-10">
                    Time
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="p-4 border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[160px] last:border-r-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timePeriods.map((period, pIdx) => (
                  <tr key={pIdx}>
                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 sticky left-0 z-10">
                      {period.startTime} <br/>|<br/> {period.endTime}
                    </td>
                    {DAYS.map(day => {
                      const slotsInCell = filteredSlots.filter(s =>
                        s.dayOfWeek === day && s.startTime === period.startTime && s.endTime === period.endTime
                      );
                      return (
                        <td key={`${day}-${pIdx}`} className="p-2 border-b border-r border-gray-200 dark:border-gray-700 align-top last:border-r-0">
                          {slotsInCell.length > 0 ? (
                            <div className="space-y-2">
                              {slotsInCell.map(slot => (
                                <TimeSlotCard key={slot._id} slot={slot} onEdit={handleEdit} onDelete={confirmDelete} />
                              ))}
                            </div>
                          ) : (
                            <div className="h-full min-h-[100px] bg-transparent"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Time Slot Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}>
        <TimeSlotForm
          initialData={editingSlot}
          sections={sections}
          subjects={subjects}
          teachers={teachers}
          onSuccess={() => { setIsModalOpen(false); refetchSlots(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Time Slot">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Are you sure you want to delete the time slot for{' '}
            <strong>{deleteTarget?.subjectId?.name || 'this subject'}</strong> on{' '}
            <strong>{deleteTarget?.dayOfWeek}</strong> at{' '}
            <strong>{deleteTarget?.startTime}–{deleteTarget?.endTime}</strong>?
            Associated scheduled sessions will be cancelled.
          </p>
          {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={executeDelete} loading={deleteLoading}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminTimetable;
