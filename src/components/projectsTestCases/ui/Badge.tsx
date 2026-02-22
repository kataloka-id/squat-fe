import React, { useState, useEffect } from 'react';
import { Priority, Status, AutomationType } from '../types.ts';

interface BadgeProps {
  type: 'priority' | 'status' | 'tag' | 'automation';
  value: string;
  onClick?: () => void;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, onClick, className = '' }) => {
  // Base style: rounded-md for a more technical feel than full rounded-full
  let containerStyles = "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border transition-colors duration-200 ";
  let dotStyles = "mr-1.5 h-2 w-2 rounded-full";
  let dotColor = "";

  if (onClick) {
    containerStyles += " cursor-pointer hover:shadow-sm ";
  }

  if (type === 'priority') {
    switch (value) {
      case Priority.Critical:
        containerStyles += " bg-red-50 text-red-700 border-red-200" + (onClick ? " hover:bg-red-100" : "");
        dotColor = "bg-red-500";
        break;
      case Priority.High:
        containerStyles += " bg-orange-50 text-orange-700 border-orange-200" + (onClick ? " hover:bg-orange-100" : "");
        dotColor = "bg-orange-500";
        break;
      case Priority.Medium:
        containerStyles += " bg-blue-50 text-blue-700 border-blue-200" + (onClick ? " hover:bg-blue-100" : "");
        dotColor = "bg-blue-500";
        break;
      case Priority.Low:
        containerStyles += " bg-slate-50 text-slate-600 border-slate-200" + (onClick ? " hover:bg-slate-100" : "");
        dotColor = "bg-slate-400";
        break;
    }
  } else if (type === 'status') {
    switch (value) {
      case Status.Ready:
        containerStyles += " bg-emerald-50 text-emerald-700 border-emerald-200" + (onClick ? " hover:bg-emerald-100" : "");
        dotColor = "bg-emerald-500";
        break;
      case Status.Draft:
        containerStyles += " bg-amber-50 text-amber-700 border-amber-200" + (onClick ? " hover:bg-amber-100" : "");
        dotColor = "bg-amber-500";
        break;
      case Status.Review:
        containerStyles += " bg-brand-50 text-brand-700 border-brand-200" + (onClick ? " hover:bg-brand-100" : "");
        dotColor = "bg-brand-500";
        break;
      case Status.Deprecated:
        containerStyles += " bg-slate-100 text-slate-500 border-slate-200" + (onClick ? " hover:bg-slate-200" : "");
        dotColor = "bg-slate-400";
        break;
    }
  } else if (type === 'automation') {
    switch (value) {
      case AutomationType.UI:
        containerStyles += " bg-violet-50 text-violet-700 border-violet-200";
        dotColor = "bg-violet-500";
        break;
      case AutomationType.API:
        containerStyles += " bg-cyan-50 text-cyan-700 border-cyan-200";
        dotColor = "bg-cyan-500";
        break;
      case AutomationType.Manual:
        containerStyles += " bg-slate-100 text-slate-600 border-slate-200";
        dotColor = "bg-slate-400";
        break;
      default:
        containerStyles += " bg-slate-50 text-slate-600 border-slate-200";
        dotColor = "bg-slate-400";
    }
  } else {
    // Tags
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
        #{value}
      </span>
    );
  }

  return (
    <span className={`${containerStyles} ${className}`} onClick={onClick}>
      <span className={dotStyles + " " + dotColor}></span>
      {value}
    </span>
  );
};