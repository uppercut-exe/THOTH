import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLanguage } from "./LanguageContext";

export interface OnboardingData {
  completed: boolean;
  companyName: string;
  industry: string;
  companySize: string;
  locations: string;
  language: "en" | "ar";
}

interface OnboardingContextType {
  onboardingData: OnboardingData | null;
  completeOnboarding: (data: Omit<OnboardingData, "completed">) => void;
  clearOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { setLang } = useLanguage();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("thoth_onboarding");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOnboardingData(parsed);
      } catch (_) {}
    }
    setIsLoaded(true);
  }, []);

  const completeOnboarding = (data: Omit<OnboardingData, "completed">) => {
    const fullData: OnboardingData = { ...data, completed: true };
    localStorage.setItem("thoth_onboarding", JSON.stringify(fullData));
    setOnboardingData(fullData);
    setLang(fullData.language);
  };

  const clearOnboarding = () => {
    localStorage.removeItem("thoth_onboarding");
    setOnboardingData(null);
  };

  if (!isLoaded) return null;

  return (
    <OnboardingContext.Provider value={{ onboardingData, completeOnboarding, clearOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
