import React, { useState, useEffect, useMemo } from 'react';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fix 2: ExtraClassForm now fetches its own sections and subjects internally.
 * It no longer depends on props from TeacherSchedule's today-only schedule data.
 */
const ExtraClassForm = ({ onSuccess, onCancel }) => {
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    sectionId: '',
    subjectId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Internal data fetches
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState(null);
  const [subjectsError, setSubjectsError] = useState(null);

  useEffect(() => {
    // Fetch sections this teacher is assigned to (across the full week)
    fetch(`${BASE_URL}/api/teacher/sections`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setSections(Array.isArray(data) ? data : []))
      .catch(() => setSectionsError('Failed to load sections'))
      .finally(() => setSectionsLoading(false));

    // Fetch all subjects (teacher-accessible endpoint)
    fetch(`${BASE_URL}/api/teacher/subjects`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => setSubjectsError('Failed to load subjects'))
      .finally(() => setSubjectsLoading(false));
  }, [token]);

  const sectionOptions = useMemo(() =>
    sections.map(s => ({ label: s.name, value: s._id })),
    [sections]
  );

  const subjectOptions = useMemo(() =>
    subjects.map(s => ({ label: `${s.name}${s.code ? ` (${s.code})` : ''}`, value: s._id })),
    [subjects]
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const selectedSubject = subjects.find(s => s._id === formData.subjectId);

    try {
      const res = await fetch(`${BASE_URL}/api/teacher/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sectionId: formData.sectionId,
          subjectId: formData.subjectId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          sessionType: 'extra',
          name: selectedSubject?.name || 'Extra Class',
          isExtraClass: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create extra class');

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

      {sectionsError && (
        <div className="p-3 bg-amber-100 text-amber-700 rounded-lg text-sm">{sectionsError}</div>
      )}
      <FormSelect
        label="Section"
        name="sectionId"
        value={formData.sectionId}
        onChange={handleChange}
        options={sectionsLoading ? [{ label: 'Loading sections...', value: '' }] : sectionOptions}
        placeholder={sectionsLoading ? 'Loading...' : 'Select section...'}
        required
      />

      {subjectsError && (
        <div className="p-3 bg-amber-100 text-amber-700 rounded-lg text-sm">{subjectsError}</div>
      )}
      <FormSelect
        label="Subject"
        name="subjectId"
        value={formData.subjectId}
        onChange={handleChange}
        options={subjectsLoading ? [{ label: 'Loading subjects...', value: '' }] : subjectOptions}
        placeholder={subjectsLoading ? 'Loading...' : 'Select subject...'}
        required
      />

      <FormInput
        type="date"
        label="Date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          type="time"
          label="Start Time"
          name="startTime"
          value={formData.startTime}
          onChange={handleChange}
          required
        />
        <FormInput
          type="time"
          label="End Time"
          name="endTime"
          value={formData.endTime}
          onChange={handleChange}
          required
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>Schedule Extra Class</Button>
      </div>
    </form>
  );
};

export default ExtraClassForm;
