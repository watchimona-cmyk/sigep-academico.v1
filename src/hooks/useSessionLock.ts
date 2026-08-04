import { useState, useEffect, useCallback, useRef } from 'react';
import { Staff } from '../types';

interface UseSessionLockProps {
  loggedInStaff: Staff | null;
  onLockStateChange?: (isLocked: boolean) => void;
}

export function useSessionLock({ loggedInStaff, onLockStateChange }: UseSessionLockProps) {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const hasStaff = sessionStorage.getItem('sigep_logged_in_staff_v1') || localStorage.getItem('sigep_logged_in_staff_v1');
      if (!hasStaff) return false;
      return sessionStorage.getItem('sigep_session_locked_v1') === 'true' || localStorage.getItem('sigep_session_locked_v1') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Tempo de inatividade padrão: 10 minutos (10 * 60 * 1000 ms)
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const lockSession = useCallback(() => {
    if (!loggedInStaff) return;
    setIsLocked(true);
    try {
      localStorage.setItem('sigep_session_locked_v1', 'true');
    } catch (e) {
      console.warn('Erro ao persistir estado de bloqueio:', e);
    }
    if (onLockStateChange) {
      onLockStateChange(true);
    }
  }, [loggedInStaff, onLockStateChange]);

  const unlockSession = useCallback((password: string): boolean => {
    if (!loggedInStaff) return false;
    const correctPassword = loggedInStaff.password || '12345';
    if (password === correctPassword) {
      setIsLocked(false);
      try {
        localStorage.removeItem('sigep_session_locked_v1');
      } catch (e) {
        console.warn('Erro ao remover estado de bloqueio:', e);
      }
      if (onLockStateChange) {
        onLockStateChange(false);
      }
      lastActivityRef.current = Date.now();
      resetInactivityTimer();
      return true;
    }
    return false;
  }, [loggedInStaff, onLockStateChange]);

  // Função para reiniciar o cronómetro de inatividade
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Só ativa o temporizador de inatividade se houver um utilizador logado e a sessão não estiver bloqueada
    if (loggedInStaff && !isLocked) {
      timeoutRef.current = setTimeout(() => {
        console.log('Sessão bloqueada por inatividade do utilizador.');
        lockSession();
      }, INACTIVITY_TIMEOUT);
    }
  }, [loggedInStaff, isLocked, lockSession]);

  // Monitorizar atividade do utilizador e visibilidade da página ao retomar do repouso
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      resetInactivityTimer();
    };

    const handleVisibilityOrFocus = () => {
      if (loggedInStaff && !isLocked) {
        if (document.visibilityState === 'visible') {
          const timeElapsed = Date.now() - lastActivityRef.current;
          if (timeElapsed >= INACTIVITY_TIMEOUT) {
            console.log('Sessão bloqueada por inatividade durante repouso.');
            lockSession();
          } else {
            resetInactivityTimer();
          }
        }
      }
    };

    if (loggedInStaff && !isLocked) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      window.addEventListener('focus', handleVisibilityOrFocus);
      
      // Inicializar o cronómetro
      resetInactivityTimer();
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loggedInStaff, isLocked, resetInactivityTimer, lockSession]);

  // Integração com IPC do Electron para capturar suspensão / bloqueio do OS
  useEffect(() => {
    if (!loggedInStaff) return;

    const handleOSSuspendOrLock = () => {
      console.log('Sinal de bloqueio de OS / suspensão capturado via IPC.');
      lockSession();
    };

    // Registrar o ouvinte IPC seguro caso o objeto window.electronAPI esteja exposto pelo preload
    if (window && (window as any).electronAPI && (window as any).electronAPI.onOSSuspendLock) {
      (window as any).electronAPI.onOSSuspendLock(handleOSSuspendOrLock);
    }

    return () => {
      if (window && (window as any).electronAPI && (window as any).electronAPI.removeOSSuspendLockListener) {
        (window as any).electronAPI.removeOSSuspendLockListener(handleOSSuspendOrLock);
      }
    };
  }, [loggedInStaff, lockSession]);

  return {
    isLocked,
    lockSession,
    unlockSession,
    resetInactivityTimer
  };
}
