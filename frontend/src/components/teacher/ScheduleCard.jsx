import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const ScheduleCard = ({ slot, onStartClass }) => {
  const navigate = useNavigate();
  const subjectName = slot.subjectId?.name || slot.name || 'Unknown Subject';
  const sectionName = slot.sectionId?.name || 'Unknown Section';
  const timeRange = `${slot.startTime} – ${slot.endTime}`;

  // Determine card state
  const session = slot.session;
  let state = 'upcoming'; // default
  if (session) {
    if (session.status === 'active' && session.isActive) state = 'active';
    else if (session.status === 'completed') state = 'completed';
  }

  // Check if "Start class" should be enabled (within 15 minutes of start time)
  const canStart = useMemo(() => {
    if (state !== 'upcoming') return false;
    const now = new Date();
    const [h, m] = (slot.startTime || '00:00').split(':').map(Number);
    const slotStart = new Date();
    slotStart.setHours(h, m, 0, 0);
    const diffMinutes = (slotStart - now) / 60000;
    // Enable if within 15 minutes before OR after (allow starting late)
    return diffMinutes <= 15 && diffMinutes >= -60;
  }, [slot.startTime, state]);

  const startTimeLabel = useMemo(() => {
    const [h, m] = (slot.startTime || '00:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [slot.startTime]);

  return (
    <div className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
      state === 'completed' 
        ? 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60' 
        : state === 'active'
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-sm'
    }`}>
      {/* Time indicator */}
      <div className="flex-shrink-0 w-20 text-center">
        <div className={`text-lg font-bold ${
          state === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
        }`}>
          {slot.startTime}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">to {slot.endTime}</div>
      </div>

      {/* Vertical line */}
      <div className={`w-0.5 self-stretch rounded-full ${
        state === 'active' ? 'bg-blue-500' : state === 'completed' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}></div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={`font-semibold ${
            state === 'completed' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
          }`}>
            {subjectName}
          </h4>
          {slot.isSubstitute && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Substitute
            </span>
          )}
          {slot.isExtraClass && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              Extra Class
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
            {sectionName}
          </span>
          <span>{timeRange}</span>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex-shrink-0 flex items-center">
        {state === 'upcoming' && (
          <div className="relative group">
            <Button 
              variant="primary" 
              onClick={() => onStartClass(slot)}
              disabled={!canStart}
              className="text-sm"
            >
              Start Class
            </Button>
            {!canStart && (
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20">
                <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  Available at {startTimeLabel}
                </div>
              </div>
            )}
          </div>
        )}
        {state === 'active' && (
          <Button 
            variant="primary" 
            onClick={() => navigate(`/teacher/session/${session._id}`)}
            className="text-sm animate-pulse"
          >
            Go to Session
          </Button>
        )}
        {state === 'completed' && (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
            Completed
          </span>
        )}
      </div>
    </div>
  );
};

export default ScheduleCard;
