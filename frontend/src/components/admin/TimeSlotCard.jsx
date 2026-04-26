import React from 'react';

// Simple hash to consistently color-code sections based on their ID or name
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash) % 360;
  return `hsl(${color}, 70%, 90%)`;
};

const stringToBorderColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash) % 360;
  return `hsl(${color}, 70%, 50%)`;
};

const TimeSlotCard = ({ slot, onEdit, onDelete }) => {
  const sectionName = slot.sectionId?.name || 'Unknown';
  const subjectName = slot.subjectId?.name || 'Unknown';
  const teacherName = slot.teacherId?.name || 'Unknown';
  
  const bgColor = stringToColor(sectionName);
  const borderColor = stringToBorderColor(sectionName);

  return (
    <div 
      className="relative flex flex-col p-2 h-full min-h-[100px] rounded-lg text-sm border-l-4 shadow-sm hover:shadow-md transition-shadow group overflow-hidden"
      style={{ backgroundColor: bgColor, borderLeftColor: borderColor }}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-bold text-gray-800 leading-tight line-clamp-2 pr-6">
          {subjectName}
        </span>
      </div>
      
      <div className="text-gray-600 text-xs mb-1 line-clamp-1">
        {teacherName}
      </div>
      
      <div className="mt-auto flex justify-between items-end">
        <div className="font-medium text-gray-800 text-xs bg-white/60 px-1.5 py-0.5 rounded">
          {slot.startTime} - {slot.endTime}
        </div>
        <div className="font-bold text-gray-800 text-[10px] uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.8)'}}>
          {sectionName}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded p-1 shadow-sm">
        <button 
          onClick={() => onEdit(slot)}
          className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
        <button 
          onClick={() => onDelete(slot)}
          className="text-red-600 hover:text-red-800 p-0.5 rounded hover:bg-red-50"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default TimeSlotCard;
