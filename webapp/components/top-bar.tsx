import React from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Briefcase,
  ExternalLink,
  Zap,
  Star,
  Github,
} from "lucide-react";
import Link from "next/link";

const TopBar = () => {
  return (
    <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-end justify-between w-full min-w-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              AI Interview Practice
            </h1>
            <p className="text-sm text-gray-600">
              Practice phone interviews with AI
            </p>
          </div>
          <Link
            href="https://github.com/acedit-ai/phone-screen"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 ml-4 px-2.5 py-1 bg-gray-900 hover:bg-gray-800 rounded-md text-xs text-white hover:text-gray-100 transition-colors duration-200 border border-gray-700 flex-shrink-0"
          >
            <Github className="w-3 h-3" />
            <span>Open Source</span>
            <div className="w-px h-3 bg-gray-600 mx-0.5"></div>
            <Star className="w-3 h-3 text-purple-400" />
            <span>0</span>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-xs text-gray-500">
            Ready for real video interviews?
          </p>
          <p className="text-xs font-medium text-purple-600">
            Get real-time AI coaching
          </p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Link
            href="https://www.acedit.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Zap className="w-4 h-4 mr-2" />
            Get Acedit
            <ExternalLink className="w-3 h-3 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default TopBar;
