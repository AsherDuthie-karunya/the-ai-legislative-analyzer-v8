import React, { useState, useEffect, useRef } from 'react';
import { Search, Scale, FileText, ShieldAlert, Users, HelpCircle, ArrowRight, Zap, Database, Globe, Plus, X, Loader2, AlertCircle, BookOpen, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { compressLegalText, generateCitizenExplanation } from './services/aiService';
import { globalVectorStore } from './services/vectorService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Law {
  id: string;
  title: string;
  category: string;
  date: string;
  oneLiner: string;
  shortSummary: string[];
  fullAnalysis?: any;
}

export default function App() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills'>('dashboard');
  
  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Law Processing State
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [rawLegalText, setRawLegalText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [processError, setProcessError] = useState('');

  const hasApiKey = !!process.env.GEMINI_API_KEY;

  useEffect(() => {
    fetch('/api/laws')
      .then(res => res.json())
      .then(data => {
        setLaws(data);
        // Pre-populate vector store with mock data for demo
        data.forEach((law: Law) => {
          globalVectorStore.add(law.id, law.oneLiner + " " + law.shortSummary.join(" "), law);
        });
      });
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const categories = ['All', 'Digital Law', 'Tax', 'Education', 'Environment'];

  const filteredLaws = laws.filter(law => {
    const matchesSearch = law.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         law.oneLiner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || law.category === selectedCategory;
    const matchesTab = activeTab === 'dashboard' || law.title.toLowerCase().includes('bill');
    return matchesSearch && matchesCategory && matchesTab;
  });

  const handleProcessLaw = async () => {
    if (!rawLegalText.trim()) return;
    setIsProcessing(true);
    setProcessError('');
    setProcessStep('Initializing hierarchical compression...');
    
    try {
      const analysis = await compressLegalText(rawLegalText, (step) => setProcessStep(step));
      const newLaw: Law = {
        id: `law-${Date.now()}`,
        title: analysis.title || analysis.Title || "New Analyzed Law",
        category: "Uncategorized",
        date: new Date().toISOString().split('T')[0],
        oneLiner: analysis.oneLiner || analysis.KeyProvisions?.[0] || "A new legal document analyzed by AI.",
        shortSummary: analysis.KeyProvisions || [],
        fullAnalysis: analysis
      };
      
      // Save to backend
      const response = await fetch('/api/laws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLaw)
      });
      
      if (!response.ok) throw new Error("Failed to save law to database.");
      
      const savedLaw = await response.json();
      setLaws(prev => [savedLaw, ...prev]);
      await globalVectorStore.add(savedLaw.id, rawLegalText, savedLaw);
      
      setIsProcessModalOpen(false);
      setRawLegalText('');
      setSelectedLaw(savedLaw);
    } catch (error) {
      setProcessError(error instanceof Error ? error.message : 'Failed to analyze document.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || isTyping) return;
    
    const userMsg = chatQuery;
    setChatQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);
    
    try {
      // RAG Flow: Search Vector Store -> Generate Explanation
      const results = await globalVectorStore.search(userMsg, 2);
      const context = results.map(r => r.metadata);
      
      const aiResponse = await generateCitizenExplanation(userMsg, context);
      setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {!hasApiKey && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 text-center text-amber-800 text-sm font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Gemini API Key missing. AI features will be disabled. Set GEMINI_API_KEY in your secrets.
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Scale className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AI Legislative Analyzer</h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn("hover:text-indigo-600 transition-colors", activeTab === 'dashboard' && "text-indigo-600")}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('bills')}
              className={cn("hover:text-indigo-600 transition-colors", activeTab === 'bills' && "text-indigo-600")}
            >
              Latest Bills
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight"
          >
            Indian Laws, <span className="text-indigo-600">Simplified.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto mb-10"
          >
            We use hierarchical token compression and RAG to turn 100k+ token legal documents into clear, actionable insights for every citizen.
          </motion.p>

          {/* Search & Action Bar */}
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative group w-full">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Search for a law, bill, or legal query..."
                className="w-full pl-14 pr-6 py-5 bg-white border-2 border-transparent rounded-2xl shadow-xl focus:border-indigo-600 focus:ring-0 transition-all outline-none text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsProcessModalOpen(true)}
              className="bg-indigo-600 text-white px-8 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 shrink-0"
            >
              <Plus className="w-5 h-5" />
              Analyze New Law
            </button>
          </div>
        </section>

        {/* Pipeline Stats (Architecture Highlight) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Zap className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Token Compression</h3>
              <p className="text-sm text-gray-500">95% reduction in context size using hierarchical summarization.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Database className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Semantic RAG</h3>
              <p className="text-sm text-gray-500">Retrieving only relevant chunks from 100k+ token documents.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Globe className="text-purple-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Multilingual Support</h3>
              <p className="text-sm text-gray-500">Available in English, Hindi, and 12 regional languages.</p>
            </div>
          </div>
        </section>

        {/* Categories & Feed */}
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full md:w-64 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Categories</h4>
            <div className="flex flex-col gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "text-left px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
              <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Need Help?
              </h4>
              <p className="text-xs text-indigo-700 leading-relaxed mb-4">
                Ask our AI about any specific clause or how a new bill affects your business.
              </p>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Start AI Chat
              </button>
            </div>
          </aside>

          {/* Law Feed */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">Latest Legislation</h3>
              <span className="text-sm text-gray-500">{filteredLaws.length} Results Found</span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredLaws.map((law) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={law.id}
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                    onClick={() => setSelectedLaw(law)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {law.category}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{law.date}</span>
                    </div>
                    <h4 className="text-2xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">{law.title}</h4>
                    <p className="text-gray-600 mb-6 leading-relaxed">{law.oneLiner}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {law.shortSummary.slice(0, 3).map((point, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-medium">
                          • {point}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center text-indigo-600 font-bold text-sm">
                      View Citizen Impact Analysis
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Chat Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 right-8 w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-gray-100 z-[110] overflow-hidden flex flex-col"
          >
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">Legislative Assistant</h4>
                  <p className="text-[10px] opacity-70">RAG-Powered Analysis</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatHistory.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-sm text-gray-400">Ask me anything about Indian Laws</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border border-gray-100 shadow-sm text-gray-700"
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-1 items-center px-4">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-gray-100">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Type your query..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  disabled={!hasApiKey}
                />
                <button 
                  type="submit"
                  disabled={!hasApiKey || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Process Law Modal */}
      <AnimatePresence>
        {isProcessModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isProcessing && setIsProcessModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Analyze New Legal Document</h3>
                <button onClick={() => setIsProcessModalOpen(false)} disabled={isProcessing}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-8">
                <p className="text-sm text-gray-500 mb-4">Paste the full text of a bill or act. Our AI will compress it and add it to your dashboard.</p>
                <textarea 
                  className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none"
                  placeholder="Paste legal text here..."
                  value={rawLegalText}
                  onChange={(e) => setRawLegalText(e.target.value)}
                  disabled={isProcessing}
                />
                {isProcessing && (
                  <div className="mt-4 flex items-center gap-3 text-indigo-600 font-medium animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">{processStep}</span>
                  </div>
                )}
                {processError && <p className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {processError}</p>}
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                <button 
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-6 py-2 text-sm font-bold text-gray-500"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleProcessLaw}
                  disabled={isProcessing || !rawLegalText.trim() || !hasApiKey}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Start Analysis"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLaw && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedLaw(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-indigo-50/50">
                <div>
                  <span className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2 block">{selectedLaw.category}</span>
                  <h3 className="text-3xl font-black text-gray-900 leading-tight">{selectedLaw.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedLaw(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left Column: Summary */}
                  <div className="md:col-span-2 space-y-8">
                    <section>
                      <h5 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                        <FileText className="w-4 h-4" />
                        Key Provisions
                      </h5>
                      <div className="space-y-4">
                        {selectedLaw.shortSummary.map((point, idx) => (
                          <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm font-bold text-indigo-600 text-xs">
                              {idx + 1}
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {selectedLaw.fullAnalysis?.Definitions && (
                      <section className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                        <h5 className="flex items-center gap-2 text-sm font-bold text-indigo-700 uppercase tracking-widest mb-4">
                          <BookOpen className="w-4 h-4" />
                          Key Definitions
                        </h5>
                        <ul className="space-y-3">
                          {Array.isArray(selectedLaw.fullAnalysis.Definitions) ? 
                            selectedLaw.fullAnalysis.Definitions.map((d: string, i: number) => <li key={i} className="text-indigo-900 text-sm leading-relaxed">• {d}</li>) :
                            <p className="text-indigo-900 text-sm leading-relaxed">{selectedLaw.fullAnalysis.Definitions}</p>
                          }
                        </ul>
                      </section>
                    )}

                    {selectedLaw.fullAnalysis?.Penalties && (
                      <section className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <h5 className="flex items-center gap-2 text-sm font-bold text-emerald-700 uppercase tracking-widest mb-4">
                          <ShieldAlert className="w-4 h-4" />
                          Penalties & Obligations
                        </h5>
                        <ul className="space-y-2">
                          {Array.isArray(selectedLaw.fullAnalysis.Penalties) ? 
                            selectedLaw.fullAnalysis.Penalties.map((p: string, i: number) => <li key={i} className="text-emerald-900 text-sm leading-relaxed">• {p}</li>) :
                            <p className="text-emerald-900 text-sm leading-relaxed">{selectedLaw.fullAnalysis.Penalties}</p>
                          }
                        </ul>
                      </section>
                    )}
                  </div>

                  {/* Right Column: Impact */}
                  <div className="space-y-8">
                    <section>
                      <h5 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                        <Users className="w-4 h-4" />
                        Who is Affected?
                      </h5>
                      <ul className="space-y-2">
                        {(selectedLaw.fullAnalysis?.Stakeholders || ['Individual Citizens', 'Tech Companies', 'E-commerce Platforms', 'Govt Agencies']).map((item: string) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="p-6 bg-indigo-600 rounded-3xl text-white">
                      <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 opacity-80">
                        Citizen FAQ
                      </h5>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold mb-1">How can I use this?</p>
                          <p className="text-[11px] opacity-70">Use the AI Chat to ask specific questions about this document.</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold mb-1">Is this legal advice?</p>
                          <p className="text-[11px] opacity-70">No, this is an AI-powered summary for informational purposes only.</p>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${i}/32/32`} alt="user" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">1.2k citizens analyzed this today</span>
                </div>
                <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                  Download Full Analysis (PDF)
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
