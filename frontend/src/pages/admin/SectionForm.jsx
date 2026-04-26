import React, { useState } from 'react';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const SectionForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({ name: '', department: '', semester: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { token } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Section name is required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create section');
      
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
        label="Section Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. CSE-3A"
        error={fieldErrors.name}
        required
      />
      
      <FormInput 
        label="Department" 
        name="department" 
        value={formData.department} 
        onChange={handleChange} 
        placeholder="e.g. Computer Science"
      />
      
      <FormSelect 
        label="Semester" 
        name="semester" 
        value={formData.semester} 
        onChange={handleChange}
        options={[
          { label: 'Semester 1', value: '1' },
          { label: 'Semester 2', value: '2' },
          { label: 'Semester 3', value: '3' },
          { label: 'Semester 4', value: '4' },
          { label: 'Semester 5', value: '5' },
          { label: 'Semester 6', value: '6' },
          { label: 'Semester 7', value: '7' },
          { label: 'Semester 8', value: '8' },
        ]}
      />

      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>Save Section</Button>
      </div>
    </form>
  );
};

export default SectionForm;
