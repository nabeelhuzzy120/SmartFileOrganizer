import React, { useState, useMemo } from 'react';
import { OrganizedFile, FileCategory } from '../types';
import { CATEGORIES } from '../constants';
import FileIcon from './FileIcon';

interface FileBrowserProps {
  files: OrganizedFile[];
  directoryHandle: FileSystemDirectoryHandle | null;
  onOrganize: () => void;
  isOrganizing: boolean;
}

const FolderIcon: React.FC<{ open?: boolean }> = ({ open = false }) => (
    <svg aria-hidden="true" className="w-6 h-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);


const FileBrowser: React.FC<FileBrowserProps> = ({ files, directoryHandle, onOrganize, isOrganizing }) => {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | null>(null);

  const groupedFiles = useMemo(() => {
    const group = new Map<FileCategory, OrganizedFile[]>();
    CATEGORIES.forEach(cat => group.set(cat, []));
    files.forEach(file => {
      if (group.has(file.category)) {
        group.get(file.category)?.push(file);
      } else {
        group.get('Other')?.push(file);
      }
    });
    return group;
  }, [files]);
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const selectedFiles = selectedCategory ? groupedFiles.get(selectedCategory) || [] : [];

  return (
    <div className="mt-8">
      {directoryHandle && files.length > 0 && (
        <div className="mb-6 text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200">Ready to Organize?</h3>
          <p className="text-slate-400 mt-1 mb-4 max-w-2xl mx-auto">
            Review the classifications below. Clicking 'Organize' will create subfolders within <code className="text-sky-400 bg-slate-700 px-1.5 py-0.5 rounded">{directoryHandle.name}</code> and move these files. <strong className="font-semibold text-amber-400">This action will modify files on your computer.</strong>
          </p>
          <button 
            onClick={onOrganize} 
            disabled={isOrganizing}
            className="inline-flex items-center justify-center px-6 py-2 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {isOrganizing && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {isOrganizing ? 'Organizing...' : 'Organize Files on Disk'}
          </button>
        </div>
      )}
      <div className={`flex flex-col md:flex-row gap-6 ${files.length > 0 ? 'min-h-[450px]' : ''}`}>
        {/* Sidebar with Folders */}
        <div className="md:w-1/3 lg:w-1/4 bg-slate-800/50 rounded-lg p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Categories</h2>
          <ul className="space-y-1">
            {CATEGORIES.map(category => (
              <li key={category}>
                <button
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors duration-200 ${
                    selectedCategory === category
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                >
                  <FolderIcon />
                  <span className="flex-1 truncate">{category}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                      selectedCategory === category ? 'bg-sky-500/30' : 'bg-slate-700'
                  }`}>
                    {groupedFiles.get(category)?.length || 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Content with Files */}
        <div className="flex-1 bg-slate-800/50 rounded-lg p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {selectedCategory ? (
              <div>
                <h2 className="text-xl font-bold text-slate-100 mb-4">{selectedCategory}</h2>
                {selectedFiles.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedFiles.map(file => (
                      <li key={file.id} className="flex items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                        <FileIcon fileName={file.name} />
                        <div className="flex-1 truncate">
                          <p className="text-slate-200 font-medium truncate">{file.name}</p>
                          <p className="text-slate-400 text-xs">{file.type}</p>
                        </div>
                        <div className="text-sm text-slate-400 font-mono">
                          {formatBytes(file.size)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 pt-16">
                      <svg className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.993-1.186a1.5 1.5 0 10-2.012 2.372" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.106 17.106c.101.102.203.204.305.305C6.42 18.421 7.433 19 8.5 19h7c1.067 0 2.08-.578 3.089-1.589.102-.101.204-.203.305-.305s.101-.203.153-.305c.24-.499.418-1.02.508-1.554s.13-1.07.13-1.636c0-.566-.04-1.116-.13-1.636-.09-.534-.268-1.055-.508-1.554a5.968 5.968 0 00-.458-.61" />
                      </svg>
                      <p className="mt-4">This folder is empty.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <svg className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="mt-4 text-lg">Select a category to view files</p>
                  <p className="text-sm">Upload some files or select a local folder to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowser;
