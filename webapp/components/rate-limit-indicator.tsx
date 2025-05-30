"use client";

import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { RateLimitStatus } from "@/lib/use-rate-limit";

interface RateLimitIndicatorProps {
  rateLimitStatus: RateLimitStatus | null;
  className?: string;
}

/**
 * Format time remaining until rate limit resets
 */
function formatTimeRemaining(resetTime: number): string {
  const now = Date.now();
  const timeRemaining = Math.max(0, resetTime - now);
  
  if (timeRemaining === 0) {
    return "now";
  }
  
  const minutes = Math.floor(timeRemaining / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export default function RateLimitIndicator({ rateLimitStatus, className = "" }: RateLimitIndicatorProps) {
  if (!rateLimitStatus) {
    return null;
  }

  const { allowed, remaining, resetTime, reason, isLoading, error } = rateLimitStatus;

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking rate limit...</span>
      </div>
    );
  }

  // Error state - hide connection errors since API rate limiting works
  if (error) {
    // Don't show WebSocket connection errors as they're not user-actionable
    // The main rate limiting still works via API calls
    if (error.includes('connection not available') || error.includes('Connection error')) {
      return null; // Hide the error, API rate limiting will handle it
    }
    
    return (
      <Alert className={`border-yellow-200 bg-yellow-50 ${className}`} variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Rate limit exceeded
  if (!allowed) {
    const timeRemaining = formatTimeRemaining(resetTime);
    
    return (
      <Alert className={`border-red-200 bg-red-50 ${className}`} variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <div className="font-medium">Call limit reached</div>
            <div className="text-sm">
              {reason || "You've reached the limit of 2 calls per hour for this phone number."}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3 inline mr-1" />
              Limit resets in {timeRemaining}
            </div>
          </div>
          <Badge variant="destructive" className="ml-2">
            {remaining}/2 calls
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  // Rate limit OK - show remaining calls
  const timeRemaining = formatTimeRemaining(resetTime);
  const isLowRemaining = remaining <= 1;
  
  return (
    <Alert className={`${isLowRemaining ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'} ${className}`}>
      {isLowRemaining ? (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      ) : (
        <CheckCircle className="h-4 w-4 text-green-600" />
      )}
      <AlertDescription className="flex items-center justify-between">
        <div>
          <div className="font-medium">
            {isLowRemaining ? "Last call available" : "Calls available"}
          </div>
          <div className="text-sm text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Limit resets in {timeRemaining}
          </div>
        </div>
        <Badge 
          variant={isLowRemaining ? "secondary" : "default"}
          className={`ml-2 ${isLowRemaining ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
        >
          {remaining}/2 calls
        </Badge>
      </AlertDescription>
    </Alert>
  );
} 