
import React, { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import FileBrowser from './components/FileBrowser';
import { classifyFile } from './services/geminiService';
import { OrganizedFile, FileCategory } from './types';

function App() {
  const [files, setFiles] = useState<OrganizedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const handleFileUpload = useCallback(async (uploadedFiles: FileList) => {
    if (uploadedFiles.length === 0) return;

    setIsLoading(true);
    setError(null);
    setDirectoryHandle(null);
    setFiles([]);
    
    const newFilesToProcess = Array.from(uploadedFiles);
    
    const classificationPromises = newFilesToProcess.map(file => 
      classifyFile(file.name).then(category => ({
        id: crypto.randomUUID(),
        name: file.name,
        category: category as FileCategory,
        size: file.size,
        type: file.type,
      }))
    );

    try {
      const results = await Promise.allSettled(classificationPromises);
      const successfullyClassifiedFiles = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<OrganizedFile>).value);
      
      const failedCount = results.length - successfullyClassifiedFiles.length;
      if (failedCount > 0) {
        setError(`${failedCount} files could not be classified. Please try again.`);
      }

      setFiles(successfullyClassifiedFiles);

    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred during classification.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSelectFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
        setError('Your browser does not support the File System Access API. Please try a modern browser like Chrome or Edge.');
        return;
    }

    try {
        const handle = await (window as any).showDirectoryPicker();
        setDirectoryHandle(handle);
        setFiles([]);
        setIsLoading(true);
        setError(null);

        const filesToProcess: { file: File; handle: FileSystemFileHandle }[] = [];
        for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                filesToProcess.push({ file, handle: entry });
            }
        }
        
        const classificationPromises = filesToProcess.map(async ({ file, handle }) => {
            const category = await classifyFile(file.name);
            return {
                id: crypto.randomUUID(),
                name: file.name,
                category,
                size: file.size,
                type: file.type,
                handle,
            };
        });

        const results = await Promise.all(classificationPromises);
        setFiles(results);

    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            return; // User cancelled the picker, do nothing.
        }
        console.error(err);
        setError('Could not read the selected directory.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleOrganizeOnDisk = async () => {
    if (!directoryHandle || files.length === 0) return;

    setIsOrganizing(true);
    setError(null);

    try {
      // Fix: Cast directoryHandle to `any` to access experimental File System Access API
      // methods (`queryPermission` and `requestPermission`) and check the `state` property
      // of the returned PermissionStatus object.
      const permission = await (directoryHandle as any).queryPermission({ mode: 'readwrite' });
      if (permission.state !== 'granted') {
          const newPermission = await (directoryHandle as any).requestPermission({ mode: 'readwrite' });
          if (newPermission.state !== 'granted') {
              setError('Permission to write to the directory was denied.');
              setIsOrganizing(false);
              return;
          }
      }
      
      let movedFilesCount = 0;
      for (const file of files) {
          if (!file.handle || file.category === "Other") continue;
          try {
              const destDirHandle = await directoryHandle.getDirectoryHandle(file.category, { create: true });
              const newFileHandle = await destDirHandle.getFileHandle(file.name, { create: true });
              const writable = await newFileHandle.createWritable();
              const originalFile = await file.handle.getFile();
              await writable.write(originalFile);
              await writable.close();
              await directoryHandle.removeEntry(file.name);
              movedFilesCount++;
          } catch (fileMoveError) {
              console.error(`Could not move file: ${file.name}`, fileMoveError);
          }
      }

      alert(`Successfully organized ${movedFilesCount} files!`);
      setFiles([]);
      setDirectoryHandle(null);

    } catch (err) {
      console.error(err);
      setError('An error occurred while organizing files on disk.');
    } finally {
      setIsOrganizing(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
                 <svg className="w-10 h-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 6.75h16.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.993-1.186a1.5 1.5 0 10-2.012 2.372" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.106 17.106c.101.102.203.204.305.305C6.42 18.421 7.433 19 8.5 19h7c1.067 0 2.08-.578 3.089-1.589.102-.101.204-.203.305-.305s.101-.203.153-.305c.24-.499.418-1.02.508-1.554s.13-1.07.13-1.636c0-.566-.04-1.116-.13-1.636-.09-.534-.268-1.055-.508-1.554a5.968 5.968 0 00-.458-.61" />
                </svg>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-cyan-300 text-transparent bg-clip-text">
                  Smart File Organizer
                </h1>
            </div>
          <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
            Upload files or select a local folder, and let Gemini's AI automatically sort them.
          </p>
        </header>

        <main>
          <div className="bg-slate-800/50 rounded-lg p-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUpload onFileUpload={handleFileUpload} disabled={isLoading || isOrganizing} />
                  <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl border-slate-600">
                      <svg className="w-12 h-12 mb-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12.75h16.5m-16.5-9h16.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a8.25 8.25 0 006.34-13.62.75.75 0 00-.523-1.242H6.183a.75.75 0 00-.523 1.242A8.25 8.25 0 0012 21z" />
                      </svg>
                      <button onClick={handleSelectFolder} disabled={isLoading || isOrganizing} className="px-6 py-2 bg-slate-700 text-slate-200 rounded-md font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          Organize a Local Folder
                      </button>
                      <p className="text-xs text-slate-500 mt-3">
                          Select a folder to classify and move files into subdirectories.
                          <br />
                          (Requires a compatible browser like Chrome or Edge)
                      </p>
                  </div>
              </div>
          </div>


          {isLoading && (
            <div className="flex flex-col items-center justify-center text-center my-8 text-sky-400" role="status">
                <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-lg">Classifying files... Gemini is thinking.</p>
            </div>
          )}

          {error && (
            <div className="text-center my-4 p-3 bg-red-500/20 text-red-300 rounded-md max-w-3xl mx-auto" role="alert">
              {error}
            </div>
          )}

          <FileBrowser files={files} directoryHandle={directoryHandle} onOrganize={handleOrganizeOnDisk} isOrganizing={isOrganizing} />
        </main>
      </div>
    </div>
  );
}

export default App;
