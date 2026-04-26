import React, { useState, useEffect } from 'react';
import FormSelect from '../ui/FormSelect';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 'Monday' },
  { label: 'Tuesday', value: 'Tuesday' },
  { label: 'Wednesday', value: 'Wednesday' },
  { label: 'Thursday', value: 'Thursday' },
  { label: 'Friday', value: 'Friday' },
  { label: 'Saturday', value: 'Saturday' }
];

const TimeSlotForm = ({ initialData, sections, subjects, teachers, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    sectionId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { token } = useAuth();

  useEffect(() => {
    if (initialData) {
      setFormData({
        sectionId: initialData.sectionId?._id || initialData.sectionId || '',
        subjectId: initialData.subjectId?._id || initialData.subjectId || '',
        teacherId: initialData.teacherId?._id || initialData.teacherId || '',
        dayOfWeek: initialData.dayOfWeek || 'Monday',
        startTime: initialData.startTime || '09:00',
        endTime: initialData.endTime || '10:00'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields and time range
    const errs = {};
    if (!formData.sectionId) errs.sectionId = 'Section is required';
    if (!formData.subjectId) errs.subjectId = 'Subject is required';
    if (!formData.teacherId) errs.teacherId = 'Teacher is required';
    if (formData.endTime <= formData.startTime) errs.endTime = 'End time must be after start time';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    setError(null);

    const isEdit = !!initialData?._id;
    const url = isEdit 
      ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/timeslots/${initialData._id}`
      : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/timeslots`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.message || 'Clash detected: This teacher is already booked for this time slot.');
        }
        throw new Error(data.message || data.error || 'Failed to save time slot');
      }
      
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert array to options format
  const sectionOptions = sections.map(s => ({ label: s.name, value: s._id }));
  const subjectOptions = subjects.map(s => ({ label: `${s.name} (${s.code})`, value: s._id }));
  
  // Requirement: "only show teachers assigned to the selected section"
  // Note: Since teachers don't have a sectionId in the User model currently,
  // we show all teachers. Filtering can be added if schema supports it later.
  const teacherOptions = teachers.map(t => ({ label: t.name, value: t._id }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>{error}</span>
        </div>
      )}
      
      <FormSelect
        label="Section"
        name="sectionId"
        value={formData.sectionId}
        onChange={handleChange}
        options={sectionOptions}
        error={fieldErrors.sectionId}
        required
      />

      <FormSelect
        label="Subject"
        name="subjectId"
        value={formData.subjectId}
        onChange={handleChange}
        options={subjectOptions}
        error={fieldErrors.subjectId}
        required
      />

      <FormSelect
        label="Teacher"
        name="teacherId"
        value={formData.teacherId}
        onChange={handleChange}
        options={teacherOptions}
        error={fieldErrors.teacherId}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormSelect
          label="Day"
          name="dayOfWeek"
          value={formData.dayOfWeek}
          onChange={handleChange}
          options={DAYS_OF_WEEK}
          required
        />
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
          error={fieldErrors.endTime}
          required
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>
          {initialData?._id ? 'Update Slot' : 'Save Slot'}
        </Button>
      </div>
    </form>
  );
};

export default TimeSlotForm;
