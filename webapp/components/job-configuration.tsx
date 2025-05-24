import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Briefcase, FileText, Mic, Target } from "lucide-react";

interface JobConfigurationProps {
  jobTitle: string;
  company: string;
  jobDescription: string;
  voice: string;
  difficulty: string;
  onJobTitleChange: (title: string) => void;
  onCompanyChange: (company: string) => void;
  onJobDescriptionChange: (description: string) => void;
  onVoiceChange: (voice: string) => void;
  onDifficultyChange: (difficulty: string) => void;
}

const JobConfiguration: React.FC<JobConfigurationProps> = ({
  jobTitle,
  company,
  jobDescription,
  voice,
  difficulty,
  onJobTitleChange,
  onCompanyChange,
  onJobDescriptionChange,
  onVoiceChange,
  onDifficultyChange,
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Briefcase className="w-6 h-6 text-purple-600" />
          Interview Setup
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Enter the job details to customize your AI interview experience
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="jobTitle"
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 text-purple-600" />
            Job Title
          </Label>
          <Input
            id="jobTitle"
            placeholder="e.g. Senior Software Engineer, Product Manager, Data Scientist"
            value={jobTitle}
            onChange={(e) => onJobTitleChange(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="company"
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            Company
          </Label>
          <Input
            id="company"
            placeholder="e.g. Google, Microsoft, Startup Inc."
            value={company}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="jobDescription"
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            Job Description
          </Label>
          <Textarea
            id="jobDescription"
            placeholder="Paste the job description here or provide key requirements and responsibilities..."
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
            className="w-full min-h-[120px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="voice"
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <Mic className="w-4 h-4 text-purple-600" />
            Interviewer Voice
          </Label>
          <Select value={voice} onValueChange={onVoiceChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select interviewer voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ash">Ash - Professional & Clear</SelectItem>
              <SelectItem value="ballad">Ballad - Warm & Friendly</SelectItem>
              <SelectItem value="coral">
                Coral - Energetic & Confident
              </SelectItem>
              <SelectItem value="sage">Sage - Calm & Thoughtful</SelectItem>
              <SelectItem value="verse">Verse - Dynamic & Engaging</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="difficulty"
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <Target className="w-4 h-4 text-purple-600" />
            Interview Difficulty
          </Label>
          <Select value={difficulty} onValueChange={onDifficultyChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select interview difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy - Friendly & Supportive</SelectItem>
              <SelectItem value="medium">Medium - Professional & Balanced</SelectItem>
              <SelectItem value="hard">Hard - Challenging & Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">💡</span>
            </div>
            <div className="text-sm text-purple-800">
              <p className="font-medium mb-1">Pro Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-purple-700">
                <li>
                  Include specific tech stack requirements for technical roles
                </li>
                <li>Mention years of experience needed</li>
                <li>Add company culture or values for better context</li>
                <li>Choose difficulty based on your experience level and goals</li>
              </ul>

              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-purple-600 text-xs">
                  <strong>
                    Ready for advanced practice?
                  </strong>{" "}
                  <a
                    href="https://www.acedit.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-purple-800 font-medium"
                  >
                    Acedit offers full mock interviews
                  </a>{" "}
                  with realistic job scenarios, personalized response recommendations, 
                  plus real-time coaching during actual video interviews.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobConfiguration;
