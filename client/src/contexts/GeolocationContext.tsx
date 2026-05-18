/**
 * GeolocationProvider — Context for user position management.
 * Handles browser geolocation, permission states, and manual address fallback.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { geocodeAddress } from '../api/client';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  status: 'loading' | 'granted' | 'denied' | 'timeout' | 'manual' | 'error';
  error: string | null;
}

interface GeolocationContextValue extends GeolocationState {
  setManualPosition: (lat: number, lng: number) => void;
  geocodeAndSet: (address: string) => Promise<void>;
  retry: () => void;
}

const GeolocationContext = createContext<GeolocationContextValue | null>(null);

export function useGeolocation() {
  const ctx = useContext(GeolocationContext);
  if (!ctx) throw new Error('useGeolocation must be used within GeolocationProvider');
  return ctx;
}

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    status: 'loading',
    error: null,
  });

  const requestGeolocation = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }));

    if (!navigator.geolocation) {
      setState({
        lat: null,
        lng: null,
        status: 'denied',
        error: 'Geolocalizzazione non supportata dal browser',
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      setState({
        lat: null,
        lng: null,
        status: 'timeout',
        error: 'Impossibile determinare la posizione entro 10 secondi',
      });
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          status: 'granted',
          error: null,
        });
      },
      (err) => {
        clearTimeout(timeoutId);
        if (err.code === err.PERMISSION_DENIED) {
          setState({
            lat: null,
            lng: null,
            status: 'denied',
            error: 'Permesso di geolocalizzazione negato',
          });
        } else {
          setState({
            lat: null,
            lng: null,
            status: 'error',
            error: 'Errore nella geolocalizzazione',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  const setManualPosition = useCallback((lat: number, lng: number) => {
    setState({ lat, lng, status: 'manual', error: null });
  }, []);

  const geocodeAndSet = useCallback(async (address: string) => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const result = await geocodeAddress(address);
      setState({ lat: result.lat, lng: result.lng, status: 'manual', error: null });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err.message || 'Indirizzo non trovato',
      }));
    }
  }, []);

  return (
    <GeolocationContext.Provider
      value={{ ...state, setManualPosition, geocodeAndSet, retry: requestGeolocation }}
    >
      {children}
    </GeolocationContext.Provider>
  );
}
