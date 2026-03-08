import React, { useState } from 'react';
import axios from 'axios';
import { Upload, X, Loader2, CheckCircle, AlertCircle, FileVideo, Video } from 'lucide-react';

const metadataPillClassNames = {
  label: 'bg-blue-100 text-blue-800',
  type: 'bg-purple-100 text-purple-800',
  beat: 'bg-amber-100 text-amber-800',
  energy: 'bg-emerald-100 text-emerald-800',
  expression: 'bg-rose-100 text-rose-800',
  emotion: 'bg-cyan-100 text-cyan-800'
};

const metadataFields = [
  { key: 'label', title: 'Dance Style Label' },
  { key: 'type', title: 'Performance Type' },
  { key: 'beat', title: 'Beat Profile' },
  { key: 'energy', title: 'Energy Level' },
  { key: 'expression', title: 'Expression Style' },
  { key: 'emotion', title: 'Emotional Tone' }
];

const AdminPortal = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setStatus({ type: '', message: '' });
      setResult(null);
    } else {
      setFile(null);
      setStatus({ type: 'error', message: 'Please select a valid video file (MP4, WebM, etc.)' });
    }
  };

  const clearFile = () => {
    setFile(null);
    setStatus({ type: '', message: '' });
    setResult(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus({ type: 'info', message: 'Uploading and analyzing video... This may take a minute.' });
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setStatus({ type: 'success', message: 'Video successfully processed and indexed!' });
      setResult(response.data.data);
      setFile(null);
    } catch (error) {
      console.error("Upload failed", error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Failed to upload and process video'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700">
            <h1 className="text-3xl font-extrabold text-white flex items-center">
              <Upload className="w-8 h-8 mr-3 text-blue-100" />
              Admin Portal: Upload Dance Video
            </h1>
            <p className="mt-2 text-blue-100 text-lg">
              Upload videos to the archive. The AI model will automatically generate keywords, dance style descriptions, and vector embeddings for semantic search.
            </p>
          </div>

          <div className="p-8 sm:p-10">
            {status.message && (
              <div className={`mb-6 p-4 rounded-xl flex items-start ${
                status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {status.type === 'error' && <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />}
                {status.type === 'success' && <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />}
                {status.type === 'info' && <Loader2 className="w-5 h-5 mr-3 mt-0.5 animate-spin flex-shrink-0" />}
                <p className="font-medium">{status.message}</p>
              </div>
            )}

            <form onSubmit={handleUpload}>
              {!file ? (
                <div className="mt-2 flex justify-center px-6 pt-10 pb-12 border-2 border-gray-300 border-dashed rounded-2xl hover:bg-gray-50 transition-colors bg-white">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto h-20 w-20 text-gray-400 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileVideo className="h-10 w-10" aria-hidden="true" />
                    </div>
                    <div className="flex text-lg text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 p-1"
                      >
                        <span>Upload a video</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="video/*" onChange={handleFileChange} />
                      </label>
                      <p className="pl-1 pt-1">or drag and drop</p>
                    </div>
                    <p className="text-sm text-gray-500">MP4, WebM, MOV up to 500MB</p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-6 border-2 border-indigo-200 rounded-2xl bg-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 h-14 w-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Video className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1" title={file.name}>{file.name}</h3>
                        <p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={uploading}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className={`inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-xl shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    !file || uploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transition-all'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="-ml-1 mr-3 h-5 w-5" />
                      Process & Upload
                    </>
                  )}
                </button>
              </div>
            </form>

            {result && (
              <div className="mt-10 pt-8 border-t border-gray-200 animate-in fade-in duration-500">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                  Model Analysis Results
                </h3>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                    {metadataFields.map(({ key, title }) => (
                      <div key={key} className="sm:col-span-1">
                        <dt className="text-sm font-semibold text-gray-500">{title}</dt>
                        <dd className="mt-1 flex items-center">
                          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${metadataPillClassNames[key]}`}>
                            {result[key] || 'Not detected'}
                          </span>
                        </dd>
                      </div>
                    ))}
                    <div className="sm:col-span-2 mt-2">
                      <dt className="text-sm font-semibold text-gray-500 mb-2">Detailed Description</dt>
                      <dd className="mt-1 text-base text-gray-900 bg-white p-4 rounded-lg shadow-sm border border-gray-100 leading-relaxed">
                        {result.description}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-sm font-semibold text-gray-500 mb-2">Semantic Search Summary</dt>
                      <dd className="mt-1 text-sm text-gray-700 bg-white p-4 rounded-lg shadow-sm border border-gray-100 leading-relaxed">
                        {result.fullDescription}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;
