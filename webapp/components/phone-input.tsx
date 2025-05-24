"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, PhoneOff, Loader2, Shield, CheckCircle } from "lucide-react";
import { isValidPhoneNumber } from "@/lib/phone-utils-client";
import PhoneInput, { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { SUPPORTED_COUNTRIES, isFromSupportedRegion } from "@/lib/regions";
import { Turnstile } from '@marsidev/react-turnstile';

interface PhoneInputProps {
  onStartCall: (phoneNumber: string) => void;
  callStatus: "idle" | "calling" | "ringing" | "connected" | "ended";
  onEndCall: () => void;
}

export default function PhoneInputComponent({
  onStartCall,
  callStatus,
  onEndCall,
}: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [country, setCountry] = useState<Country>("US");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [turnstileLoading, setTurnstileLoading] = useState(true);

  // Check if verification is enabled via environment variables
  const isVerificationEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === 'true';
  const hasSiteKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Auto-verify if verification is disabled or in development mode
  useEffect(() => {
    if (!isVerificationEnabled || isDevelopment) {
      setIsVerified(true);
      console.log('🔓 Verification bypassed:', !isVerificationEnabled ? 'disabled' : 'development mode');
    }
  }, [isVerificationEnabled, isDevelopment]);

  const handleTurnstileSuccess = async (token: string) => {
    setIsVerifying(true);
    setVerificationError(null);

    try {
      // Verify token with our backend
      const response = await fetch('/api/verify-human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store verification token for API calls
        sessionStorage.setItem('turnstile_verification', token);
        sessionStorage.setItem('turnstile_timestamp', Date.now().toString());
        setIsVerified(true);
        console.log('✅ Verification successful');
      } else {
        setVerificationError(data.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError('Network error during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTurnstileError = () => {
    setTurnstileLoading(false);
    setVerificationError('Verification challenge failed to load. Please refresh the page.');
  };

  const handleTurnstileLoad = () => {
    setTurnstileLoading(false);
  };

  const handleStartCall = () => {
    if (isValidPhone && phoneNumber && isVerified) {
      onStartCall(phoneNumber);
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case "calling":
        return "Initiating call...";
      case "ringing":
        return "Calling your number...";
      case "connected":
        return "Interview in progress";
      case "ended":
        return "Interview ended";
      default:
        return "Ready to start your mock interview";
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case "calling":
      case "ringing":
        return "text-purple-600";
      case "connected":
        return "text-green-600";
      case "ended":
        return "text-gray-600";
      default:
        return "text-gray-700";
    }
  };

  const isValidPhone = isValidPhoneNumber(phoneNumber);
  const isSupportedRegion = isFromSupportedRegion(phoneNumber);
  const canStartCall = isValidPhone && isSupportedRegion && isVerified;
  
  // Only show verification if it's enabled, has site key, not in development, and phone is valid
  const showVerification = isVerificationEnabled && hasSiteKey && !isDevelopment && isValidPhone && isSupportedRegion && !isVerified;

  return (
    <div className="w-full max-w-md mx-auto">
      {callStatus === "idle" || callStatus === "ended" ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-gray-900 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
                <Phone className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Start Your Interview</h3>
            </div>
            <p className="text-gray-600">
              Enter your phone number to begin
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-gray-700"
              >
                Your Phone Number
              </Label>
              <div className="relative">
                <PhoneInput
                  international
                  countryCallingCodeEditable={false}
                  countries={SUPPORTED_COUNTRIES}
                  defaultCountry={country}
                  value={phoneNumber}
                  onChange={(value) => setPhoneNumber(value || "")}
                  onCountryChange={(country) => setCountry(country || "US")}
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isValidPhone && isSupportedRegion
                      ? "border-green-500"
                      : phoneNumber
                      ? "border-red-500"
                      : "border-input"
                  }`}
                  placeholder="Enter phone number"
                />
                {isVerified && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              {phoneNumber && (!isValidPhone || !isSupportedRegion) && (
                <p className="text-sm text-red-600">
                  {!isValidPhone
                    ? "Please enter a valid phone number"
                    : "We currently only support calls to the US, Australia, and India"}
                </p>
              )}
            </div>

            {/* Subtle Verification Section - only show when phone is valid */}
            {showVerification && (
              <div className="space-y-3">
                {verificationError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {verificationError}
                    <button 
                      onClick={() => window.location.reload()} 
                      className="underline ml-2"
                    >
                      Refresh
                    </button>
                  </div>
                )}

                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onSuccess={handleTurnstileSuccess}
                      onLoad={handleTurnstileLoad}
                      onError={handleTurnstileError}
                      options={{
                        theme: "light"
                      }}
                    />
                    {isVerifying && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-amber-600">
                      Verification not configured
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleStartCall}
              disabled={!canStartCall}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              {!isValidPhone || !isSupportedRegion ? 
                "Enter Valid Phone Number" : 
                (!isVerificationEnabled || isDevelopment || isVerified) ? 
                "Start Interview Call" :
                "Almost Ready"
              }
            </Button>

            {showVerification && (
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Just one quick step above
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {callStatus === "calling" || callStatus === "ringing" ? (
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            ) : callStatus === "connected" ? (
              <PhoneCall className="h-8 w-8 text-green-600" />
            ) : (
              <PhoneOff className="h-8 w-8 text-gray-600" />
            )}
          </div>
          <div>
            <p className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            <p className="text-sm text-gray-600">{phoneNumber}</p>
          </div>
          {callStatus === "connected" && (
            <Button
              onClick={onEndCall}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Interview
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
