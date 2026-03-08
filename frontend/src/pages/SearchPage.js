import React, { useState } from 'react';
import axios from 'axios';
import { Search, Play, Music, Info, Lightbulb, Loader2, X } from 'lucide-react';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/videos/search', { query });
      setResults(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch search results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* Search Header */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8">
          <div className="px-8 py-12 md:py-16 text-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 relative">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-300 via-transparent to-transparent"></div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 relative z-10 tracking-tight">
              Dance Archive Semantic Search
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10 relative z-10 font-light">
              Describe what you're looking for in natural language, and the AI will find the most relevant dances based on styles, energy, and movements.
            </p>
            
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative z-10">
              <div className="relative flex items-center group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 'Energetic Pahatharata fusion dance with fast drum beats'"
                  className="w-full pl-6 pr-16 py-5 text-lg rounded-full border-0 focus:ring-4 focus:ring-indigo-300 shadow-2xl text-gray-900 placeholder-gray-400 transition-all duration-300 transform group-hover:-translate-y-1"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors disabled:opacity-50"
                  aria-label="Search"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && !loading && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 fade-in">
            {/* AI Context Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="w-6 h-6 text-amber-500 mr-2" />
                  Model Analysis
                </h3>
                <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed text-lg">
                  <p>{results.explanation}</p>
                </div>
                
                {results.choreography_suggestions && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-base font-semibold text-gray-900 mb-2 uppercase tracking-wider text-sm">Choreography Ideas</h4>
                    <p className="text-gray-600 italic">{results.choreography_suggestions}</p>
                  </div>
                )}
              </div>

              <div className="md:col-span-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center">
                  <Music className="w-5 h-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-bold text-indigo-900">Music Pairing</h3>
                </div>
                <div className="p-4 flex-grow bg-white overflow-y-auto max-h-[300px]">
                  {results.musicRecommendations?.length > 0 ? (
                    <ul className="space-y-4">
                      {results.musicRecommendations.map((music, idx) => (
                        <li key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative group">
                          <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-1 bg-white text-indigo-600 rounded-full border border-indigo-100">
                            {music.style}
                          </span>
                          <p className="font-bold text-gray-900 pr-16">{music.title}</p>
                          <p className="text-sm text-gray-500 mb-2">{music.artist}</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{music.description}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 text-center mt-4">No music recommendations found.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Video Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                Top Matches <span className="ml-3 bg-indigo-100 text-indigo-800 text-sm py-1 px-3 rounded-full">{results.matches?.length || 0} Videos</span>
              </h2>
              
              {results.matches?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {results.matches.map((video, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1">
                      <div className="relative aspect-video bg-gray-900 overflow-hidden">
                        <video 
                          src={video.url} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          controls={false}
                          muted
                          loop
                          onMouseOver={e => e.target.play().catch(() => {})}
                          onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 pointer-events-none">
                          <div className="bg-white bg-opacity-90 rounded-full p-3 backdrop-blur-sm">
                            <Play className="w-8 h-8 text-indigo-600 ml-1" />
                          </div>
                        </div>
                        {video.similarityScore && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-70 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md border border-white border-opacity-20 shadow-lg">
                            {(video.similarityScore * 100).toFixed(0)}% Match
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2" title={video.filename}>
                          {video.filename.replace('.mp4', '')}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {video.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                          {video.description}
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => setActiveVideo(video)}
                          className="w-full py-2.5 px-4 bg-gray-50 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl border border-gray-200 hover:border-indigo-200 transition-colors text-center mt-auto flex items-center justify-center"
                        >
                          <Play className="w-4 h-4 mr-2" /> Watch Video
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-2xl text-center shadow-sm border border-gray-100">
                  <p className="text-gray-500 text-lg">No matching videos found for this query.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {activeVideo.filename.replace('.mp4', '')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {activeVideo.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                aria-label="Close video player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black">
              <video
                src={activeVideo.url}
                controls
                autoPlay
                className="w-full max-h-[75vh]"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {activeVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
