"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

export interface AuthUser {
  userId: string;
  name: string;
  role: 'employee' | 'manager';
  department: string;
}

export interface WorkTrackerState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

export type WorkTrackerAction =
  | { type: 'LOGIN'; payload: { user: AuthUser; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { user: AuthUser; token: string } }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: WorkTrackerState = {
  user: null,
  token: null,
  isLoading: true,
};

function workTrackerReducer(state: WorkTrackerState, action: WorkTrackerAction): WorkTrackerState {
  switch (action.type) {
    case 'LOGIN':
    case 'RESTORE_SESSION':
      return { ...state, user: action.payload.user, token: action.payload.token, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const WorkTrackerContext = createContext<{
  state: WorkTrackerState;
  dispatch: React.Dispatch<WorkTrackerAction>;
} | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workTrackerReducer, initialState);

  useEffect(() => {
    // Restore session on mount
    const storedToken = localStorage.getItem('pgepl_token');
    const storedUser = localStorage.getItem('pgepl_user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: 'RESTORE_SESSION', payload: { user, token: storedToken } });
      } catch (e) {
        dispatch({ type: 'LOGOUT' });
      }
    } else {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  return (
    <WorkTrackerContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkTrackerContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(WorkTrackerContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
