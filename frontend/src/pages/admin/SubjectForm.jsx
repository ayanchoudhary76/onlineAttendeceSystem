import React, { useState } from 'react';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const SubjectForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { token } = useAuth();

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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create subject');
      
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

      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>Save Subject</Button>
      </div>
    </form>
  );
};

export default SubjectForm;
