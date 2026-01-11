
import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg', isLoading?: boolean }> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-700",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1 w-full">
      {label && <label className="text-sm font-medium text-gray-700 block">{label}</label>}
      <input 
        className={`w-full h-10 px-3 rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode, className?: string, title?: string, action?: React.ReactNode }> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode, variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'blue' | 'purple', className?: string }> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode, maxWidth?: string, zIndex?: number }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md', zIndex = 50 }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm`} style={{ zIndex }}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto flex flex-col`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex-1 mr-4">
             {typeof title === 'string' ? (
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
             ) : (
                title
             )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <div className="p-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};