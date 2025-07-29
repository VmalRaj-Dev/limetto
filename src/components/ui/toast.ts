import * as React from "react";

export type ToastActionElement = React.ReactNode;
export type ToastProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: string;
};
