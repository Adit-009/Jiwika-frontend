import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

export interface UseLongPressAdminReturn {
  isPressing: boolean;
  progress: number;
  toastMessage: string | null;
  triggerHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onClick: (e: React.MouseEvent) => void;
  };
}

/**
 * Custom hook to handle hidden admin long-press trigger.
 * Press and hold for 5 seconds to navigate to the hidden admin login route.
 */
export function useLongPressAdmin(): UseLongPressAdminReturn {
  const navigate = useNavigate();
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs for tracking timers and animation frames
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isLongPressedRef = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of touch start coordinates to cancel if the user scrolls/moves away
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const cleanUpTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const resetPressState = useCallback(() => {
    cleanUpTimers();
    setIsPressing(false);
    setProgress(0);
    startTimeRef.current = null;
    touchStartPosRef.current = null;
  }, [cleanUpTimers]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      cleanUpTimers();
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [cleanUpTimers]);

  const handlePressStart = useCallback(
    (clientX: number, clientY: number) => {
      // Reset state and clear previous timers just in case
      resetPressState();
      isLongPressedRef.current = false;
      setIsPressing(true);

      startTimeRef.current = Date.now();
      touchStartPosRef.current = { x: clientX, y: clientY };

      // Set progress animation frame loop
      const animate = () => {
        if (!startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        const calculatedProgress = Math.min(100, (elapsed / 5000) * 100);
        setProgress(calculatedProgress);

        if (elapsed < 5000) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);

      // Set 5-second long press success timer
      timerRef.current = setTimeout(() => {
        isLongPressedRef.current = true;
        resetPressState();

        // Trigger 200ms vibration if supported
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(200);
          } catch (err) {
            console.warn("Vibration not supported or blocked by user gesture:", err);
          }
        }

        // Display small toast
        setToastMessage("Opening Admin Login...");

        // Wait 500ms then navigate to the hidden route
        navigationTimeoutRef.current = setTimeout(() => {
          setToastMessage(null);
          navigate({ to: "/jvk-admin-9xK72" });
        }, 500);
      }, 5000);
    },
    [navigate, resetPressState],
  );

  const handlePressEnd = useCallback(() => {
    // Releasing early (before 5 seconds) cancels the long press
    if (!isLongPressedRef.current) {
      resetPressState();
    }
  }, [resetPressState]);

  // Desktop Mouse Handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger on left click
      if (e.button !== 0) return;
      handlePressStart(e.clientX, e.clientY);
    },
    [handlePressStart],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handlePressEnd();
    },
    [handlePressEnd],
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      handlePressEnd();
    },
    [handlePressEnd],
  );

  // Mobile Touch Handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handlePressStart(touch.clientX, touch.clientY);
      }
    },
    [handlePressStart],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      handlePressEnd();
    },
    [handlePressEnd],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel the hold if the user moves their finger significantly (e.g., scroll attempt)
      if (!touchStartPosRef.current) return;
      const touch = e.touches[0];
      if (touch) {
        const dx = touch.clientX - touchStartPosRef.current.x;
        const dy = touch.clientY - touchStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Cancel if dragged more than 10 pixels
        if (distance > 10) {
          handlePressEnd();
        }
      }
    },
    [handlePressEnd],
  );

  // Prevent default context menus so hold works perfectly on iOS/Android
  const onContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  }, []);

  // Prevent dragging of any inner images
  const onDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    // If a long press was triggered, suppress the normal click event
    if (isLongPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressedRef.current = false;
    }
  }, []);

  return {
    isPressing,
    progress,
    toastMessage,
    triggerHandlers: {
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchEnd,
      onTouchMove,
      onContextMenu,
      onDragStart,
      onClick,
    },
  };
}
