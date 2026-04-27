import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {QRCode} from 'react-qr-code';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const QR_ROTATE_SECONDS = 5;

const SessionController = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  // Session data
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // QR state — backend drives rotation via socket
  const [qrToken, setQrToken] = useState(null);
  const [countdown, setCountdown] = useState(QR_ROTATE_SECONDS);

  // Live attendees list
  const [liveAttendees, setLiveAttendees] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState(0);

  // End-session state
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const countdownRef = useRef(null);

  // ── Step 1: Load session details ─────────────────────────────────────────
  useEffect(() => {
    document.title = 'Live Session — SmartAttend';

    const fetchSession = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/teacher/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load session');
        setSession(data.session);
        setAttendanceCount(data.attendanceCount);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoadingSession(false);
      }
    };

    fetchSession();
  }, [id, token]);

  // ── Step 2: Connect socket and start QR rotation after session loads ──────
  useEffect(() => {
    if (!session || loadError) return;

    // Connect to Socket.IO
    const socket = io(BASE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Emit start_session — server joins room, begins 5s QR rotation
      socket.emit('start_session', { sessionId: id, token });
    });

    // Server pushes new QR token every 5 seconds
    socket.on('qr_update', ({ qrToken: newToken }) => {
      setQrToken(newToken);
      setCountdown(QR_ROTATE_SECONDS); // reset visual countdown
    });

    // Student successfully scanned — add to live attendees list
    socket.on('student_scanned', ({ studentName, studentId, timestamp }) => {
      setLiveAttendees(prev => {
        // Avoid duplicates within the same session
        if (prev.some(a => a.studentId === studentId)) return prev;
        return [{ studentName, studentId, timestamp: new Date(timestamp) }, ...prev];
      });
      setAttendanceCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [session, loadError, id, token]);

  // ── Step 3: Visual countdown timer (purely cosmetic, QR driven by socket) ─
  useEffect(() => {
    if (!qrToken) return;

    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? QR_ROTATE_SECONDS : prev - 1));
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [qrToken]);

  // ── End session ────────────────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    setEndError(null);

    try {
      // Tell the server to stop QR rotation and close the session
      if (socketRef.current) {
        socketRef.current.emit('stop_session', { sessionId: id });
        socketRef.current.disconnect();
      }

      const res = await fetch(`${BASE_URL}/api/teacher/sessions/${id}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to end session');

      navigate('/teacher/schedule');
    } catch (err) {
      setEndError(err.message);
      setEnding(false);
    }
  }, [ending, id, token, navigate]);

  // ── Render: loading / error states ────────────────────────────────────────
  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 dark:text-gray-400">Loading session…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-600 dark:text-red-400 font-medium">{loadError}</p>
          <Button variant="secondary" onClick={() => navigate('/teacher/schedule')}>
            ← Back to Schedule
          </Button>
        </div>
      </div>
    );
  }

  const subjectName = session?.subjectId?.name || 'Unknown Subject';
  const sectionName = session?.sectionId?.name || 'Unknown Section';
  const sessionDate = session?.date
    ? new Date(session.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build QR payload: what the student's scanner decodes
  const qrPayload = qrToken
    ? JSON.stringify({ sessionId: id, qrToken })
    : null;

  return (
    <div className="space-y-6">

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{subjectName}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {sectionName} · {sessionDate}
            {session?.isExtraClass && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                Extra Class
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="danger"
            onClick={handleEndSession}
            loading={ending}
          >
            End Session
          </Button>
          {endError && (
            <p className="text-red-600 dark:text-red-400 text-xs">{endError}</p>
          )}
        </div>
      </div>

      {/* ── Two-panel layout ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: QR Code ──────────────────────────────────────────────────── */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center">Scan to Mark Attendance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">QR refreshes every {QR_ROTATE_SECONDS} seconds</p>
          </div>

          {qrPayload ? (
            <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
              <QRCode
                value={qrPayload}
                size={220}
                level="M"
              />
            </div>
          ) : (
            <div className="w-[228px] h-[228px] flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-center space-y-2">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-xs text-gray-400">Generating QR…</p>
              </div>
            </div>
          )}

          {/* Countdown ring */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="24" cy="24" r="20" fill="none" strokeWidth="4"
                  stroke="currentColor"
                  strokeDasharray={`${(countdown / QR_ROTATE_SECONDS) * 125.7} 125.7`}
                  strokeLinecap="round"
                  className="text-blue-500 transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300">
                {countdown}s
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Next refresh</p>
          </div>
        </div>

        {/* Right: Live Attendees ──────────────────────────────────────────── */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Live Attendees</h3>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-bold">
              {attendanceCount}
            </span>
          </div>

          <div className="flex-grow overflow-y-auto max-h-[400px] space-y-2">
            {liveAttendees.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📡</div>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Waiting for students to scan…
                </p>
              </div>
            ) : (
              liveAttendees.map((a, idx) => (
                <div
                  key={`${a.studentId}-${idx}`}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm">
                      {a.studentName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {a.studentName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {a.timestamp instanceof Date
                      ? a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionController;
