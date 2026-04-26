import React, { useState, useEffect } from 'react';
import { useMyLeaves } from '../../hooks/useMyLeaves';
import { useTeachers } from '../../hooks/useTeachers';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import Button from '../../components/ui/Button';

const TeacherLeave = () => {
  const { user, token } = useAuth();
  const { data: leaves, loading: leavesLoading, error: leavesError, refetch: refetchLeaves } = useMyLeaves();
  const { data: teachers, loading: teachersLoading } = useTeachers();

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    suggestedSubstituteId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => { document.title = 'Leave Portal — SmartAttend'; }, []);

  // Exclude current user from substitute options — Fix 6: cast both sides to string
  const substituteOptions = teachers
    .filter(t => t._id.toString() !== user.id.toString())
    .map(t => ({ label: t.name, value: t._id }));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate
    const errs = {};
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.endDate) errs.endDate = 'End date is required';
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      errs.endDate = 'End date must be on or after start date';
    }
    if (!formData.reason.trim()) errs.reason = 'Reason is required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/teacher/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to submit leave request');
      
      setSubmitSuccess(true);
      setFormData({ startDate: '', endDate: '', reason: '', suggestedSubstituteId: '' });
      refetchLeaves();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Portal</h2>
        <p className="text-gray-500 dark:text-gray-400">Apply for leave and view your request history.</p>
      </div>

      {/* Top Section: Application Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Apply for Leave</h3>
        
        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm">
            Leave request submitted successfully.
          </div>
        )}
        
        {submitError && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              type="date"
              label="Start Date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              error={fieldErrors.startDate}
              required
            />
            <FormInput
              type="date"
              label="End Date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              error={fieldErrors.endDate}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow"
              placeholder="Briefly explain your reason for leave..."
              required
            ></textarea>
          </div>

          <FormSelect
            label="Suggested Substitute (Optional)"
            name="suggestedSubstituteId"
            value={formData.suggestedSubstituteId}
            onChange={handleChange}
            options={substituteOptions}
            placeholder={teachersLoading ? 'Loading teachers...' : 'Select a substitute...'}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </div>

      {/* Bottom Section: Leave History */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Leave History</h3>
        
        {leavesLoading ? (
          <div className="text-center py-10 text-gray-500">Loading history...</div>
        ) : leavesError ? (
          <div className="text-red-500 text-center py-10">Error: {leavesError}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Date Range</th>
                  <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Reason</th>
                  <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Suggested Sub</th>
                  <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Confirmed Sub</th>
                  <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      You haven't submitted any leave requests yet.
                    </td>
                  </tr>
                ) : (
                  leaves.map(leave => (
                    <tr key={leave._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="px-6 py-4">
                        {leave.suggestedSubstituteId?.name || 'None'}
                      </td>
                      <td className="px-6 py-4">
                        {leave.status === 'pending' ? '-' : (leave.confirmedSubstituteId?.name || 'None')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          leave.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                          leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default TeacherLeave;
