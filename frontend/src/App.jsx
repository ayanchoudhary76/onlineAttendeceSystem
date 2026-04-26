import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/admin" />;
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col pt-16">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
              <Routes>
                <Route path="/" element={<Login />} />
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/teacher/*" 
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student/*" 
                  element={
                    <ProtectedRoute allowedRole="student">
                      <StudentDashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
