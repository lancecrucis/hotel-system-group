import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/client';
export function useQuery<T>(path: string, refreshMs = 0) {
  const [state, setState] = useState<{ path: string; version: number; data: T | null; error: string }>({
      path: '',
      version: -1,
      data: null,
      error: '',
    }),
    [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setState({ path, version, data: value, error: '' });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setState({ path, version, data: null, error: e.message });
      });
    return () => controller.abort();
  }, [path, version]);
  useEffect(() => {
    if (!refreshMs) return;
    const timer = setInterval(reload, refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs, reload]);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path && state.version === version ? state.error : '',
    loading: state.path !== path || state.version !== version,
    reload,
  };
}
