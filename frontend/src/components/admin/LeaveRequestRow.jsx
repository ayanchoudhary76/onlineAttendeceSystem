import React from 'react';

const LeaveRequestRow = ({ leave, onApprove, onReject }) => {
  const teacherName = leave.teacherId?.name || 'Unknown';
  const suggestedSub = leave.suggestedSubstituteId?.name || 'None';
  const confirmedSub = leave.status === 'approved'
    ? (leave.confirmedSubstituteId?.name || 'None assigned')
    : '—';

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{teacherName}</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={leave.reason}>
        {leave.reason}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
        {suggestedSub}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
        {confirmedSub}
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
      <td className="px-6 py-4 text-right space-x-2">
        {leave.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(leave)}
              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded-md text-xs font-medium transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(leave)}
              className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 rounded-md text-xs font-medium transition-colors"
            >
              Reject
            </button>
          </>
        )}
      </td>
    </tr>
  );
};

export default LeaveRequestRow;

