import React, { useState, useEffect } from 'react';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SubjectForm = ({ onSuccess, onCancel, subject }) => {
  const isEdit = Boolean(subject);
  const [formData, setFormData] = useState({
    name: subject?.name || '',
    code: subject?.code || '',
    teacherId: subject?.teacherId?._id || subject?.teacherId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { token } = useAuth();

  // Fetch teachers for the dropdown
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/admin/users?role=teacher`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setTeachersLoading(false));
  }, [token]);

  const teacherOptions = [
    { label: 'Unassigned', value: '' },
    ...teachers.map(t => ({ label: t.name, value: t._id }))
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Subject name is required';
    if (!formData.code.trim()) errs.code = 'Course code is required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    setError(null);

    try {
      const url = isEdit
        ? `${BASE_URL}/api/admin/subjects/${subject._id}`
        : `${BASE_URL}/api/admin/subjects`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim(),
          teacherId: formData.teacherId || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save subject');

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

      <FormInput
        label="Subject Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. Operating Systems"
        error={fieldErrors.name}
        required
      />

      <FormInput
        label="Subject Code"
        name="code"
        value={formData.code}
        onChange={handleChange}
        placeholder="e.g. CS301"
        error={fieldErrors.code}
        required
      />

      <FormSelect
        label="Assigned Teacher (optional)"
        name="teacherId"
        value={formData.teacherId}
        onChange={handleChange}
        options={teachersLoading ? [{ label: 'Loading teachers…', value: '' }] : teacherOptions}
        placeholder="Select teacher…"
      />

      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>
          {isEdit ? 'Update Subject' : 'Save Subject'}
        </Button>
      </div>
    </form>
  );
};

export default SubjectForm;
