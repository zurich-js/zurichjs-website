import { Save } from 'lucide-react';

interface AutoSaveIndicatorProps {
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasLoadedFromStorage: boolean;
}

export default function AutoSaveIndicator({
  isAutoSaving,
  lastSaved,
  hasLoadedFromStorage,
}: AutoSaveIndicatorProps) {
  if (!hasLoadedFromStorage) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-full px-3 py-1">
      {isAutoSaving ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-js" />
          <span className="hidden sm:inline">Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <Save size={14} className="text-green-600" />
          <span className="hidden sm:inline">
            Saved {lastSaved.toLocaleDateString()} at {lastSaved.toLocaleTimeString()}
          </span>
          <span className="sm:hidden">Saved</span>
        </>
      ) : (
        <>
          <Save size={14} className="text-gray-400" />
          <span className="hidden sm:inline">Auto-save enabled</span>
        </>
      )}
    </div>
  );
}
