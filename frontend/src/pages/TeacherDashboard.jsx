import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TeacherDashboard = () => {
  const { token } = useAuth();
  const [sessionName, setSessionName] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDataTarget, setExportDataTarget] = useState(null); 
  const [exportingSessionName, setExportingSessionName] = useState('');

  // Detailed Attendee View Modal State
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [modalAttendees, setModalAttendees] = useState([]);

  useEffect(() => {
    fetchPastSessions();
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('qr_update', (data) => {
        const payload = JSON.stringify({ sessionId: data.sessionId, qrToken: data.qrToken });
        setQrToken(payload);
      });

      socket.on('student_scanned', (data) => {
        setAttendees((prev) => [data, ...prev]);
      });
    }
  }, [socket]);

  const fetchPastSessions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPastSessions(data);
    } catch {
      console.error("Failed to fetch past sessions");
    }
  };

  const startSession = async () => {
    if (!sessionName) {
      setError('Please enter a session name');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: sessionName })
      });
      const session = await res.json();
      if (!res.ok) throw new Error(session.message || 'Error creating session');
      
      setActiveSession(session);
      setAttendees([]); // clear attendees array
      socket.emit('start_session', { sessionId: session._id, token });
    } catch (err) {
      setError(err.message || 'Failed to start session');
    }
  };

  const endSession = async () => {
    if (activeSession && socket) {
      socket.emit('stop_session', { sessionId: activeSession._id });
      
      // Open export modal for the newly finished session
      triggerExportModal(activeSession._id, activeSession.name);
    }
    setActiveSession(null);
    setQrToken(null);
    setSessionName('');
    fetchPastSessions();
  };

  // ----- EXPORT LOGIC ----- //
  const triggerExportModal = async (sessionId, sessionNameStr) => {
    setExportingSessionName(sessionNameStr);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sessions/${sessionId}/attendees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setExportDataTarget(data);
      setShowExportModal(true);
    } catch {
      setError("Failed to fetch final attendance for export.");
    }
  };

  const handleExport = () => {
    if (!exportDataTarget || exportDataTarget.length === 0) {
      alert("No attendance data to export.");
      setShowExportModal(false);
      return;
    }

    const exportName = `${exportingSessionName.replace(/\s+/g, '_')}_Attendance`;
    
    // Prepare Data Array
    const sheetData = exportDataTarget.map((att, idx) => ({
      "S.No": idx + 1,
      "Student Name": att.studentId ? att.studentId.name : (att.studentName || 'Unknown'),
      "Email": att.studentId ? (att.studentId.email || 'N/A') : 'N/A',
      "Timestamp": new Date(att.timestamp).toLocaleString()
    }));

    if (exportFormat === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${exportName}.csv`;
      link.click();
    } else if (exportFormat === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
      XLSX.writeFile(workbook, `${exportName}.xlsx`);
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF();
      doc.text(`Attendance Sheet: ${exportingSessionName}`, 14, 15);
      
      const head = [['S.No', 'Student Name', 'Email', 'Timestamp']];
      const items = sheetData.map(d => [d['S.No'], d['Student Name'], d['Email'], d['Timestamp']]);
      
      doc.autoTable({
        head: head,
        body: items,
        startY: 20
      });
      doc.save(`${exportName}.pdf`);
    }

    setShowExportModal(false);
  };

  // ----- VIEW ATTENDEES FROM PAST SESSIONS ----- //
  const viewPastAttendees = async (sessionId, sName) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sessions/${sessionId}/attendees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setModalAttendees(data);
      setExportingSessionName(sName);
      setShowAttendeesModal(true);
    } catch {
      setError("Failed to load attendees");
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER TRAY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your attendance sessions</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex space-x-3">
          {!activeSession ? (
            <>
              <input
                type="text"
                placeholder="Ex. CS101 Lecture"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
              <button
                onClick={startSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow transition-colors"
                disabled={activeSession !== null}
              >
                Start Session
              </button>
            </>
          ) : (
            <button
              onClick={endSession}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium shadow transition-colors animate-pulse"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* ACTIVE SESSION PANELS */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></span>
              Live QR Code
            </h2>
            
            <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
              {(() => {
                const QRCodeComponent = QRCode.default ? QRCode.default : QRCode;
                return qrToken ? (
                  <QRCodeComponent value={qrToken} size={280} level="H" />
                ) : (
                  <div className="w-[280px] h-[280px] flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
                    Generating...
                  </div>
                );
              })()}
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center flex items-center justify-center">
              Rotating every 5 seconds to prevent sharing.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Attendees
              </h2>
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 py-1 px-3 rounded-full text-sm font-bold">
                {attendees.length} Present
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
              {attendees.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  <p>Waiting for students to scan...</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {attendees.map((attendee, idx) => (
                    <li key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-100 text-green-700 p-2 rounded-full">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {attendee.studentName || 'Student'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(attendee.timestamp).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL SESSIONS LIST */}
      {!activeSession && pastSessions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Past Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Session Name</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pastSessions.map(sess => (
                  <tr key={sess._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{sess.name}</td>
                    <td className="px-6 py-4">{new Date(sess.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 flex justify-end space-x-3">
                      <button 
                        onClick={() => viewPastAttendees(sess._id, sess.name)}
                        className="text-blue-600 hover:text-blue-800 font-medium bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-md"
                      >
                        View List
                      </button>
                      <button 
                         onClick={() => triggerExportModal(sess._id, sess.name)}
                         className="text-green-600 hover:text-green-800 font-medium bg-green-50 dark:bg-green-900/40 px-3 py-1 rounded-md"
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPORT DATA MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800  w-full max-w-md rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Export Attendance Data</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Select your preferred format for downloading the attendance sheet for <strong>{exportingSessionName}</strong>.</p>
            
            <div className="space-y-3 mb-8">
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input type="radio" className="w-5 h-5 text-blue-600" name="format" value="csv" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} />
                <span className="ml-3 font-medium text-gray-700 dark:text-gray-200">CSV File (.csv)</span>
              </label>
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input type="radio" className="w-5 h-5 text-blue-600" name="format" value="excel" checked={exportFormat === 'excel'} onChange={() => setExportFormat('excel')} />
                <span className="ml-3 font-medium text-gray-700 dark:text-gray-200">Excel Sheet (.xlsx)</span>
              </label>
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input type="radio" className="w-5 h-5 text-blue-600" name="format" value="pdf" checked={exportFormat === 'pdf'} onChange={() => setExportFormat('pdf')} />
                <span className="ml-3 font-medium text-gray-700 dark:text-gray-200">PDF Document (.pdf)</span>
              </label>
            </div>

            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleExport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition"
              >
                Download Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDEES VIEW MODAL */}
      {showAttendeesModal && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Attendance Roster</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{exportingSessionName}</p>
              </div>
              <button 
                onClick={() => setShowAttendeesModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                Close
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              {modalAttendees.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No attendees found for this session.</div>
              ) : (
                <div className="space-y-3">
                  {modalAttendees.map((att, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                       <div>
                         <p className="font-semibold text-gray-900 dark:text-white">{att.studentId ? att.studentId.name : 'Unknown'}</p>
                         <p className="text-sm text-gray-500">{att.studentId ? att.studentId.email : ''}</p>
                       </div>
                       <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                         {new Date(att.timestamp).toLocaleString()}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
         </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
