import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { token, deviceId } = useAuth();
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [message, setMessage] = useState('');
  
  // Camera specific states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // environment (back) or user (front)
  const [history, setHistory] = useState([]);
  
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    return () => stopCamera();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attendance/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // safely ignore fetch error
    }
  };

  const startCamera = async (mode = facingMode) => {
    if (!window.isSecureContext) {
      setStatus('error');
      setMessage('Error: Camera requires HTTPS or Localhost. You are on an insecure HTTP connection.');
      return;
    }

    if (scannerRef.current) {
       await stopCamera();
    }
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
        () => {} // ignore scan noises
      );
    };

    try {
      // 1. Try requested mode
      await startWithMode({ facingMode: mode });
    } catch (err) {
      // 2. If trying environment failed, maybe it's a laptop. Try 'user' instead.
      if (mode === 'environment') {
        try {
          if (scannerRef.current) {
            scannerRef.current.clear();
          }
          setFacingMode('user');
          await startWithMode({ facingMode: 'user' });
          return;
        } catch (fallbackErr) {
          // Both failed
          setIsCameraActive(false);
          setStatus('error');
          setMessage('Camera blocked or not found. Please grant permissions.');
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
      } catch (err) {
        // cleanup fail
      }
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
      if (!payload.sessionId || !payload.qrToken) {
          throw new Error("Invalid QR Code");
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attendance/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: payload.sessionId,
          qrToken: payload.qrToken,
          deviceId: deviceId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStatus('success');
      setMessage('Attendance marked successfully!');
      fetchHistory(); // refresh list

    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Verification Failed. Make sure you are scanning the screen.');
    }
  };

  const resetScanner = () => {
    setStatus('idle');
    setMessage('');
    setScanResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fadeIn">
      
      {/* SCANNER SECTION */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mark Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Scan the live QR code on your teacher's screen.</p>
        </div>

        {status === 'idle' && !isCameraActive && (
          <div className="flex flex-col items-center justify-center space-y-6 py-10">
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <button 
              onClick={() => startCamera()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
            >
              Open Camera
            </button>
          </div>
        )}

        {(status === 'scanning' || status === 'processing') && (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border-4 border-gray-200 dark:border-gray-700 bg-black min-h-[300px] max-w-[500px] mx-auto flex items-center justify-center">
               {/* HTML5 QR Code injects video here */}
               <div id="reader" className="w-full h-full"></div>
            </div>
            
            {status === 'processing' && (
              <p className="text-center text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                Processing Attendance...
              </p>
            )}

            {isCameraActive && status === 'scanning' && (
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={toggleCameraFlip}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Flip Camera
                </button>
                <button 
                  onClick={() => {
                    stopCamera();
                    resetScanner();
                  }}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
             <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
             </div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Success!</h2>
             <p className="text-green-600 dark:text-green-400 font-medium text-center">{message}</p>
             <button 
                onClick={resetScanner} 
                className="mt-8 px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
               Scan Again
             </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
             <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
             </div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Failed</h2>
             <p className="text-red-600 dark:text-red-400 font-medium text-center px-4">{message}</p>
             <button 
                onClick={resetScanner} 
                className="mt-8 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
               Try Again
             </button>
          </div>
        )}
      </div>

      {/* HISTORY SECTION */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Attendance History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Session Name</th>
                  <th className="px-6 py-4 font-semibold">Teacher</th>
                  <th className="px-6 py-4 font-semibold text-right">Scanned Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map(record => (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                       {record.sessionId ? record.sessionId.name : 'Unknown Session'}
                    </td>
                    <td className="px-6 py-4">
                       {record.sessionId && record.sessionId.teacherId ? record.sessionId.teacherId.name : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 py-1 px-3 rounded-full text-xs font-bold shadow-sm">
                         {new Date(record.timestamp).toLocaleString()}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
