"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, PhoneOff, Loader2 } from "lucide-react";
import { isValidPhoneNumber } from "@/lib/phone-utils-client";
import PhoneInput, { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { SUPPORTED_COUNTRIES, isFromSupportedRegion } from "@/lib/regions";

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

  const handleStartCall = () => {
    if (isValidPhone && phoneNumber) {
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
              Enter your phone number and we'll call you to begin
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
              </div>
              {phoneNumber && (!isValidPhone || !isSupportedRegion) && (
                <p className="text-sm text-red-600">
                  {!isValidPhone
                    ? "Please enter a valid phone number"
                    : "We currently only support calls to the US, Australia, and India"}
                </p>
              )}
            </div>
            <Button
              onClick={handleStartCall}
              disabled={!isValidPhone || !isSupportedRegion}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
              size="lg"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              Start Interview Call
            </Button>
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
