import { useCallback, useRef, useState } from 'react';

import type { ToastKind } from '@/components/toast';

export function useToast(durationMs = 1600) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string, kind: ToastKind = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message: text, kind });
      timer.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs]
  );

  return { toastMessage: toast?.message ?? null, toastKind: toast?.kind ?? 'success', showToast };
}
