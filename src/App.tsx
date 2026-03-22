/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, ExternalLink, Download, AlertCircle, Loader2, Copy, Check, FileText, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { findPaperDoi, extractReferencesFromPdf, PaperInfo } from './services/paperService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SCI_HUB_MIRRORS = [
  'https://sci-hub.ru',
  'https://sci-hub.st',
  'https://sci-hub.se',
  'https://sci-hub.ee',
  'https://sci-hub.wf',
  'https://sci-hub.it.nf',
  'https://sci-hub.mksa.top',
  'https://sci-hub.ren',
];

const ALTERNATIVE_SOURCES = [
  { name: 'LibGen (Papers)', getUrl: (doi: string) => `https://libgen.li/ads.php?doi=${doi}` },
  { name: 'Google Scholar', getUrl: (title: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` },
  { name: 'ResearchGate', getUrl: (title: string) => `https://www.researchgate.net/search/publication?q=${encodeURIComponent(title)}` },
  { name: 'PubMed', getUrl: (title: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(title)}` },
  { name: 'Semantic Scholar', getUrl: (doi: string) => `https://www.semanticscholar.org/search?q=${doi}` },
  { name: 'Google PDF Search', getUrl: (title: string) => `https://www.google.com/search?q=${encodeURIComponent(title)}+filetype:pdf` },
  { name: 'Sci-Hub Search Page', getUrl: (doi: string) => `https://sci-hub.ru/` },
];

type AppMode = 'v1' | 'v2';

export default function App() {
  const [mode, setMode] = useState<AppMode>('v1');
  const [selectedMirror, setSelectedMirror] = useState(SCI_HUB_MIRRORS[0]);
  const [citation, setCitation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaperInfo | null>(null);
  const [results, setResults] = useState<PaperInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingDoi, setIsEditingDoi] = useState(false);
  const [editedDoi, setEditedDoi] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citation.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setIsEditingDoi(false);

    try {
      const info = await findPaperDoi(citation);
      setResult(info);
      setEditedDoi(info.doi || '');
      if (!info.doi) {
        setError("DOI bulunamadı. Bu makale çok yeni (2022-2025) olabilir veya veritabanında henüz yer almamış olabilir. Aşağıdaki alternatif kaynakları deneyebilirsiniz.");
      }
    } catch (err) {
      setError("Atıf analiz edilemedi ancak aşağıdan manuel arama yapabilirsiniz.");
      // Create a dummy result for title-based search if AI fails
      setResult({
        title: citation.substring(0, 200),
        doi: null,
        authors: 'Unknown',
        journal: 'Unknown',
        year: 'Unknown',
        confidence: 0
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setExpandedIndex(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const extracted = await extractReferencesFromPdf(base64);
          setResults(extracted);
          if (extracted.length === 0) {
            setError("No references were found in the PDF. Please check if the PDF has a standard bibliography section.");
          }
        } catch (err) {
          setError("Failed to extract references. The PDF might be too large or protected.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Error reading file.");
      setLoading(false);
    }
  };

  const handleDoiUpdate = () => {
    if (result) {
      setResult({ ...result, doi: editedDoi });
      setIsEditingDoi(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="w-full text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-3 bg-zinc-900 text-white rounded-2xl mb-6"
        >
          <BookOpen className="w-8 h-8" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-zinc-900 mb-4"
        >
          Paper Finder Pro
        </motion.h1>
        
        {/* Mode & Mirror Switcher */}
        <div className="flex flex-col items-center gap-6 mt-8">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => { setMode('v1'); setResult(null); setResults([]); setError(null); }}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                mode === 'v1' ? "bg-zinc-900 text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              )}
            >
              V1: Single Citation
            </button>
            <button
              onClick={() => { setMode('v2'); setResult(null); setResults([]); setError(null); }}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                mode === 'v2' ? "bg-zinc-900 text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              )}
            >
              V2: PDF References
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Preferred Sci-Hub Mirror</span>
            <div className="flex flex-wrap justify-center gap-2">
              {SCI_HUB_MIRRORS.map((mirror) => (
                <button
                  key={mirror}
                  onClick={() => setSelectedMirror(mirror)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-mono transition-all border",
                    selectedMirror === mirror 
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                  )}
                >
                  {mirror.replace('https://', '')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Search/Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full glass-card rounded-3xl p-6 sm:p-8 mb-8"
      >
        {mode === 'v1' ? (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <textarea
                value={citation}
                onChange={(e) => setCitation(e.target.value)}
                placeholder="Paste citation here..."
                className="academic-input min-h-[120px] resize-none"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !citation.trim()}
              className={cn(
                "w-full py-4 px-6 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 text-lg",
                loading || !citation.trim() 
                  ? "bg-zinc-300 cursor-not-allowed" 
                  : "bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] shadow-lg shadow-zinc-200"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? "Searching..." : "Find DOI & Links"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div 
              onClick={() => !loading && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                loading ? "border-zinc-200 bg-zinc-50 cursor-not-allowed" : "border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf" 
                className="hidden" 
              />
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-zinc-400" />
                  <p className="text-zinc-500 font-medium">Analyzing PDF References...</p>
                  <p className="text-xs text-zinc-400 italic">This may take a minute for large papers</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-zinc-100 rounded-full text-zinc-600">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-zinc-900 font-medium">Upload Research Paper (PDF)</p>
                    <p className="text-zinc-500 text-sm mt-1">We'll extract all references and find their download links</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 mb-8"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        {mode === 'v1' && result && !result.doi && (
          <motion.div
            key="no-doi-v1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Paper Details</span>
                  <h2 className="text-2xl font-serif font-bold text-zinc-900 leading-tight">{result.title}</h2>
                  <p className="text-zinc-600 italic">{result.authors}</p>
                  <p className="text-zinc-500 text-sm">{result.journal}, {result.year}</p>
                </div>
                
                <div className="h-px bg-zinc-100 my-2" />
                
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-sm text-zinc-600 mb-3 font-medium">Alternatif Arama Seçenekleri (Başlığa Göre):</p>
                    <div className="flex flex-wrap gap-2">
                      {ALTERNATIVE_SOURCES.filter(s => ['Google Scholar', 'ResearchGate', 'PubMed', 'Google PDF Search'].includes(s.name)).map((source) => (
                        <a
                          key={source.name}
                          href={source.getUrl(result.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                          <Search className="w-3 h-3" />
                          {source.name}
                        </a>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold">Neden DOI bulunamadı?</p>
                      <p>Makale çok yeni olabilir (2024-2025) veya girdiğiniz atıf eksik olabilir. Yukarıdaki butonlarla direkt akademik veritabanlarında arama yapabilirsiniz.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'v1' && result && result.doi && (
          <motion.div
            key="result-v1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full space-y-6"
          >
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Paper Details</span>
                  <h2 className="text-2xl font-serif font-bold text-zinc-900 leading-tight">
                    {result.title}
                  </h2>
                  <p className="text-zinc-600 italic">{result.authors}</p>
                  <p className="text-zinc-500 text-sm">
                    {result.journal}, {result.year}
                  </p>
                  {result.abstract && (
                    <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">Abstract Preview</span>
                      <p className="text-sm text-zinc-600 leading-relaxed italic">
                        "{result.abstract}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-zinc-100 my-2" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">DOI</span>
                    <div className="flex items-center gap-2">
                      {isEditingDoi ? (
                        <div className="flex items-center gap-2 w-full max-w-md">
                          <input
                            type="text"
                            value={editedDoi}
                            onChange={(e) => setEditedDoi(e.target.value)}
                            className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-1 rounded-md text-sm font-mono outline-none focus:ring-1 focus:ring-zinc-400"
                            placeholder="Enter DOI manually..."
                          />
                          <button
                            onClick={handleDoiUpdate}
                            className="px-3 py-1 bg-zinc-900 text-white text-xs rounded-md hover:bg-zinc-800 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingDoi(false);
                              setEditedDoi(result.doi || '');
                            }}
                            className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-md hover:bg-zinc-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <code className="bg-zinc-100 px-3 py-1 rounded-md text-zinc-800 font-mono text-sm break-all">
                            {result.doi || "Not Found"}
                          </code>
                          <div className="flex items-center gap-1">
                            {result.doi && (
                              <button
                                onClick={() => copyToClipboard(result.doi!)}
                                className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600"
                                title="Copy DOI"
                              >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => setIsEditingDoi(true)}
                              className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 text-xs font-medium"
                              title="Edit DOI"
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {result.doi && (
                      <a
                        href={`https://doi.org/${result.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Official Source
                      </a>
                    )}
                    <a
                      href={`https://search.crossref.org/?q=${encodeURIComponent(result.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      Crossref
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {result.doi && parseInt(result.year) >= 2022 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 text-blue-700 mb-4 text-xs"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Not: Yeni Makale (2022-2025)</p>
                  <p>Sci-Hub veritabanı genellikle 2021 sonrasındaki makaleleri içermez. Eğer Sci-Hub linkleri çalışmazsa, lütfen "Alternative Sources" kısmındaki Google Scholar veya ResearchGate linklerini kullanın.</p>
                </div>
              </motion.div>
            )}

            {result.doi && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Sci-Hub Mirrors</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* LibGen as a primary alternative */}
                  <motion.a
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    href={`https://libgen.li/ads.php?doi=${result.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-center h-full border-emerald-200 bg-emerald-50/30 hover:border-emerald-400"
                  >
                    <div className="flex items-center gap-1">
                      <span className="block text-xs font-bold text-emerald-700">LibGen (Primary)</span>
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-[10px] text-emerald-600 font-mono">libgen.li</span>
                  </motion.a>

                  {SCI_HUB_MIRRORS.map((mirror, idx) => (
                    <div key={mirror} className="relative group">
                      <motion.a
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + idx * 0.05 }}
                        href={`${mirror}/${result.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "glass-card p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-center h-full",
                          selectedMirror === mirror 
                            ? "border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50" 
                            : "hover:border-zinc-400"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span className="block text-xs font-bold text-zinc-900">Mirror {idx + 1}</span>
                          {selectedMirror === mirror && <Check className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono truncate w-full px-1">
                          {mirror.replace('https://', '')}
                        </span>
                      </motion.a>
                      <button
                        onClick={() => copyToClipboard(`${mirror}/${result.doi}`)}
                        className="absolute top-1 right-1 p-1 bg-white/50 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600"
                        title="Copy Link"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Linkler çalışmıyor mu? (NXDOMAIN / Siteye Ulaşılamıyor hatası)</p>
                    <p>Bu durum genellikle internet servis sağlayıcınızın Sci-Hub adreslerini DNS düzeyinde engellemesinden kaynaklanır. Çözüm için:</p>
                    <ul className="list-disc list-inside ml-1 space-y-1">
                      <li><strong>DNS Değiştirin (Kesin Çözüm):</strong> Bilgisayar veya telefonunuzun DNS ayarlarını <strong>1.1.1.1</strong> (Cloudflare) veya <strong>8.8.8.8</strong> (Google) olarak değiştirin.</li>
                      <li><strong>VPN Kullanın:</strong> Ücretsiz bir VPN veya Opera tarayıcısının dahili VPN'ini kullanarak engelleri aşabilirsiniz.</li>
                      <li><strong>Farklı Mirror Deneyin:</strong> Yukarıdaki listeden farklı adresleri (özellikle .ru veya .mksa.top) test edin.</li>
                      <li><strong>Alternatif Kaynaklar:</strong> Aşağıdaki LibGen veya Google Scholar linklerini kullanın.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6 mb-2">
                  <ExternalLink className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Alternative Sources</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {ALTERNATIVE_SOURCES.map((source, idx) => (
                    <motion.a
                      key={source.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      href={['Google Scholar', 'ResearchGate', 'PubMed', 'Google PDF Search'].includes(source.name) ? source.getUrl(result.title) : source.getUrl(result.doi!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-2"
                    >
                      {source.name}
                    </motion.a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'v2' && results.length > 0 && (
          <motion.div
            key="results-v2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif font-bold text-zinc-900">Extracted References ({results.length})</h3>
              <span className="text-xs text-zinc-400 font-mono">Click to expand details</span>
            </div>
            {results.map((paper, idx) => (
              <div key={idx} className="glass-card rounded-2xl overflow-hidden transition-all">
                <button 
                  onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                  className="w-full p-4 flex items-start justify-between text-left hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium text-zinc-900 truncate">{paper.title}</p>
                    <p className="text-xs text-zinc-500 truncate mt-1">{paper.authors} • {paper.year}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {paper.doi && (
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                        DOI Found
                      </span>
                    )}
                    {expandedIndex === idx ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </div>
                </button>
                
                <AnimatePresence>
                  {expandedIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-100 bg-zinc-50/50 p-4 space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Links</span>
                          <div className="flex flex-wrap gap-2">
                            {paper.doi && (
                              <>
                                <a 
                                  href={`${selectedMirror}/${paper.doi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-zinc-900 text-white text-xs rounded-lg flex items-center gap-2 hover:bg-zinc-800"
                                >
                                  <Download className="w-3 h-3" />
                                  Sci-Hub
                                </a>
                                <a 
                                  href={`https://doi.org/${paper.doi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs rounded-lg flex items-center gap-2 hover:bg-zinc-50"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  DOI
                                </a>
                              </>
                            )}
                            <a 
                              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs rounded-lg flex items-center gap-2 hover:bg-zinc-50"
                            >
                              <Search className="w-3 h-3" />
                              Scholar
                            </a>
                            <a 
                              href={`https://www.researchgate.net/search/publication?q=${encodeURIComponent(paper.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs rounded-lg flex items-center gap-2 hover:bg-zinc-50"
                            >
                              <Search className="w-3 h-3" />
                              ResearchGate
                            </a>
                            {paper.doi && (
                              <a 
                                href={`https://libgen.li/ads.php?doi=${paper.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs rounded-lg flex items-center gap-2 hover:bg-zinc-50"
                              >
                                <Download className="w-3 h-3" />
                                LibGen
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">DOI</span>
                          <code className="block text-xs font-mono text-zinc-600 break-all">{paper.doi || "Not Found"}</code>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto pt-12 text-center text-zinc-400 text-sm">
        <p>Powered by Gemini AI • Version 2.0 (Multimodal PDF Analysis)</p>
      </footer>
    </div>
  );
}
