import React, { useMemo, useEffect } from 'react';
import { useStudentSchedule } from '../../hooks/useStudentSchedule';
import Skeleton from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';

const CardSkeleton = () => (
  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
    <Skeleton width="5rem" height="2.5rem" />
    <div className="flex-grow space-y-2">
      <Skeleton height="1rem" width="55%" />
      <Skeleton height="0.75rem" width="35%" />
    </div>
  </div>
);

const StudentSchedule = () => {
  const { data: allSlots, loading, error, refetch } = useStudentSchedule();

  useEffect(() => { document.title = 'My Schedule — SmartAttend'; }, []);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = daysMap[new Date().getDay()];

  const todaySlots = useMemo(() => {
    return allSlots
      .filter(s => s.dayOfWeek === todayDay)
      .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  }, [allSlots, todayDay]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Schedule</h2>
        <p className="text-gray-500 dark:text-gray-400">{todayName}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <Button variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      ) : todaySlots.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No classes scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaySlots.map((slot, idx) => (
            <div
              key={slot._id || idx}
              className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
            >
              <div className="flex-shrink-0 w-20 text-center">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{slot.startTime}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">to {slot.endTime}</div>
              </div>
              <div className="w-0.5 self-stretch rounded-full bg-blue-200 dark:bg-blue-800"></div>
              <div className="flex-grow min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {slot.subjectId?.name || 'Unknown Subject'}
                  {slot.subjectId?.code && (
                    <span className="ml-2 text-xs font-normal text-gray-400">({slot.subjectId.code})</span>
                  )}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                  {slot.substituteTeacher ? (
                    <span className="flex items-center gap-1">
                      👤 <span className="text-gray-700 dark:text-gray-200 font-medium">{slot.substituteTeacher.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        substitute
                      </span>
                    </span>
                  ) : (
                    <span>👤 {slot.teacherId?.name || 'Unknown'}</span>
                  )}
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
                {slot.substituteTeacher && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Originally: {slot.teacherId?.name || 'Unknown'} (on leave)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSchedule;
