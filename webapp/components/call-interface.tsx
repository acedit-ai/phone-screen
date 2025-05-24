"use client";

import React, { useState, useEffect, useRef } from "react";
import TopBar from "@/components/top-bar";
import JobConfiguration from "@/components/job-configuration";
import Transcript from "@/components/transcript";
import PhoneInputComponent from "@/components/phone-input";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { makeVerifiedPost } from "@/lib/api";

type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

const CallInterface = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Job configuration state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [voice, setVoice] = useState("ash");

  // Check if basic configuration is complete
  const isConfigurationReady = jobTitle.trim() !== "" && company.trim() !== "";

  // Connect to websocket when call is connected
  useEffect(() => {
    if (callStatus === "connected" && !ws) {
      const websocketServerUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;

      let websocketUrl: string;

      if (websocketServerUrl) {
        // Convert https://server-url to wss://server-url for WebSocket connection
        const protocol = websocketServerUrl.startsWith("https:")
          ? "wss:"
          : "ws:";
        const host = websocketServerUrl.replace(/^https?:\/\//, "");
        websocketUrl = `${protocol}//${host}/logs`;
      } else {
        // Check if we're in development (localhost)
        const isDevelopment =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1");

        if (isDevelopment) {
          // Development: Use localhost
          const protocol =
            window.location.protocol === "https:" ? "wss:" : "ws:";
          websocketUrl = `${protocol}//localhost:8081/logs`;
        } else {
          // Production but no NEXT_PUBLIC_WEBSOCKET_SERVER_URL set - this is an error
          console.error(
            "NEXT_PUBLIC_WEBSOCKET_SERVER_URL environment variable is required in production"
          );
          console.error(
            "Please set NEXT_PUBLIC_WEBSOCKET_SERVER_URL to your WebSocket server URL (e.g., https://websocket-server-red-resonance-1640.fly.dev)"
          );
          return;
        }
      }

      console.log("Connecting to logs websocket:", websocketUrl);

      const newWs = new WebSocket(websocketUrl);

      newWs.onopen = () => {
        console.log("Connected to logs websocket");

        // Wait a moment for session association to complete before sending job config
        setTimeout(() => {
          if (isConfigurationReady && newWs.readyState === WebSocket.OPEN) {
            const jobConfig = {
              type: "job.configuration",
              jobTitle,
              company,
              jobDescription,
              voice,
            };
            console.log("Sending job configuration:", jobConfig);
            newWs.send(JSON.stringify(jobConfig));

            // Also send session update with voice
            const sessionUpdate = {
              type: "session.update",
              session: {
                voice,
                modalities: ["text", "audio"],
                turn_detection: { type: "server_vad" },
                input_audio_transcription: { model: "whisper-1" },
                input_audio_format: "g711_ulaw",
                output_audio_format: "g711_ulaw",
              },
            };
            newWs.send(JSON.stringify(sessionUpdate));
          }
        }, 1500); // Wait 1.5 seconds for session to be properly set up
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received logs event:", data);

        // Handle session status updates
        if (
          data.type === "call.status_changed" &&
          data.status === "connected"
        ) {
          console.log("Call session connected, ensuring job config is sent...");
          // Retry sending job config when we know the session is connected
          if (isConfigurationReady && newWs.readyState === WebSocket.OPEN) {
            setTimeout(() => {
              const jobConfig = {
                type: "job.configuration",
                jobTitle,
                company,
                jobDescription,
                voice,
              };
              console.log("Retrying job configuration send:", jobConfig);
              newWs.send(JSON.stringify(jobConfig));
            }, 500);
          }
        }

        handleRealtimeEvent(data, setItems, setCallStatus);
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);

        // If the websocket closes while we're connected, it likely means the call ended
        if (callStatus === "connected") {
          console.log(
            "WebSocket closed during active call - call likely ended"
          );
          setCallStatus("ended");
        }
      };

      setWs(newWs);
    }
  }, [
    callStatus,
    ws,
    isConfigurationReady,
    jobTitle,
    company,
    jobDescription,
    voice,
  ]);

  // Handle call status changes, particularly when call ends
  useEffect(() => {
    if (callStatus === "ended") {
      // Clean up WebSocket connection if it exists
      if (ws) {
        ws.close();
        setWs(null);
      }

      setCurrentCallSid(null);

      // No automatic reset - let user decide when to start a new session
      // The "Practice Again" button and other interactions will handle state reset
    }
  }, [callStatus]); // Removed automatic timer - screen stays until user action

  const handleStartCall = async (phoneNumber: string) => {
    try {
      setCallStatus("calling");

      const response = await makeVerifiedPost("/api/call/outbound", {
        phoneNumber,
        // Include job configuration in the call request
        jobConfiguration: {
          jobTitle,
          company,
          jobDescription,
          voice,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCallSid(data.callSid);
        setCallStatus("ringing");

        // Simulate call progression (in real app, this would come from webhooks)
        timerRef.current = window.setTimeout(() => {
          setCallStatus("connected");
          timerRef.current = null;
        }, 3000);
      } else {
        console.error("Failed to start call:", data.error);
        setCallStatus("ended");
      }
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("ended");
    }
  };

  const handleEndCall = async () => {
    if (currentCallSid) {
      try {
        // Clear any pending connection timer
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        // In a real app, you'd make an API call to end the call
        // await fetch(`/api/call/${currentCallSid}/end`, { method: 'POST' });

        if (ws) {
          ws.close();
          setWs(null);
        }

        setCallStatus("ended");
        setCurrentCallSid(null);

        // Remove duplicate timer - useEffect handles the reset
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
  };

  const renderContent = () => {
    if (callStatus === "connected") {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Interview in Progress
            </h2>
            <p className="text-gray-600">
              Interviewing for{" "}
              <span className="font-medium text-purple-600">{jobTitle}</span> at{" "}
              <span className="font-medium text-purple-600">{company}</span>
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <PhoneInputComponent
              onStartCall={handleStartCall}
              callStatus={callStatus}
              onEndCall={handleEndCall}
            />
          </div>

          <Transcript items={items} />
        </div>
      );
    }

    if (callStatus === "calling" || callStatus === "ringing") {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {callStatus === "calling"
                ? "Initiating Call..."
                : "Calling Your Phone"}
            </h2>
            <p className="text-gray-600">
              Please answer your phone to start the interview for{" "}
              <span className="font-medium text-purple-600">{jobTitle}</span> at{" "}
              <span className="font-medium text-purple-600">{company}</span>
            </p>
          </div>

          <PhoneInputComponent
            onStartCall={handleStartCall}
            callStatus={callStatus}
            onEndCall={handleEndCall}
          />
        </div>
      );
    }

    if (callStatus === "ended") {
      return (
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Interview Practice Complete!
            </h2>
            <p className="text-lg text-gray-600">
              Great job practicing! You're one step closer to landing your dream
              role.
            </p>
          </div>

          {/* Post-Interview CTA */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="flex items-center gap-3 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    <span>Ready for the Real Thing?</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Upgrade to Advanced Mock Interviews + Real-Time Coaching
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    This basic practice was just the start! Acedit offers{" "}
                    <strong>advanced mock interviews</strong> that simulate real
                    job scenarios with personalized response recommendations.
                    Plus, get
                    <strong>
                      {" "}
                      real-time AI coaching during your actual Zoom, Teams, or
                      Google Meet interviews
                    </strong>
                    .
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg text-left">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 text-xs">🎯</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Advanced Mock Interviews
                        </div>
                        <div className="text-gray-600">
                          Realistic job scenarios with personalized response
                          suggestions
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg text-left">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 text-xs">⚡</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Live Interview Assistance
                        </div>
                        <div className="text-gray-600">
                          Real-time coaching during actual video interviews
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      3,800+
                    </div>
                    <div className="text-gray-600">Candidates Helped</div>
                  </div>
                  <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      3,000+
                    </div>
                    <div className="text-gray-600">Jobs Landed</div>
                  </div>
                  <div className="flex flex-col items-center space-y-2 p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      98%+
                    </div>
                    <div className="text-gray-600">Users Satisfied</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Link
                      href="https://www.acedit.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Try Acedit Free
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setCallStatus("idle");
                      setItems([]);
                    }}
                    className="px-8 py-3 text-lg border-gray-300 hover:bg-gray-50"
                  >
                    Practice Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">
            Practice Phone Interviews with AI
          </h2>
          <div className="text-lg text-gray-600 max-w-2xl mx-auto">
            <p className="mb-2">Get started with this free AI practice tool.</p>
            <p>
              Ready for more?{" "}
              <a
                href="https://www.acedit.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 font-semibold underline decoration-2 underline-offset-2"
              >
                Acedit
              </a>{" "}
              offers advanced mock interviews that simulate real job scenarios,
              plus real-time AI coaching during your actual video interviews.
            </p>
          </div>
        </div>

        {/* Responsive grid layout: stacked on mobile, side-by-side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left column: Job Configuration */}
          <div className="space-y-6">
            <JobConfiguration
              jobTitle={jobTitle}
              company={company}
              jobDescription={jobDescription}
              voice={voice}
              onJobTitleChange={setJobTitle}
              onCompanyChange={setCompany}
              onJobDescriptionChange={setJobDescription}
              onVoiceChange={setVoice}
            />
          </div>

          {/* Right column: Phone Input */}
          <div className="space-y-6">
            {isConfigurationReady ? (
              <Card className="w-full lg:sticky lg:top-8">
                <CardContent className="p-6">
                  <PhoneInputComponent
                    onStartCall={handleStartCall}
                    callStatus={callStatus}
                    onEndCall={handleEndCall}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Start Your Interview
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      Complete the job details to enable phone input and verification
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      Complete the job details to continue
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
      <TopBar />
      <div className="flex-grow p-6 flex items-center justify-center">
        {renderContent()}
      </div>

      {/* Footer CTA - only show on main page, not during calls */}
      {(callStatus === "idle" || callStatus === "ended") && (
        <footer className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Ready for Advanced Mock Interviews & Real Interview Success?
                </h3>
                <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto">
                  This basic phone practice is just the beginning. Acedit
                  provides advanced mock interviews with personalized response
                  recommendations, plus real-time AI coaching during actual
                  interviews.
                  <span className="hidden sm:inline">
                    {" "}
                    Join 3,800+ candidates who landed jobs!
                  </span>
                </p>
              </div>

              {/* Mobile: Simple vertical list, Desktop: Horizontal list */}
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-8 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Advanced mock interviews</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Personalized response suggestions</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Real-time interview coaching</span>
                </div>
              </div>

              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 sm:px-8 py-3 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
              >
                <Link
                  href="https://www.acedit.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Zap className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  Get Acedit
                  <ExternalLink className="w-3 sm:w-4 h-3 sm:h-4 ml-2" />
                </Link>
              </Button>

              <p className="text-xs text-gray-400">
                Free tier available • No credit card required • Chrome extension
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default CallInterface;
