"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/top-bar";
import ChecklistAndConfig from "@/components/checklist-and-config";
import SessionConfigurationPanel from "@/components/session-configuration-panel";
import Transcript from "@/components/transcript";
import FunctionCallsPanel from "@/components/function-calls-panel";
import PhoneInputComponent from "@/components/phone-input";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";

type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

const CallInterface = () => {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [allConfigsReady, setAllConfigsReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);

  // Connect to websocket when configs are ready and we're in a call
  useEffect(() => {
    if (allConfigsReady && callStatus === "connected" && !ws) {
      // Use ngrok URL if available, otherwise fall back to localhost
      const websocketServerUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;
      
      let websocketUrl: string;
      
      if (websocketServerUrl) {
        // Convert https://ngrok-url to wss://ngrok-url for WebSocket connection
        const protocol = websocketServerUrl.startsWith("https:") ? "wss:" : "ws:";
        const host = websocketServerUrl.replace(/^https?:\/\//, "");
        websocketUrl = `${protocol}//${host}/logs`;
      } else {
        // Fallback to localhost for development without ngrok
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        websocketUrl = `${protocol}//localhost:8081/logs`;
      }

      console.log("Connecting to logs websocket:", websocketUrl);

      const newWs = new WebSocket(websocketUrl);

      newWs.onopen = () => {
        console.log("Connected to logs websocket");
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received logs event:", data);
        handleRealtimeEvent(data, setItems);
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);
      };

      setWs(newWs);
    }
  }, [allConfigsReady, callStatus, ws]);

  const handleStartCall = async (phoneNumber: string) => {
    try {
      setCallStatus("calling");
      setSelectedPhoneNumber(phoneNumber);

      const response = await fetch("/api/call/outbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCallSid(data.callSid);
        setCallStatus("ringing");

        // Simulate call progression (in real app, this would come from webhooks)
        setTimeout(() => {
          setCallStatus("connected");
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
        // In a real app, you'd make an API call to end the call
        // await fetch(`/api/call/${currentCallSid}/end`, { method: 'POST' });

        if (ws) {
          ws.close();
          setWs(null);
        }

        setCallStatus("ended");
        setCurrentCallSid(null);

        // Reset after a delay
        setTimeout(() => {
          setCallStatus("idle");
          setItems([]);
        }, 2000);
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      <ChecklistAndConfig
        ready={allConfigsReady}
        setReady={setAllConfigsReady}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
      />
      <TopBar />
      <div className="flex-grow p-4 h-full overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left Column */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden">
            <SessionConfigurationPanel
              callStatus={
                callStatus === "connected" ? "connected" : "disconnected"
              }
              onSave={(config) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  const updateEvent = {
                    type: "session.update",
                    session: {
                      ...config,
                    },
                  };
                  console.log("Sending update event:", updateEvent);
                  ws.send(JSON.stringify(updateEvent));
                }
              }}
            />
          </div>

          {/* Middle Column */}
          <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden">
            {callStatus === "idle" || callStatus === "ended" ? (
              <div className="flex items-center justify-center h-full">
                <PhoneInputComponent
                  onStartCall={handleStartCall}
                  callStatus={callStatus}
                  onEndCall={handleEndCall}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <PhoneInputComponent
                    onStartCall={handleStartCall}
                    callStatus={callStatus}
                    onEndCall={handleEndCall}
                  />
                </div>
                {callStatus === "connected" && <Transcript items={items} />}
              </>
            )}
          </div>

          {/* Right Column: Function Calls */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden">
            {callStatus === "connected" && (
              <FunctionCallsPanel items={items} ws={ws} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
