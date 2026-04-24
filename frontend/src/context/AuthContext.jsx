import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const parseToken = (t) => {
    try {
      if (!t || typeof t !== 'string' || !t.includes('.')) return null;
      return JSON.parse(atob(t.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    return parseToken(localStorage.getItem('token'));
  });
  
  // We identify devices to ensure one device per student
  const [deviceId, setDeviceId] = useState(localStorage.getItem('deviceId') || '');

  useEffect(() => {
    if (!deviceId) {
      const newDeviceId = 'device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', newDeviceId);
      setDeviceId(newDeviceId);
    }
  }, [deviceId]);

  useEffect(() => {
    if (token) {
      const payload = parseToken(token);
      if (payload) setUser(payload);
      else logout();
    } else {
      setUser(null);
    }
  }, [token]);

  const login = (userData, jwtToken) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, deviceId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
