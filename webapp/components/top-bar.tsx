import React, { useState, useEffect } from "react";
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

const GitHubStars = () => {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/acedit-ai/phone-screen"
        );
        const data = await response.json();
        setStars(data.stargazers_count || 0);
      } catch (error) {
        console.error("Error fetching GitHub stars:", error);
        setStars(0); // Fallback to 0 if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  if (loading) {
    return <span className="w-4 text-center">•••</span>;
  }

  return <span>{stars}</span>;
};

const TopBar = () => {
  return (
    <div className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <div className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex-shrink-0">
          <Briefcase className="w-4 sm:w-6 h-4 sm:h-6 text-white" />
        </div>
        <div className="flex items-end justify-between w-full min-w-0">
          <div className="flex items-end gap-4">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                Phone Screen Practice
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Practice phone interviews with AI
              </p>
            </div>
            <Link
              href="https://github.com/acedit-ai/phone-screen"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 rounded-md text-xs text-white hover:text-gray-100 transition-colors duration-200 border border-gray-700 flex-shrink-0"
            >
              <Github className="w-3 h-3" />
              <span>Open Source</span>
              <div className="w-px h-3 bg-gray-600 mx-1"></div>
              <Star className="w-3 h-3 text-purple-400" />
              <GitHubStars />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Text description - hidden on mobile */}
        <div className="hidden lg:flex flex-col items-end">
          <p className="text-xs text-gray-500">
            Ready for real video interviews?
          </p>
          <p className="text-xs font-medium text-purple-600">
            Get real-time AI coaching
          </p>
        </div>

        <Button
          asChild
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-4 sm:px-6 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
        >
          <Link
            href="https://www.acedit.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Zap className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="hidden xs:inline">Get </span>Acedit
            <ExternalLink className="w-3 h-3 ml-1.5 sm:ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default TopBar;
