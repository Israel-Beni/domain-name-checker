"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Filter, Download, CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react';
import { checkDomains, DomainResult, DEFAULT_EXTENSIONS } from '@/lib/api';
import { generateDomainReport } from '@/lib/pdf-generator';

export default function DomainNameChecker() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);
  
  const [availableExtensions, setAvailableExtensions] = useState<string[]>(
    Array.from(new Set([...DEFAULT_EXTENSIONS.map(e => e.ext), '.fr']))
  );
  const [customExtInput, setCustomExtInput] = useState('');

  // Filters
  const [priceFilter, setPriceFilter] = useState<number>(100);
  const [extFilters, setExtFilters] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'taken'>('all');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const keywords = query.split(',').map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;

    setIsSearching(true);
    try {
      const dataArrays = await Promise.all(keywords.map(k => checkDomains(k, availableExtensions)));
      setResults(dataArrays.flat());
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleExtension = (ext: string) => {
    setExtFilters(prev =>
      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
    );
  };

  const handleAddCustomExt = () => {
    let ext = customExtInput.trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith('.')) ext = `.${ext}`;
    if (!availableExtensions.includes(ext)) {
      setAvailableExtensions(prev => [...prev, ext]);
    }
    setCustomExtInput('');
  };

  const filteredResults = useMemo(() => {
    return results.filter(domain => {
      // Filter by availability
      if (availabilityFilter === 'available' && !domain.isAvailable) return false;
      if (availabilityFilter === 'taken' && domain.isAvailable) return false;

      // If extension filters are active, must match one
      if (extFilters.length > 0 && !extFilters.includes(domain.extension)) {
        return false;
      }
      // If available, must be under max price. (If taken, price is irrelevant, we still show it)
      if (domain.isAvailable && domain.price > priceFilter) {
        return false;
      }
      return true;
    });
  }, [results, priceFilter, extFilters, availabilityFilter]);

  const handleDownloadPDF = () => {
    generateDomainReport(query, filteredResults, {
      maxPrice: priceFilter,
      extensions: extFilters,
      availability: availabilityFilter
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-violet-400/20 blur-[100px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

        {/* Header / Hero */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-white shadow-sm rounded-2xl mb-6 ring-1 ring-slate-900/5"
          >
            <Globe className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-4"
          >
            Find your perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">domain.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Check availability instantly, filter by extension or price, and export a beautiful report.
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <div className="pl-6 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <input
                type="text"
                placeholder="Enter keywords (comma separated, e.g. 'startup, tech')"
                className="w-full py-5 px-4 bg-transparent outline-none text-xl placeholder:text-slate-400 text-slate-800 font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="pr-3 py-3">
                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
              </div>
            </div>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            <span className="font-semibold text-indigo-500">Pro Tip:</span> You can search multiple keywords at once by separating them with commas.
          </p>
        </motion.div>

        {/* Filters & Results Area */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8"
          >
            {/* Sidebar Filters */}
            <div className="lg:col-span-1 space-y-8 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-900/5 h-fit sticky top-8">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-4">
                <Filter className="w-5 h-5 text-indigo-500" />
                Filter Results
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Max Price: <span className="text-indigo-600 font-bold">${priceFilter}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>$5</span>
                  <span>$150+</span>
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">Availability</label>
                <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  {['all', 'available', 'taken'].map(status => (
                    <button
                      key={status}
                      onClick={() => setAvailabilityFilter(status as any)}
                      className={`flex-1 capitalize text-sm py-1.5 rounded-lg font-medium transition-all ${
                        availabilityFilter === status
                          ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extension Filters */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">Filter by Extension</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(results.map(r => r.extension))).map(ext => (
                    <button
                      key={ext}
                      onClick={() => toggleExtension(ext)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${extFilters.includes(ext)
                        ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
                        }`}
                    >
                      {ext}
                    </button>
                  ))}
                </div>
                
                {/* Add Custom Extension */}
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={customExtInput}
                    onChange={e => setCustomExtInput(e.target.value)}
                    placeholder="Add custom (e.g. .uk)"
                    className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomExt();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddCustomExt}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  Search Results <span className="text-slate-400 text-lg font-normal ml-2">({filteredResults.length})</span>
                </h2>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-medium transition-colors ring-1 ring-indigo-200"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredResults.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl ring-1 ring-slate-100"
                    >
                      No domains match your current filters. Try adjusting them!
                    </motion.div>
                  ) : (
                    filteredResults.map((domain, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        key={domain.domain}
                        className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-900/5 flex flex-col justify-between hover:shadow-md hover:ring-indigo-100 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="truncate pr-4">
                            <h3 className="text-xl font-bold text-slate-900 truncate">
                              {domain.domain.replace(domain.extension, '')}
                              <span className="text-indigo-500">{domain.extension}</span>
                            </h3>
                          </div>
                          {domain.isAvailable ? (
                            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-sm font-semibold ring-1 ring-green-600/20 shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                              Available
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-sm font-semibold ring-1 ring-red-600/20 shrink-0">
                              <XCircle className="w-4 h-4" />
                              Taken
                            </div>
                          )}
                        </div>

                        <div className="flex items-end justify-between mt-auto">
                          <div>
                            {domain.isAvailable ? (
                              <>
                                <p className="text-xs text-slate-500 font-medium mb-1">Estimated Price</p>
                                <p className="text-2xl font-bold text-slate-900">${domain.price.toFixed(2)}<span className="text-sm font-normal text-slate-400">/yr</span></p>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400 font-medium italic">Unavailable for purchase</p>
                            )}
                          </div>
                          <button
                            disabled={!domain.isAvailable}
                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${domain.isAvailable
                              ? 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                          >
                            Buy Now
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
