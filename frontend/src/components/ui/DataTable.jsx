import React from 'react';

const DataTable = ({ columns, data, actions, emptyMessage = 'No records found.' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 font-semibold border-b border-gray-100 dark:border-gray-700">
                {col.header}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-6 py-4 font-semibold text-right border-b border-gray-100 dark:border-gray-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  {/* Handle nested object access like studentId.name if necessary, or assume flattened data */}
                  {col.accessor.split('.').reduce((obj, key) => (obj ? obj[key] : '-'), row)}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-6 py-4 text-right space-x-2">
                  {actions.map((action, actIndex) => {
                    const btnClass = action.variant === 'danger' 
                      ? 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100' 
                      : action.variant === 'secondary'
                      ? 'text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200'
                      : 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100';
                      
                    return (
                      <button
                        key={actIndex}
                        onClick={() => action.onClick(row)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${btnClass}`}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
