import React, { createContext, useContext, useState } from 'react';

interface DateNavigationContextType {
  selectedDate: Date | null;
  setSelectedDate: (date: Date) => void;
  clearSelectedDate: () => void;
}

const DateNavigationContext = createContext<DateNavigationContextType | undefined>(undefined);

export function DateNavigationProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState<Date | null>(null);

  const setSelectedDate = (date: Date) => {
    setSelectedDateState(date);
  };

  const clearSelectedDate = () => {
    setSelectedDateState(null);
  };

  return (
    <DateNavigationContext.Provider value={{ selectedDate, setSelectedDate, clearSelectedDate }}>
      {children}
    </DateNavigationContext.Provider>
  );
}

export function useDateNavigation() {
  const context = useContext(DateNavigationContext);
  if (context === undefined) {
    throw new Error('useDateNavigation must be used within a DateNavigationProvider');
  }
  return context;
}
