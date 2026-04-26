import React, { useState, useMemo } from 'react';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const ExtraClassForm = ({ sections, subjects, onSuccess, onCancel }) => {
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

  const sectionOptions = useMemo(() => 
    sections.map(s => ({ label: s.name || s.sectionId?.name || 'Unknown', value: s._id || s.sectionId?._id })),
    [sections]
  );

  const subjectOptions = useMemo(() => 
    subjects.map(s => ({ label: `${s.name} (${s.code || ''})`, value: s._id })),
    [subjects]
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Find subject name for the session record
    const selectedSubject = subjects.find(s => s._id === formData.subjectId);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/teacher/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sectionId: formData.sectionId,
          subjectId: formData.subjectId,
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

      <FormSelect
        label="Section"
        name="sectionId"
        value={formData.sectionId}
        onChange={handleChange}
        options={sectionOptions}
        placeholder="Select section..."
        required
      />

      <FormSelect
        label="Subject"
        name="subjectId"
        value={formData.subjectId}
        onChange={handleChange}
        options={subjectOptions}
        placeholder="Select subject..."
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
