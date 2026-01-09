import React from 'react';
import { useUserscript } from './UserscriptChecker';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

export const UserscriptBanner: React.FC = () => {
  const { isInstalled, isLatestVersion, version, checkStatus } = useUserscript();

  if (isInstalled && isLatestVersion) {
    return null;
  }

  const handleInstall = () => {
    window.open('/api/helper.user.js', '_blank');
    setTimeout(checkStatus, 2000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isInstalled) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-700 rounded-xl">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg text-white mb-1">
                  Userscript required
                </h3>
                <p className="text-sm text-red-100">
                  Install the Neko-Ani userscript to enable all features
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInstall}
                className="flex items-center justify-center gap-2 bg-white text-red-600 px-6 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors shadow-lg"
              >
                <Download size={16} />
                Install
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2 bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-red-800 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLatestVersion) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-700 rounded-xl">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg text-white mb-1">
                  Update available
                </h3>
                <p className="text-sm text-amber-100">
                  Your userscript version {version} is outdated. Update to v2.1 for the latest features.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInstall}
                className="flex items-center justify-center gap-2 bg-white text-amber-600 px-6 py-3 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors shadow-lg"
              >
                <Download size={16} />
                Update
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2 bg-amber-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLatestVersion) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-tertiary-container text-on-tertiary-container">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-tertiary rounded-xl">
                <AlertTriangle className="text-on-tertiary" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-normal text-base text-on-tertiary-container mb-1">
                  Update available
                </h3>
                <p className="text-sm text-on-tertiary-container/80">
                  Your userscript version {version} is outdated. Update to v2.0 for the latest features.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInstall}
                className="flex items-center justify-center gap-2 bg-on-tertiary-container text-tertiary px-6 py-3 rounded-2xl text-sm font-medium hover:bg-tertiary-container-high transition-colors"
              >
                <Download size={16} />
                Update
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2 bg-tertiary-container-high text-on-tertiary-container px-6 py-3 rounded-2xl text-sm font-medium hover:bg-tertiary-container-highest transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};