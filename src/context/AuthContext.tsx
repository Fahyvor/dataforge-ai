import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, getStoredToken, setStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerUser: (payload: {
    name: string;
    email: string;
    password: string;
    organization?: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api.auth
      .me()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setStoredToken(res.token);
    setUser(res.user);
  };

  const registerUser = async (payload: {
    name: string;
    email: string;
    password: string;
    organization?: string;
    role: UserRole;
  }) => {
    const res = await api.auth.register(payload);
    setStoredToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await api.auth.logout();
    setStoredToken(null);
    setUser(null);
  };

  const updateRole = async (newRole: UserRole) => {
    const res = await api.auth.updateRole(newRole);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{ user, authLoading, loginWithCredentials, registerUser, logout, updateRole }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
