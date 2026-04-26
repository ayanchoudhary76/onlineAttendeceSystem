import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import StudentSchedule from './student/StudentSchedule';
import StudentAttendance from './student/StudentAttendance';

// ── Existing QR Scanner Component (kept intact) ──────────────────────────────
const StudentScanner = () => {
  const { token, deviceId } = useAuth();
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async (mode = facingMode) => {
    if (!window.isSecureContext) {
      setStatus('error');
      setMessage('Error: Camera requires HTTPS or Localhost.');
      return;
    }
    if (scannerRef.current) await stopCamera();
    
    setIsCameraActive(true);
    setStatus('scanning');
    setFacingMode(mode);

    const startWithMode = async (facingModeConfig) => {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      return await scanner.start(
        facingModeConfig,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (scannerRef.current) await stopCamera();
          handleSuccessfulScan(decodedText);
        },
        () => {}
      );
    };

    try {
      await startWithMode({ facingMode: mode });
    } catch (err) {
      if (mode === 'environment') {
        try {
          if (scannerRef.current) scannerRef.current.clear();
          setFacingMode('user');
          await startWithMode({ facingMode: 'user' });
          return;
        } catch (fallbackErr) {
          setIsCameraActive(false);
          setStatus('error');
          setMessage('Camera blocked or not found.');
        }
      } else {
        setIsCameraActive(false);
        setStatus('error');
        setMessage('Failed to access camera: ' + err.message);
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {}
    }
    setIsCameraActive(false);
  };

  const toggleCameraFlip = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newMode);
  };

  const handleSuccessfulScan = async (decodedText) => {
    setStatus('processing');
    try {
      const payload = JSON.parse(decodedText);
      if (!payload.sessionId || !payload.qrToken) throw new Error("Invalid QR Code");

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/student/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sessionId: payload.sessionId, qrToken: payload.qrToken, deviceId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStatus('success');
      setMessage('Attendance marked successfully!');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Verification Failed.');
    }
  };

  const resetScanner = () => {
    setStatus('idle');
    setMessage('');
    setScanResult(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow border border-gray-100 dark:border-gray-700">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mark Attendance</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Scan the live QR code on your teacher's screen.</p>
      </div>

      {status === 'idle' && !isCameraActive && (
        <div className="flex flex-col items-center justify-center space-y-6 py-10">
          <button onClick={() => startCamera()} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Open Camera
          </button>
        </div>
      )}

      {(status === 'scanning' || status === 'processing') && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-black min-h-[300px] max-w-[500px] mx-auto flex items-center justify-center">
             <div id="reader" className="w-full h-full"></div>
          </div>
          {status === 'processing' && <p className="text-center text-blue-600 animate-pulse">Processing Attendance...</p>}
          {isCameraActive && status === 'scanning' && (
            <div className="flex justify-center space-x-4">
              <button onClick={toggleCameraFlip} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300">Flip Camera</button>
              <button onClick={() => { stopCamera(); resetScanner(); }} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">Close</button>
            </div>
          )}
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
           <div className="text-5xl">✅</div>
           <h2 className="text-2xl font-bold text-green-600">Success!</h2>
           <p className="text-green-600 font-medium text-center">{message}</p>
           <button onClick={resetScanner} className="mt-4 px-6 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300">Scan Again</button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
           <div className="text-5xl">❌</div>
           <h2 className="text-2xl font-bold text-red-600">Failed</h2>
           <p className="text-red-600 font-medium text-center">{message}</p>
           <button onClick={resetScanner} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Try Again</button>
        </div>
      )}
    </div>
  );
};

// ── Dashboard Layout ─────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const location = useLocation();

  const tabs = [
    { name: 'Schedule', path: '/student/schedule', icon: '📅' },
    { name: 'Scan QR', path: '/student/scan', icon: '📷' },
    { name: 'My Attendance', path: '/student/attendance', icon: '📊' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col space-y-2">
        <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Student Dashboard</h1>
        {tabs.map(tab => (
          <Link
            key={tab.name}
            to={tab.path}
            className={`p-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              location.pathname.startsWith(tab.path)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-blue-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/student/schedule" replace />} />
          <Route path="schedule" element={<StudentSchedule />} />
          <Route path="scan" element={<StudentScanner />} />
          <Route path="attendance" element={<StudentAttendance />} />
        </Routes>
      </div>
    </div>
  );
};

export default StudentDashboard;
