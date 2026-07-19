import { createContext, useContext } from 'react';
import type { UserRecord } from '@/src/types/api.ts';

export const SessionContext = createContext<UserRecord | null>(null);

export const useSessionUser = () => useContext(SessionContext);
