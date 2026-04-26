import React from 'react';

const FormInput = ({ label, name, value, onChange, error, type = 'text', placeholder, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default FormInput;
