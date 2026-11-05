import React, { useState } from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, LogIn, ChevronDown, ChevronUp, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  let title = 'System Operational Interruption';
  let message = 'An unexpected runtime error occurred within the GetMyHospital Emergency Health Grid.';
  let statusCode = 500;
  let details = '';

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      title = 'Healthcare Page Not Found (404)';
      message = 'The requested medical route or portal service could not be located on this node.';
    } else if (error.status === 401) {
      title = 'Authorization Required (401)';
      message = 'You must be authenticated with appropriate clinical clearance to access this resource.';
    } else if (error.status === 403) {
      title = 'Operational Clearance Denied (403)';
      message = 'Your user credentials lack required administrative privileges for this ward or console.';
    } else {
      title = `Application Exception (${error.status})`;
      message = error.statusText || message;
    }
    details = typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2);
  } else if (error instanceof Error) {
    message = error.message;
    details = error.stack || error.toString();
  } else if (typeof error === 'string') {
    message = error;
  }

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-hairline/80 shadow-float p-8 space-y-6 animate-in fade-in zoom-in-95">
        {/* Status Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mx-auto flex items-center justify-center shadow-xs">
          {statusCode === 401 || statusCode === 403 ? (
            <ShieldAlert className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            GetMyHospital Node Error Safe-Recovery
          </span>
          <h1 className="text-2xl font-bold font-display text-navy tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleReload}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Reload System
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Return Home
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/login')}
            leftIcon={<LogIn className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Switch Portal
          </Button>
        </div>

        {/* Technical Details Toggle */}
        {details && (
          <div className="pt-4 border-t border-slate-100 text-left">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              <span>Technical Diagnostics & Stack Trace</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showDetails && (
              <pre className="mt-2.5 p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-48 border border-slate-800">
                {details}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

