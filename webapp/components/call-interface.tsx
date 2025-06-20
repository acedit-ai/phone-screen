"use client";

import React, { useState, useEffect, useRef } from "react";
import TopBar from "@/components/top-bar";
import ScenarioConfiguration, { ScenarioSchema, ScenarioConfig } from "@/components/scenario-configuration";
import Transcript from "@/components/transcript";
import PhoneInputComponent from "@/components/phone-input";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Zap, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { makeVerifiedPost } from "@/lib/api";
import { scenarioService } from "@/lib/scenario-service";

type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

const CallInterface = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Scenario system state
  const [scenarios, setScenarios] = useState<ScenarioSchema[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig>({});
  const [voice, setVoice] = useState("ash");
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  // Load scenarios on component mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setIsLoadingScenarios(true);
        const availableScenarios = await scenarioService.getScenarios();
        setScenarios(availableScenarios);
        
        // Set default scenario to job-interview if available
        if (availableScenarios.length > 0) {
          const defaultScenario = availableScenarios.find(s => s.id === 'job-interview') || availableScenarios[0];
          setSelectedScenarioId(defaultScenario.id);
          
          // Set default voice from scenario if available
          if (defaultScenario.voiceOptions && defaultScenario.voiceOptions.length > 0) {
            setVoice(defaultScenario.voiceOptions[0].value);
          }
        }
      } catch (error) {
        console.error("Failed to load scenarios:", error);
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    loadScenarios();
  }, []);

  // Check if configuration is ready
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const isConfigurationReady =
    selectedScenario &&
    selectedScenario.fields.every((field) => {
      if (!field.required) return true;
      const value = scenarioConfig[field.key];
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true; // numbers & booleans (including false) are fine
    });

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
      console.log("Scenario configuration ready:", { scenarios, selectedScenarioId, scenarioConfig, voice });

      const newWs = new WebSocket(websocketUrl);

      newWs.onopen = () => {
        console.log("Connected to logs websocket");

        // Send scenario configuration immediately if ready
        if (isConfigurationReady && newWs.readyState === WebSocket.OPEN) {
          const scenarioMessage = {
            type: "scenario.configuration",
            scenarioId: selectedScenarioId,
            config: scenarioConfig,
            voice,
          };
          console.log("Sending initial scenario configuration:", scenarioMessage);
          newWs.send(JSON.stringify(scenarioMessage));

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
          console.log("Sending session update:", sessionUpdate);
          newWs.send(JSON.stringify(sessionUpdate));
        }

        // Also try again after a delay to ensure session association
        setTimeout(() => {
          if (isConfigurationReady && newWs.readyState === WebSocket.OPEN) {
            const scenarioMessage = {
              type: "scenario.configuration",
              scenarioId: selectedScenarioId,
              config: scenarioConfig,
              voice,
            };
            console.log("Retry sending scenario configuration:", scenarioMessage);
            newWs.send(JSON.stringify(scenarioMessage));
          }
        }, 1500);
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received logs event:", data);

        // Handle session status updates
        if (
          data.type === "call.status_changed" &&
          data.status === "connected"
        ) {
          console.log("Call session connected, ensuring scenario config is sent...");
          // Retry sending scenario config when we know the session is connected
          if (isConfigurationReady && newWs.readyState === WebSocket.OPEN) {
            setTimeout(() => {
              const scenarioMessage = {
                type: "scenario.configuration",
                scenarioId: selectedScenarioId,
                config: scenarioConfig,
                voice,
              };
              console.log("Retrying scenario configuration send:", scenarioMessage);
              newWs.send(JSON.stringify(scenarioMessage));
            }, 500);
          }
        }

        // Handle call ended status
        if (
          data.type === "call.status_changed" &&
          data.status === "ended"
        ) {
          console.log("Call ended detected from websocket");
          setCallStatus("ended");
        }

        handleRealtimeEvent(data, setItems, setCallStatus);
      };

      newWs.onclose = (event) => {
        console.log("Logs websocket disconnected", event.code, event.reason);
        setWs(null);

        // If the websocket closes while we're connected, it likely means the call ended
        if (callStatus === "connected") {
          console.log(
            "WebSocket closed during active call - call likely ended"
          );
          setCallStatus("ended");
        }
      };

      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      setWs(newWs);
    }
  }, [
    callStatus,
    ws,
    isConfigurationReady,
    scenarios,
    selectedScenarioId,
    scenarioConfig,
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
      setErrorMessage(null); // Clear any previous errors

      const response = await makeVerifiedPost("/api/call/outbound", {
        phoneNumber,
        // Include scenario configuration in the call request
        scenarioConfiguration: {
          scenarioId: selectedScenarioId,
          scenarioConfig,
          voice,
        },
      });

      const data = await response.json();

      // Check if the response was successful
      if (response.ok && data.success) {
        setCurrentCallSid(data.callSid);
        setCallStatus("ringing");

        // Simulate call progression (in real app, this would come from webhooks)
        timerRef.current = window.setTimeout(() => {
          setCallStatus("connected");
          timerRef.current = null;
        }, 3000);
      } else {
        // Handle errors properly
        const errorMessage = data.error || "Failed to start call";
        console.error("Failed to start call:", errorMessage);
        
        // Show user-friendly error message
        setErrorMessage(errorMessage);
        
        setCallStatus("idle"); // Return to idle state instead of "ended"
      }
    } catch (error) {
      console.error("Error starting call:", error);
      setErrorMessage("Network error occurred. Please try again.");
      setCallStatus("idle"); // Return to idle state instead of "ended"
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

        console.log(`🔌 Ending call with SID: ${currentCallSid}`);

        // Send call end message through WebSocket for immediate session cleanup
        if (ws && ws.readyState === WebSocket.OPEN) {
          const endMessage = {
            type: "call.end",
            callSid: currentCallSid,
            timestamp: new Date().toISOString()
          };
          console.log("📤 Sending call end message through WebSocket:", endMessage);
          ws.send(JSON.stringify(endMessage));
        }

        // Make API call to end the call via Twilio
        const response = await makeVerifiedPost("/api/call/end", {
          callSid: currentCallSid,
        });

        const data = await response.json();

        if (data.success) {
          console.log("✅ Call ended successfully via API");
        } else {
          console.error("❌ Failed to end call via API:", data.error);
          // Continue with cleanup even if API call failed
        }

        // Close WebSocket connection
        if (ws) {
          ws.close();
          setWs(null);
        }

        // Update UI state
        setCallStatus("ended");
        setCurrentCallSid(null);

      } catch (error) {
        console.error("Error ending call:", error);
        // Even if there's an error, still update the UI state
        if (ws) {
          ws.close();
          setWs(null);
        }
        setCallStatus("ended");
        setCurrentCallSid(null);
      }
    }
  };

  const handlePracticeAgain = () => {
    // Clean up any existing websocket connection
    if (ws) {
      console.log("Cleaning up existing websocket connection");
      ws.close();
      setWs(null);
    }

    // Clear any pending timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Reset all state for a fresh session
    setCallStatus("idle");
    setItems([]);
    setCurrentCallSid(null);
    setErrorMessage(null); // Clear any error messages
    
    console.log("State reset for new practice session");
  };

  // Get display text for current scenario
  const getScenarioDisplayText = () => {
    if (!selectedScenario) return { title: "Call", description: "AI-powered call" };
    
    if (selectedScenario.id === 'job-interview') {
      const jobTitle = scenarioConfig.jobTitle || "this position";
      const company = scenarioConfig.company || "the company";
      return {
        title: `${jobTitle} Interview`,
        description: `Interviewing for ${jobTitle} at ${company}`
      };
    }
    
    if (selectedScenario.id === 'customer-service') {
      const companyName = scenarioConfig.companyName || "the company";
      return {
        title: `${companyName} Support`,
        description: `Customer service call with ${companyName}`
      };
    }
    
    return {
      title: selectedScenario.name,
      description: selectedScenario.description
    };
  };

  const renderContent = () => {
    if (callStatus === "connected") {
      const displayText = getScenarioDisplayText();
      
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Call in Progress
            </h2>
            <p className="text-gray-600">
              {displayText.description}
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
      const displayText = getScenarioDisplayText();
      
      return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {callStatus === "calling"
                ? "Initiating Call..."
                : "Calling Your Phone"}
            </h2>
            <p className="text-gray-600">
              Please answer your phone to start the call: {displayText.description}
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
              Call Practice Complete!
            </h2>
            <p className="text-lg text-gray-600">
              Great job practicing! You're one step closer to achieving your goals.
            </p>
          </div>

          {/* Post-Call CTA */}
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
                    scenarios with personalized response recommendations.
                    Plus, get
                    <strong>
                      {" "}
                      real-time AI coaching during your actual Zoom, Teams, or
                      Google Meet calls
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
                          Realistic scenarios with personalized response
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
                          Live Call Assistance
                        </div>
                        <div className="text-gray-600">
                          Real-time coaching during actual video calls
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
                    <div className="text-gray-600">Goals Achieved</div>
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
                    onClick={handlePracticeAgain}
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
            Practice AI-Powered Calls
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
              offers advanced mock interviews that simulate real scenarios,
              plus real-time AI coaching during your actual video calls.
            </p>
          </div>
        </div>

        {/* Responsive grid layout: stacked on mobile, side-by-side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left column: Scenario Configuration */}
          <div className="space-y-6">
            <ScenarioConfiguration
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              config={scenarioConfig}
              voice={voice}
              onScenarioChange={setSelectedScenarioId}
              onConfigChange={setScenarioConfig}
              onVoiceChange={setVoice}
              isLoading={isLoadingScenarios}
            />
          </div>

          {/* Right column: Phone Input */}
          <div className="space-y-6">
            {/* Error Message Display */}
            {errorMessage && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Unable to start call</div>
                  <div className="text-sm mt-1">{errorMessage}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 text-xs"
                    onClick={() => setErrorMessage(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
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
                        Start Your Call
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      Complete the scenario details to enable phone input and verification
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      Complete the scenario details to continue
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

  // Cleanup websocket on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        console.log("Component unmounting - cleaning up websocket");
        ws.close();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [ws]);

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
                  Ready for Advanced Mock Interviews & Real Call Success?
                </h3>
                <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto">
                  This basic phone practice is just the beginning. Acedit
                  provides advanced mock interviews with personalized response
                  recommendations, plus real-time AI coaching during actual
                  calls.
                  <span className="hidden sm:inline">
                    {" "}
                    Join 3,800+ candidates who achieved their goals!
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
                  <span>Real-time call coaching</span>
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
