import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  key?: React.Key;
  content: React.ReactNode;
  title?: string;
  position?: TooltipPosition;
  delay?: number;
  children?: React.ReactNode;
  className?: string;
  iconOnly?: boolean;
  iconSize?: number;
  interactive?: boolean;
  maxWidth?: string;
}

export function Tooltip({
  content,
  title,
  position = 'top',
  delay = 150,
  children,
  className = '',
  iconOnly = false,
  iconSize = 14,
  interactive = false,
  maxWidth = 'max-w-xs'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(prev => !prev);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]);

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return '-top-1 left-1/2 -translate-x-1/2 border-b-stone-900 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2 border-l-stone-900 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return '-left-1 top-1/2 -translate-y-1/2 border-r-stone-900 border-t-transparent border-b-transparent border-l-transparent';
      case 'top':
      default:
        return '-bottom-1 left-1/2 -translate-x-1/2 border-t-stone-900 border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onClick={iconOnly ? toggleTooltip : undefined}
    >
      {children ? (
        children
      ) : (
        <button
          type="button"
          aria-label={title || 'More information'}
          className="inline-flex items-center justify-center p-0.5 text-stone-400 hover:text-stone-700 transition-colors cursor-help rounded-full focus:outline-none focus:ring-1 focus:ring-stone-400"
          onClick={toggleTooltip}
        >
          <Info style={{ width: iconSize, height: iconSize }} />
        </button>
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 ${getPositionClasses()} ${maxWidth} w-max pointer-events-${interactive ? 'auto' : 'none'}`}
            style={{ minWidth: '180px' }}
          >
            <div className="bg-[#1f1f1f] text-stone-100 text-xs rounded-xl px-3.5 py-2.5 shadow-xl border border-stone-800 space-y-1 text-left leading-relaxed">
              {title && (
                <div className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5 pb-0.5 border-b border-stone-800/80">
                  <span>{title}</span>
                </div>
              )}
              <div className="text-[11px] text-stone-300 font-normal">
                {content}
              </div>
            </div>
            {/* Triangular arrow */}
            <div
              className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Explanation descriptions for Risk Levels
export const RISK_LEVEL_EXPLANATIONS: Record<string, { title: string; desc: string; colorClass: string }> = {
  none: {
    title: 'No Recorded Risk (0-9 pts)',
    desc: 'Clean record. No safety violations, fraudulent activity, or unverified claims logged.',
    colorClass: 'text-emerald-400'
  },
  low: {
    title: 'Low Risk (10-29 pts)',
    desc: 'Minor or isolated operational warnings. Historical claims resolved satisfactorily.',
    colorClass: 'text-stone-300'
  },
  medium: {
    title: 'Medium Risk (30-59 pts)',
    desc: 'Moderate risk profile with recurring vehicle care or contractual disputes. Extra reference vetting recommended.',
    colorClass: 'text-amber-400'
  },
  high: {
    title: 'High Risk (60-79 pts)',
    desc: 'Significant risk with multiple severe incident filings (late vehicle returns, defaults, or breaches). Caution advised.',
    colorClass: 'text-orange-400'
  },
  critical: {
    title: 'Critical Risk (80-100 pts)',
    desc: 'Severe safety violations, fraudulent papers, or unrecovered assets. Immediate caution required.',
    colorClass: 'text-rose-400'
  }
};

// Explanation descriptions for Verification Statuses
export const VERIFICATION_STATUS_EXPLANATIONS: Record<string, { title: string; desc: string }> = {
  approved: {
    title: 'Verified Operator Clearance',
    desc: 'Validated by compliance administrators. Full access granted to query unmasked driver profiles and submit reports.'
  },
  pending: {
    title: 'Verification In Review',
    desc: 'Company documents uploaded and currently undergoing compliance review by platform administrators.'
  },
  pending_review: {
    title: 'Pending Compliance Review',
    desc: 'Filing has been submitted and is awaiting administrative review and validation.'
  },
  rejected: {
    title: 'Verification Action Required',
    desc: 'Uploaded proof was invalid, illegible, or expired. Please upload valid fleet portal ownership documentation.'
  },
  disputed: {
    title: 'Under Active Dispute',
    desc: 'The driver has formally contested this record. Supporting counter-evidence is currently under moderation.'
  },
  resolved: {
    title: 'Dispute Resolved',
    desc: 'The complaint has been settled or clarified through formal compliance mediation.'
  },
  employed: {
    title: 'Active Fleet Placement',
    desc: 'Driver is formally affiliated and assigned to active vehicles in your fleet registry.'
  },
  active: {
    title: 'Active Status',
    desc: 'Driver is verified and eligible for vehicle assignments.'
  }
};

export function MetricTooltip({
  title,
  explanation,
  children,
  position = 'top'
}: {
  title: string;
  explanation: string;
  children: React.ReactNode;
  position?: TooltipPosition;
}) {
  return (
    <Tooltip
      title={title}
      content={explanation}
      position={position}
      maxWidth="max-w-xs"
    >
      {children}
    </Tooltip>
  );
}

export function RiskBadgeWithTooltip({
  riskLevel,
  score,
  className = '',
  badgeClass = ''
}: {
  riskLevel: string;
  score?: number;
  className?: string;
  badgeClass?: string;
}) {
  const normalizedLevel = (riskLevel || 'none').toLowerCase();
  const info = RISK_LEVEL_EXPLANATIONS[normalizedLevel] || RISK_LEVEL_EXPLANATIONS.none;

  return (
    <Tooltip
      title={info.title}
      content={
        <div className="space-y-1">
          <p>{info.desc}</p>
          {score !== undefined && (
            <p className="text-[10px] text-stone-400 pt-0.5 border-t border-stone-800">
              Risk Score: <strong className="text-white">{score}/100</strong> (Calculated from verified complaint severity & recency)
            </p>
          )}
        </div>
      }
      position="top"
    >
      <span className={`inline-flex items-center gap-1 cursor-help ${badgeClass} ${className}`}>
        <span>{riskLevel} Risk</span>
        <HelpCircle className="h-3 w-3 opacity-60 ml-0.5" />
      </span>
    </Tooltip>
  );
}

export function StatusBadgeWithTooltip({
  status,
  label,
  className = '',
  badgeClass = '',
  customExplanation
}: {
  status: string;
  label?: string;
  className?: string;
  badgeClass?: string;
  customExplanation?: string;
}) {
  const normalizedStatus = (status || 'pending').toLowerCase();
  const info = VERIFICATION_STATUS_EXPLANATIONS[normalizedStatus] || {
    title: `${label || status} Status`,
    desc: customExplanation || `Status indicating current state: ${status}`
  };

  return (
    <Tooltip
      title={info.title}
      content={customExplanation || info.desc}
      position="top"
    >
      <span className={`inline-flex items-center gap-1 cursor-help ${badgeClass} ${className}`}>
        <span>{label || status.replace('_', ' ')}</span>
        <HelpCircle className="h-2.5 w-2.5 opacity-60 ml-0.5" />
      </span>
    </Tooltip>
  );
}
