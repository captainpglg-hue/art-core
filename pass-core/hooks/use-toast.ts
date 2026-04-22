"use client";

import * as React from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToastVariant = "default" | "destructive" | "success";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type Action =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; toastId: string }
  | { type: "REMOVE_TOAST"; toastId: string };

type State = { toasts: Toast[] };

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function toast(props: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const duration = props.duration ?? TOAST_REMOVE_DELAY;

  dispatch({ type: "ADD_TOAST", toast: { ...props, id } });

  const timeout = setTimeout(() => {
    dispatch({ type: "DISMISS_TOAST", toastId: id });
    toastTimeouts.delete(id);
  }, duration);

  toastTimeouts.set(id, timeout);
  return id;
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (toastId: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
