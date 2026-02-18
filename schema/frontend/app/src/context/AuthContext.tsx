"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, Business, FiscalYear } from "@/types";
import { api, setAccessToken } from "@/lib/api";
import { logger, resetCorrelationId } from "@/lib/logger";

interface AuthState {
  user: User | null;
  businesses: Business[];
  activeBusiness: Business | null;
  fiscalYears: FiscalYear[];
  activeFiscalYear: FiscalYear | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchBusiness: (business: Business) => void;
  switchFiscalYear: (fy: FiscalYear) => void;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [activeFiscalYear, setActiveFiscalYear] = useState<FiscalYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const data = await api<{
          user: User;
          businesses: Business[];
        }>("/auth/me", {}, "AuthProvider");

        if (!mounted) return;
        setUser(data.user);
        setBusinesses(data.businesses);
        if (data.businesses.length > 0) {
          setActiveBusiness(data.businesses[0]);
        }
      } catch {
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeBusiness) {
      setFiscalYears([]);
      setActiveFiscalYear(null);
      return;
    }

    let mounted = true;

    async function loadFiscalYears() {
      try {
        const data = await api<FiscalYear[]>(
          `/businesses/${activeBusiness!.id}/fiscal-years`,
          {},
          "AuthProvider"
        );
        if (!mounted) return;
        setFiscalYears(data);
        if (data.length > 0) setActiveFiscalYear(data[0]);
      } catch {
        if (mounted) {
          setFiscalYears([]);
          setActiveFiscalYear(null);
        }
      }
    }

    loadFiscalYears();
    return () => { mounted = false; };
  }, [activeBusiness]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api<{
        accessToken: string;
        user: User;
        businesses: Business[];
      }>("/auth/login", { method: "POST", body: { email, password } }, "LoginForm");

      setAccessToken(data.accessToken);
      setUser(data.user);
      setBusinesses(data.businesses);
      if (data.businesses.length > 0) setActiveBusiness(data.businesses[0]);
      resetCorrelationId();
      logger.loginSuccess({ userId: data.user.id });
    } catch (err) {
      logger.loginFailure({ email, error: String(err) });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" }, "Header");
    } finally {
      logger.logout();
      setAccessToken(null);
      setUser(null);
      setBusinesses([]);
      setActiveBusiness(null);
      setFiscalYears([]);
      setActiveFiscalYear(null);
    }
  }, []);

  const switchBusiness = useCallback((business: Business) => {
    setActiveBusiness(business);
    logger.businessSwitch({ businessId: business.id, businessName: business.name });
  }, []);

  const switchFiscalYear = useCallback((fy: FiscalYear) => {
    setActiveFiscalYear(fy);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      businesses,
      activeBusiness,
      fiscalYears,
      activeFiscalYear,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      switchBusiness,
      switchFiscalYear,
    }),
    [user, businesses, activeBusiness, fiscalYears, activeFiscalYear, isLoading, login, logout, switchBusiness, switchFiscalYear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
