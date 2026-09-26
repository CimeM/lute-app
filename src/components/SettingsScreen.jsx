import React, { useState, useEffect } from "react";
import { Download, Upload, RefreshCw, ExternalLink } from "lucide-react";
import { DEFAULT_GITHUB_REPO } from "../db/LocalDB";

export function SettingsScreen({ settings, onUpdateSettings, onExport, onImport }) {
  const [latestRelease, setLatestRelease] = useState({ tag: "Checking...", url: "" });
  const [isCheckingRelease, setIsCheckingRelease] = useState(false);

  const CURRENT_VERSION = "v1.0.0";

  const fetchLatestRelease = async () => {
    setIsCheckingRelease(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${DEFAULT_GITHUB_REPO}/releases/latest`);
      if (res.ok) {
        const data = await res.json();
        setLatestRelease({
          tag: data.tag_name || "Unknown",
          url: data.html_url || `https://github.com/${DEFAULT_GITHUB_REPO}/releases`
        });
      } else {
        setLatestRelease({ tag: "No releases", url: `https://github.com/${DEFAULT_GITHUB_REPO}` });
      }
    } catch (err) {
      console.error("Failed to fetch release info:", err);
      setLatestRelease({ tag: "Unavailable", url: "" });
    } finally {
      setIsCheckingRelease(false);
    }
  };

  useEffect(() => {
    fetchLatestRelease();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Title */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      {/* Backup and Restore */}
      <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Database Backup
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-medium py-2 px-3 rounded-md transition"
          >
            <Download className="w-4 h-4" />
            Export DB
          </button>
          <label className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-medium py-2 px-3 rounded-md transition cursor-pointer">
            <Upload className="w-4 h-4" />
            Import DB
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Version Information */}
      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          About
        </label>

        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400">App Version</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {CURRENT_VERSION}
            </span>
          </div>

          
        </div>
      </div>
    </div>
  );
}