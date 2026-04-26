import React, { useState, useMemo, useEffect } from 'react';
import { useLeaveRequests } from '../../hooks/useLeaveRequests';
import { useTeachers } from '../../hooks/useTeachers';
import { useAuth } from '../../context/AuthContext';
import LeaveRequestRow from '../../components/admin/LeaveRequestRow';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import FormSelect from '../../components/ui/FormSelect';
import Skeleton from '../../components/ui/Skeleton';

const TableSkeleton = () => (
  <>
    {[1,2,3].map(i => (
      <tr key={i}>
        {[1,2,3,4,5,6,7].map(j => (
          <td key={j} className="px-6 py-4">
            <Skeleton height="0.875rem" width={j === 3 ? '80%' : '60%'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

const AdminLeaves = () => {
  useEffect(() => { document.title = 'Leave Manager — SmartAttend'; }, []);
  const { data: leaves, loading: leavesLoading, error: leavesError, refetch: refetchLeaves } = useLeaveRequests();
  const { data: teachers, loading: teachersLoading } = useTeachers();
  const { token } = useAuth();

  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  
  const [confirmedSubstituteId, setConfirmedSubstituteId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const filteredLeaves = useMemo(() => {
    if (filter === 'all') return leaves;
    return leaves.filter(l => l.status === filter);
  }, [leaves, filter]);

  const openApproveModal = (leave) => {
    setSelectedLeave(leave);
    setConfirmedSubstituteId(leave.suggestedSubstituteId?._id || '');
    setIsApproveModalOpen(true);
    setActionError(null);
  };

  const openRejectModal = (leave) => {
    setSelectedLeave(leave);
    setIsRejectModalOpen(true);
    setActionError(null);
  };

  const updateLeaveStatus = async (status, substituteId = null) => {
    if (!selectedLeave) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const payload = { status };
      if (substituteId) payload.confirmedSubstituteId = substituteId;

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/leaves/${selectedLeave._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to ${status} leave`);
      }

      setIsApproveModalOpen(false);
      setIsRejectModalOpen(false);
      setSelectedLeave(null);
      refetchLeaves();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveConfirm = () => {
    updateLeaveStatus('approved', confirmedSubstituteId);
  };

  const handleRejectConfirm = () => {
    updateLeaveStatus('rejected');
  };

  // Filter out the teacher who is on leave from the substitute dropdown — Fix 6: cast both sides to string
  const availableSubstituteOptions = teachers
    .filter(t => t._id.toString() !== selectedLeave?.teacherId?._id?.toString())
    .map(t => ({ label: t.name, value: t._id }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Manager</h2>
          <p className="text-gray-500 dark:text-gray-400">Review and approve teacher leave requests.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {['all', 'pending', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`whitespace-nowrap capitalize pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      {leavesError ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{leavesError}</p>
          <Button variant="secondary" onClick={refetchLeaves}>Retry</Button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Teacher</th>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Date Range</th>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Reason</th>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Suggested Sub</th>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Confirmed Sub</th>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {leavesLoading ? (
                <TableSkeleton />
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No {filter === 'all' ? '' : filter} leave requests found.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <LeaveRequestRow 
                    key={leave._id} 
                    leave={leave} 
                    onApprove={openApproveModal}
                    onReject={openRejectModal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Modal */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Approve Leave Request">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            You are approving leave for <strong>{selectedLeave?.teacherId?.name}</strong>. 
            Please confirm or change the substitute teacher.
          </p>
          
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          
          {teachersLoading ? (
            <p className="text-sm text-gray-500">Loading substitute options...</p>
          ) : (
            <FormSelect
              label="Confirmed Substitute"
              name="confirmedSubstituteId"
              value={confirmedSubstituteId}
              onChange={(e) => setConfirmedSubstituteId(e.target.value)}
              options={availableSubstituteOptions}
            />
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setIsApproveModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApproveConfirm} loading={actionLoading}>Confirm Approval</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Leave Request">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Are you sure you want to reject this leave request from <strong>{selectedLeave?.teacherId?.name}</strong>?
          </p>
          
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleRejectConfirm} loading={actionLoading}>Reject Request</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default AdminLeaves;
