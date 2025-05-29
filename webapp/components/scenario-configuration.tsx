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
import { Button } from "@/components/ui/button";
import { Mic, AlertCircle } from "lucide-react";

// Types for scenario system
export interface ScenarioField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface ScenarioSchema {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fields: ScenarioField[];
  voiceOptions?: {
    value: string;
    label: string;
    description?: string;
  }[];
}

export interface ScenarioConfig {
  [key: string]: any;
}

interface ScenarioConfigurationProps {
  scenarios: ScenarioSchema[];
  selectedScenarioId: string;
  config: ScenarioConfig;
  voice: string;
  onScenarioChange: (scenarioId: string) => void;
  onConfigChange: (config: ScenarioConfig) => void;
  onVoiceChange: (voice: string) => void;
  isLoading?: boolean;
}

const ScenarioConfiguration: React.FC<ScenarioConfigurationProps> = ({
  scenarios,
  selectedScenarioId,
  config,
  voice,
  onScenarioChange,
  onConfigChange,
  onVoiceChange,
  isLoading = false,
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  // Validate configuration when it changes
  useEffect(() => {
    if (selectedScenario) {
      const errors: Record<string, string> = {};
      
      selectedScenario.fields.forEach(field => {
        const value = config[field.key];
        
        if (
          field.required &&
          (value === undefined ||
           value === null ||
           (typeof value === 'string' && value.trim() === ''))
        ) {
          errors[field.key] = `${field.label} is required`;
        } else if (value && field.validation) {
          if (field.validation.minLength && value.length < field.validation.minLength) {
            errors[field.key] = `${field.label} must be at least ${field.validation.minLength} characters`;
          }
          if (field.validation.maxLength && value.length > field.validation.maxLength) {
            errors[field.key] = `${field.label} must be less than ${field.validation.maxLength} characters`;
          }
          if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
            errors[field.key] = `${field.label} format is invalid`;
          }
        }
      });
      
      setValidationErrors(errors);
    }
  }, [config, selectedScenario]);

  const handleFieldChange = (fieldKey: string, value: any) => {
    const newConfig = { ...config, [fieldKey]: value };
    onConfigChange(newConfig);
  };

  const renderField = (field: ScenarioField) => {
    const value = config[field.key] || '';
    const hasError = validationErrors[field.key];

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <Label
              htmlFor={field.key}
              className="text-sm font-medium text-gray-700"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className={`w-full ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label
              htmlFor={field.key}
              className="text-sm font-medium text-gray-700"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.key}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className={`w-full min-h-[120px] resize-none ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label
              htmlFor={field.key}
              className="text-sm font-medium text-gray-700"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select 
              value={value} 
              onValueChange={(newValue) => handleFieldChange(field.key, newValue)}
            >
              <SelectTrigger className={`w-full ${hasError ? 'border-red-500' : ''}`}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label
              htmlFor={field.key}
              className="text-sm font-medium text-gray-700"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || '')}
              className={`w-full ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select 
              value={value ? 'true' : 'false'} 
              onValueChange={(newValue) => handleFieldChange(field.key, newValue === 'true')}
            >
              <SelectTrigger className={`w-full ${hasError ? 'border-red-500' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {hasError}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading scenarios...</p>
        </CardContent>
      </Card>
    );
  }

  if (scenarios.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No scenarios available. Please check your server configuration.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-3">
          {selectedScenario?.icon && <span className="text-2xl">{selectedScenario.icon}</span>}
          Call Setup
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Configure your AI call experience
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Selection - Only show if multiple scenarios are available */}
        {scenarios.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Scenario Type
            </Label>
            <Select value={selectedScenarioId} onValueChange={onScenarioChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a scenario" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    <div className="flex items-center gap-2">
                      {scenario.icon && <span>{scenario.icon}</span>}
                      <div>
                        <div className="font-medium">{scenario.name}</div>
                        <div className="text-xs text-gray-500">{scenario.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Single Scenario Display - Show when only one scenario is available */}
        {scenarios.length === 1 && selectedScenario && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              {selectedScenario.icon && (
                <span className="text-2xl">{selectedScenario.icon}</span>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{selectedScenario.name}</h3>
                <p className="text-sm text-gray-600">{selectedScenario.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Fields */}
        {selectedScenario && (
          <>
            {selectedScenario.fields.map(renderField)}

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label
                htmlFor="voice"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Mic className="w-4 h-4 text-purple-600" />
                Voice
              </Label>
              <Select value={voice} onValueChange={onVoiceChange}>
                <SelectTrigger className="w-full h-auto min-h-[40px]">
                  <div className="flex items-center justify-between w-full">
                    {voice && selectedScenario?.voiceOptions ? (
                      (() => {
                        const selectedVoice = selectedScenario.voiceOptions.find(v => v.value === voice);
                        return selectedVoice ? (
                          <span className="font-medium text-sm">{selectedVoice.label}</span>
                        ) : (
                          <span className="text-gray-500">Select voice</span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-500">Select voice</span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent className="w-full">
                  {(selectedScenario.voiceOptions || []).map((voiceOption) => (
                    <SelectItem key={voiceOption.value} value={voiceOption.value} className="h-auto py-3">
                      <div className="flex flex-col items-start w-full">
                        <div className="font-medium text-sm">{voiceOption.label}</div>
                        {voiceOption.description && (
                          <div className="text-xs text-gray-500 mt-1">{voiceOption.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Configuration Status */}
        {selectedScenario && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-white text-xs font-bold">💡</span>
              </div>
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">Scenario: {selectedScenario.name}</p>
                <p className="text-purple-700">{selectedScenario.description}</p>
                
                {Object.keys(validationErrors).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-red-600 text-xs font-medium">
                      Please fix the validation errors above before starting the call.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScenarioConfiguration; 