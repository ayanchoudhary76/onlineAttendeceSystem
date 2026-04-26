import React from 'react';

const FormSelect = ({ label, name, value, onChange, options, error, placeholder = 'Select an option', ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none ${
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200'
        }`}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Custom arrow indicator */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 bottom-8 text-gray-500">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400 -mt-6">{error}</p>}
    </div>
  );
};

export default FormSelect;
