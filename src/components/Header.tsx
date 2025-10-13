import React from "react";
import { Settings, X } from "lucide-react";

interface HeaderProps {
  onToggleSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSettings }) => {
  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.closeApp();
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 shrink-0">
      <div className="flex items-center justify-between">
        {/* Settings Button */}
        <button
          onClick={onToggleSettings}
          className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          title="Settings"
        >
          <Settings className="w-6 h-6 text-gray-300" />
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center">
          <div className="bg-gray-700 p-3 rounded-xl">
            <img src="/assets/logo.svg" alt="Logo" className="w-8 h-8" />
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-3 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
          title="Close Application"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};
