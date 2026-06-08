'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Search,
  Copy,
  ExternalLink,
  Check,
  Loader2,
  Sparkles,
  FileText,
  Users,
  Globe,
  Briefcase,
  AlertCircle,
  Upload,
  Database,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { 
  getAccounts, 
  addAccount, 
  deleteAccount, 
  saveResearchResult, 
  getResearchResult, 
  initAuth, 
  googleSignIn, 
  logout,
  Account,
  ResearchResult
} from '../lib/firebase';
import type { User } from 'firebase/auth';

const VERTICAL_METADATA: Record<string, { label: string; color: string; bg: string }> = {
  professional_association: { label: "Professional Association", color: "text-emerald-700 border-emerald-200", bg: "bg-emerald-50" },
  credentialing_body: { label: "Credentialing Body", color: "text-purple-700 border-purple-200", bg: "bg-purple-50" },
  continuing_education: { label: "Continuing Education", color: "text-amber-700 border-amber-200", bg: "bg-amber-50" },
  trade_group: { label: "Trade Group", color: "text-blue-700 border-blue-200", bg: "bg-blue-50" },
  nonprofit_education: { label: "Nonprofit Edu", color: "text-teal-700 border-teal-200", bg: "bg-teal-50" },
  government_training: { label: "Government Training", color: "text-rose-700 border-rose-200", bg: "bg-rose-50" },
  corporate_learning: { label: "Corporate Learning", color: "text-cyan-700 border-cyan-200", bg: "bg-cyan-50" }
};

const SEED_TARGETS: Omit<Account, 'id' | 'createdAt' | 'userId'>[] = [
  {
    name: "Apex Healthcare Academy",
    vertical: "continuing_education",
    website: "https://apexhealthcare.org",
    notes: "Specializes in nursing re-certifications and hospital compliance seminars. Suspected Moodle server."
  },
  {
    name: "Global Builders Union",
    vertical: "trade_group",
    website: "https://globalbuilders.net",
    notes: "Trade union looking to modernize their safety inspector certificate programs. Legacy site."
  },
  {
    name: "TechPath Training Corp",
    vertical: "corporate_learning",
    website: "https://techpath.training",
    notes: "Corporate onboarding and skill-gap training provider. Currently paying high rates to Litmos."
  },
  {
    name: "National Wildlife Council",
    vertical: "nonprofit_education",
    website: "https://nationalwildlife.edu",
    notes: "Public education and ranger training courses. Uses Blackboard but student feedback is very low."
  }
];

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('all');
  
  // Create Form State
  const [newOrgName, setNewOrgName] = useState('');
  const [newVertical, setNewVertical] = useState('corporate_learning');
  const [newWebsite, setNewWebsite] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [simulatedQueries, setSimulatedQueries] = useState<string[]>([]);
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  
  // Exporting state
  const [isExporting, setIsExporting] = useState(false);
  const [exportedDocUrl, setExportedDocUrl] = useState<string | null>(null);
  
  // Notification / Connection error tracking
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Trigger temporary flash notices
  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Auth & Account Synchronization
  useEffect(() => {
    const unsub = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        loadAccounts(true);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        loadAccounts(false);
      }
    );
    return () => unsub();
  }, []);

  const loadAccounts = async (isAuthenticated: boolean) => {
    try {
      if (isAuthenticated) {
        const list = await getAccounts();
        if (list.length === 0) {
          // Autoseed if empty database
          const seeded: Account[] = [];
          for (const item of SEED_TARGETS) {
            const added = await addAccount(item);
            seeded.push(added);
          }
          setAccounts(seeded);
          showNotice("Database initialized with seed prospecting targets", "success");
        } else {
          setAccounts(list);
        }
        setIsOfflineMode(false);
      } else {
        const saved = localStorage.getItem('prospecting_local_accounts');
        if (saved) {
          setAccounts(JSON.parse(saved));
        } else {
          setAccounts([]);
        }
      }
    } catch (e) {
      console.error("Failed to load accounts in standard flow, using localStorage", e);
      setIsOfflineMode(true);
      const saved = localStorage.getItem('prospecting_local_accounts');
      if (saved) {
        setAccounts(JSON.parse(saved));
      }
    }
  };

  // Keep localStorage sync'ed in offline fallback
  useEffect(() => {
    if (isOfflineMode || !user) {
      localStorage.setItem('prospecting_local_accounts', JSON.stringify(accounts));
    }
  }, [accounts, isOfflineMode, user]);

  // Load account research result when changing selection
  useEffect(() => {
    if (selectedAccount) {
      setResearchResult(null);
      setExportedDocUrl(null);
      
      const fetchResearch = async () => {
        try {
          if (user) {
            const result = await getResearchResult(selectedAccount.id);
            if (result) {
              setResearchResult(result);
            }
          } else {
            const savedResearch = localStorage.getItem(`local_research_${selectedAccount.id}`);
            if (savedResearch) {
              setResearchResult(JSON.parse(savedResearch));
            }
          }
        } catch (err) {
          console.error("Failed getting research cached history:", err);
        }
      };
      
      fetchResearch();
    }
  }, [selectedAccount, user]);

  // Simulated Google Grounding Search Queries cycles
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResearching && simulatedQueries.length > 0) {
      setActiveQueryIndex(0);
      interval = setInterval(() => {
        setActiveQueryIndex((prev) => (prev + 1) % simulatedQueries.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isResearching, simulatedQueries]);

  // Trigger Google Login
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setAccessToken(res.accessToken);
      showNotice(`Welcome AE ${res.user.displayName || 'Pat'}! Successfully authenticated.`, 'success');
      loadAccounts(true);
    } catch (err) {
      console.error("Login failure:", err);
      showNotice("Auth popup failed. Initializing secure Offline Mode instead.", "info");
      setIsOfflineMode(true);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setSelectedAccount(null);
    showNotice("AE session ended", "info");
    loadAccounts(false);
  };

  // Push seed data manually
  const triggerManualSeed = () => {
    const listToSet = [...accounts];
    const newItems: Account[] = [];
    
    SEED_TARGETS.forEach((item, idx) => {
      const alreadyExists = listToSet.some(existing => existing.name.toLowerCase() === item.name.toLowerCase());
      if (!alreadyExists) {
        const generated: Account = {
          id: `local-seed-${Date.now()}-${idx}`,
          userId: '',
          ...item,
          createdAt: new Date().toISOString()
        };
        newItems.push(generated);
      }
    });

    if (newItems.length > 0) {
      const updatedList = [...newItems, ...listToSet];
      setAccounts(updatedList);
      showNotice(`Successfully seeded ${newItems.length} prospecting targets!`, 'success');
    } else {
      showNotice("Targets are already seeded in your active directory list.", "info");
    }
  };

  // CSV parsing upload handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          showNotice("File is empty or lacks headers", "error");
          return;
        }

        // Simplistic CSV Parser
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
        const addedAccounts: Account[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Regex to split taking nested quotes into account
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const cols = matches.map(c => c.trim().replace(/^"|"$/g, ''));
          
          let name = '';
          let vertical = 'corporate_learning';
          let website = '';
          let notes = '';

          headers.forEach((header, index) => {
            const val = cols[index] || '';
            if (header.includes('name') || header.includes('org') || header.includes('organization')) {
              name = val;
            } else if (header.includes('vertical') || header.includes('type')) {
              // Map to valid vertical keys
              const cleanVal = val.toLowerCase().replace(/[\s-]/g, '_');
              if (VERTICAL_METADATA[cleanVal]) {
                vertical = cleanVal;
              }
            } else if (header.includes('web') || header.includes('link') || header.includes('site')) {
              website = val;
            } else if (header.includes('note') || header.includes('desc') || header.includes('context')) {
              notes = val;
            }
          });

          if (name) {
            if (user) {
              const added = await addAccount({ name, vertical, website, notes });
              addedAccounts.push(added);
            } else {
              const generated: Account = {
                id: `csv-${Date.now()}-${i}`,
                userId: '',
                name,
                vertical,
                website,
                notes,
                createdAt: new Date().toISOString()
              };
              addedAccounts.push(generated);
            }
          }
        }

        if (addedAccounts.length > 0) {
          setAccounts(prev => [...addedAccounts, ...prev]);
          showNotice(`Successfully imported ${addedAccounts.length} targets from CSV!`, 'success');
        } else {
          showNotice("No valid rows containing name/organization columns were found.", "error");
        }
      } catch (err) {
        console.error("CSV Import error:", err);
        showNotice("Failed to parse CSV file standard headers.", "error");
      }
    };

    reader.readAsText(file);
    // Reset file input target
    e.target.value = '';
  };

  // Add individual account Target
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      showNotice("Organization target name is required", "error");
      return;
    }

    try {
      const dataToPost = {
        name: newOrgName.trim(),
        vertical: newVertical,
        website: newWebsite.trim(),
        notes: newNotes.trim()
      };

      if (user) {
        const added = await addAccount(dataToPost);
        setAccounts(prev => [added, ...prev]);
        setSelectedAccount(added);
      } else {
        const added: Account = {
          id: `local-custom-${Date.now()}`,
          userId: '',
          ...dataToPost,
          createdAt: new Date().toISOString()
        };
        setAccounts(prev => [added, ...prev]);
        setSelectedAccount(added);
      }

      // Reset form variables
      setNewOrgName('');
      setNewWebsite('');
      setNewNotes('');
      showNotice(`${dataToPost.name} added to live directory`, 'success');
    } catch (err) {
      console.error("Add account failed:", err);
      showNotice("Database sync failed, account loaded locally.", "error");
    }
  };

  // Delete target account
  const handleDeleteAccount = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (user) {
        await deleteAccount(id);
      }
      setAccounts(prev => prev.filter(item => item.id !== id));
      if (selectedAccount?.id === id) {
        setSelectedAccount(null);
        setResearchResult(null);
      }
      showNotice("Target account purged successfully", "success");
    } catch (err) {
      console.error("Deletion failed:", err);
      showNotice("Purging error, database lock encountered.", "error");
    }
  };

  // Trigger Gemini Prospecting Intelligence Sequence
  const triggerResearch = async () => {
    if (!selectedAccount) return;
    
    setIsResearching(true);
    setExportedDocUrl(null);
    setResearchResult(null);
    
    // Set seed queries to simulate progressive indexing immediately while waiting
    setSimulatedQueries([
      `Querying search index: What LMS does '${selectedAccount.name}' currently use...`,
      `Locating active client domains for B2B Learning and Development pipelines...`,
      `Validating news for '${selectedAccount.name}' instructional strategies...`,
      `Cross-referencing D2L Brightspace displacements case studies for ${selectedAccount.vertical}...`
    ]);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedAccount.name,
          vertical: selectedAccount.vertical,
          website: selectedAccount.website,
          notes: selectedAccount.notes
        })
      });

      const json = await response.json();
      
      if (!response.ok || json.error) {
        throw new Error(json.error || 'Server error occurred during prompt compilation.');
      }

      if (json.searchQueries && json.searchQueries.length > 0) {
        setSimulatedQueries(json.searchQueries.map((q: string) => `Executed search for: "${q}"`));
      }

      const generatedResult: ResearchResult = {
        accountId: selectedAccount.id,
        ...json.data,
        researchedAt: new Date().toISOString()
      };

      setResearchResult(generatedResult);

      // Save to cache
      if (user) {
        await saveResearchResult(generatedResult);
      } else {
        localStorage.setItem(`local_research_${selectedAccount.id}`, JSON.stringify(generatedResult));
      }

      showNotice(`Prospecting complete for ${selectedAccount.name}!`, 'success');
    } catch (err: any) {
      console.error("Intelligence flow aborted:", err);
      showNotice(`Research failed: ${err.message || 'Gemini API unavailable'}`, "error");
    } finally {
      setIsResearching(false);
    }
  };

  // Export results to Google Docs using the OAuth token
  const handleExportToDoc = async () => {
    if (!researchResult || !selectedAccount) return;
    
    if (!accessToken) {
      showNotice("Authentication required: Please login with Google to enable Drive & Docs workspace connections.", "error");
      return;
    }

    setIsExporting(true);
    setExportedDocUrl(null);

    const docTitle = `Prospect Briefing: ${selectedAccount.name} - Pitch Draft`;
    const docContent = `
PROSPECT BRIEFING & OUTREACH STUDY
Prepared by Account Executive "Pat"
Target: ${researchResult.orgName} (${VERTICAL_METADATA[selectedAccount.vertical]?.label || selectedAccount.vertical})
Detected Solution: ${researchResult.detectedLms}
Switch Urgency (Displacement Risk): ${100 - researchResult.displacementScore}/100

CORE VALUE PROPOSITION & SYSTEM VULNERABILITIES:
${researchResult.lmsPainPoints.map((pt, idx) => `${idx + 1}. ${pt}`).join('\n')}

L&D INDUSTRY NEWS SPOTTED:
${researchResult.learningNews.map(item => `* ${item.headline} (${item.date}): ${item.summary}`).join('\n')}

PITCH ANGLE FOCUS:
${researchResult.customerStoryAngle}

REVENUE OUTREACH TEMPLATE DRAFT:
=========================================
${researchResult.draftEmail}
=========================================
Generated on ${new Date(researchResult.researchedAt).toLocaleDateString()}
    `.trim();

    try {
      const response = await fetch('/api/export-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken,
          title: docTitle,
          content: docContent
        })
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error || 'Connection to Google Drive client failed.');
      }

      setExportedDocUrl(json.docUrl);
      showNotice("Successfully synced to Google Docs and loaded to Google Drive!", "success");
    } catch (err: any) {
      console.error("Export operation abort:", err);
      showNotice(`Export to Docs failed: ${err.message || 'Scope access restriction'}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const copyEmailToClipboard = () => {
    if (!researchResult) return;
    navigator.clipboard.writeText(researchResult.draftEmail);
    setIsCopied(true);
    showNotice("Cold email draft copied to clipboard!", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filtering list
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (account.website && account.website.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = verticalFilter === 'all' || account.vertical === verticalFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div id="prosp_root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      {/* Visual notification banner */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2 max-w-md ${
              notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
              notification.type === 'error' ? 'bg-rose-950/90 border-rose-500 text-rose-200' :
              'bg-blue-950/90 border-blue-500 text-blue-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header navigation */}
      <header id="prosp_header" className="bg-slate-950/80 backdrop-blur border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-950/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              D2L Prospecting Intelligence
              <span className="text-[10px] bg-rose-950 border border-rose-800/60 text-rose-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">AE Suite</span>
            </h1>
            <p className="text-xs text-slate-400">Strategic outreach accelerator for D2L Brightspace</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 pl-3 pr-2 py-1.5 rounded-full shadow-inner">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-100">{user.displayName || 'Pat'}</span>
                <span className="text-[9px] text-emerald-400 font-mono">Google Synced</span>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-slate-700" />
              ) : (
                <div className="w-7 h-7 uppercase rounded-full bg-rose-800 flex items-center justify-center text-xs text-white font-bold">{user.displayName ? user.displayName[0] : 'P'}</div>
              )}
              <button 
                onClick={handleSignOut}
                title="Disconnect Google authentication"
                className="p-1 px-2 rounded hover:bg-slate-800 transition text-slate-400 hover:text-slate-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2.5 bg-white text-slate-900 hover:bg-slate-100 transition px-4 py-2 rounded-xl text-sm font-semibold shadow-md active:scale-95"
            >
              {/* Manual G Logo Drawing */}
              <svg className="w-4 h-4 text-slate-900 shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-5.84-4.53z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign-In with Google Drive
            </button>
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <main id="prosp_container" className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Directory Sidebar & CSV Controller */}
        <section id="prosp_left_section" className="lg:col-span-5 space-y-6">
          
          {/* Card: AE Seeding & CSV Upload Area */}
          <div className="bg-slate-950/80 border border-slate-805/90 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                <Database className="w-3.5 h-3.5 text-rose-500" />
                Target Sourcing Area
              </span>
              <button 
                onClick={triggerManualSeed}
                className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 font-bold px-2 py-1 rounded transition flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Seed Targets
              </button>
            </div>

            <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition cursor-pointer relative group">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center mx-auto text-slate-400 group-hover:text-rose-400 group-hover:border-rose-950 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Upload Target Directory CSV</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Supports organization, website, vertical, and notes columns</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Add Individual Prospect */}
          <div className="bg-slate-950/80 border border-slate-805/90 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <Plus className="w-3.5 h-3.5 text-rose-500" />
              Add Target Manually
            </h2>

            <form onSubmit={handleAddAccount} className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Organization Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Apex Recertification Institute"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl placeholder-slate-600 focus:outline-none focus:border-rose-500 leading-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Vertical Market</label>
                  <select 
                    value={newVertical}
                    onChange={(e) => setNewVertical(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 font-sans"
                  >
                    {Object.keys(VERTICAL_METADATA).map((key) => (
                      <option key={key} value={key}>
                        {VERTICAL_METADATA[key].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Primary Website</label>
                  <input 
                    type="url"
                    placeholder="https://example.org"
                    value={newWebsite}
                    onChange={(e) => setNewWebsite(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-xl placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Intelligence / Host Notes</label>
                <textarea 
                  placeholder="Any clues on current tech, integrations, key challenges..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-xl placeholder-slate-600 focus:outline-none focus:border-rose-500 font-sans leading-normal"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-rose-950/25 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Prospect Target
              </button>
            </form>
          </div>

          {/* Directory Filter Panel */}
          <div className="bg-slate-950/80 border border-slate-850/95 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                <Users className="w-3.5 h-3.5 text-rose-500" />
                Prospect Directory ({filteredAccounts.length})
              </h2>
            </div>

            {/* Filters inputs */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search directory by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 pl-8.5 pr-3 py-2 rounded-xl text-xs placeholder-slate-600 focus:outline-none text-slate-100"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setVerticalFilter('all')}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition ${
                    verticalFilter === 'all' 
                      ? 'bg-rose-950 text-rose-400 border border-rose-800' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  All Verticals
                </button>
                {Object.keys(VERTICAL_METADATA).map(key => (
                  <button
                    key={key}
                    onClick={() => setVerticalFilter(key)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition ${
                      verticalFilter === key 
                        ? 'bg-rose-950 text-rose-400 border border-rose-800' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {VERTICAL_METADATA[key].label.replace(' Learning', '').replace(' Training', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* List block */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600">
                  <Briefcase className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                  No prospect accounts match criteria.
                </div>
              ) : (
                filteredAccounts.map(account => {
                  const meta = VERTICAL_METADATA[account.vertical] || { label: account.vertical, color: "text-slate-400", bg: "bg-slate-900" };
                  const isSelected = selectedAccount?.id === account.id;

                  return (
                    <div
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex items-start justify-between gap-2.5 ${
                        isSelected 
                          ? 'bg-slate-900 border-rose-500/85 hover:border-rose-500 shadow-lg shadow-black/10' 
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-slate-100 truncate">{account.name}</h3>
                          {account.website && (
                            <a 
                              href={account.website} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-500 hover:text-slate-300 transition shrink-0"
                            >
                              <Globe className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteAccount(account.id, e)}
                        className="p-1 px-1.5 rounded hover:bg-rose-950/40 text-slate-600 hover:text-rose-400 transition"
                        title="Remove Target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>

        {/* Right Side: Active Workspace */}
        <section id="prosp_right_section" className="lg:col-span-7">
          
          {!selectedAccount ? (
            <div className="h-full bg-slate-950/60 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-xl select-none">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Sparkles className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <div className="max-w-xs space-y-1">
                <h2 className="text-sm font-semibold text-white">No Prospect Target Highlighted</h2>
                <p className="text-xs text-slate-500">Select an organization profile from your directory or seed dummy companies to run the Google Grounded Prospecting Intelligence sequence.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Company Details Frame */}
              <div className="bg-slate-950/80 border border-slate-805/90 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Active Workspace Target</span>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">{selectedAccount.name}</h2>
                    {selectedAccount.website && (
                      <a href={selectedAccount.website} target="_blank" rel="noreferrer" className="text-xs text-rose-400 hover:underline flex items-center gap-1">
                        {selectedAccount.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  {!isResearching && (
                    <button
                      onClick={triggerResearch}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl transition flex items-center gap-2.5 shadow-lg shadow-rose-950/15"
                    >
                      <Sparkles className="w-4 h-4 text-rose-200" />
                      Auditing Context Sequence
                    </button>
                  )}
                </div>

                {selectedAccount.notes && (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 leading-normal">
                    <span className="font-bold text-slate-200 block mb-0.5">AE Context Clues:</span>
                    {selectedAccount.notes}
                  </div>
                )}
              </div>

              {/* Researching Loading Sequence with Simulated Grounding Engine */}
              {isResearching && (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-inner space-y-4 font-mono text-center">
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
                    <p className="text-xs font-bold text-white tracking-wide uppercase">Pat&apos;s Live Google Grounding Sequence</p>
                    <p className="text-[10px] text-slate-500 mt-1">Grounded by Google Search API & Gemini 2.0 Flash</p>
                  </div>

                  <div className="bg-slate-900 text-slate-300 rounded-xl p-4 text-xs select-none border border-black text-left h-28 overflow-y-auto">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block animate-ping shrink-0" />
                      <span className="text-[10px] text-rose-400 uppercase font-black tracking-wider">Active Grounding Terminal</span>
                    </div>
                    <div className="space-y-1.5 leading-relaxed text-slate-400">
                      {simulatedQueries.slice(0, activeQueryIndex + 1).map((query, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-rose-500 font-bold select-none">&gt;&gt;</span>
                          <span>{query}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Rendered Intelligence Study Outbox */}
              {researchResult && !isResearching && (
                <div className="space-y-6">

                  {/* Top Stats Overview (LMS Brand + Displacement Friction Dial) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Detected LMS */}
                    <div className="bg-slate-950/85 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Detected Installed LMS</span>
                        <h4 className="text-lg font-black text-white">{researchResult.detectedLms || "In-House System"}</h4>
                        <p className="text-[10px] text-slate-400">Current platform footprint online</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-rose-500" />
                      </div>
                    </div>

                    {/* Displacement Score gauge */}
                    <div className="bg-slate-950/85 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">AE Urgency Indicator</span>
                        <div className="flex items-baseline gap-1.5">
                          <h4 className="text-lg font-black text-white">{researchResult.displacementScore ?? 50}/100</h4>
                          <span className={`text-[9px] font-bold uppercase ${
                            (researchResult.displacementScore ?? 50) < 40 ? 'text-emerald-400' :
                            (researchResult.displacementScore ?? 50) < 70 ? 'text-amber-400' :
                            'text-rose-400'
                          }`}>
                            {(researchResult.displacementScore ?? 50) < 40 ? 'Vulnerable target' :
                             (researchResult.displacementScore ?? 50) < 70 ? 'Moderate friction' :
                             'High entrenchment'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Friction rate (lower = simpler displacement)</p>
                      </div>
                      
                      {/* Interactive SVG displacement meter */}
                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="18" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <circle 
                            cx="24" 
                            cy="24" 
                            r="18" 
                            fill="none" 
                            stroke="#e11d48" 
                            strokeWidth="3.2" 
                            strokeDasharray="113" 
                            strokeDashoffset={113 - (113 * (researchResult.displacementScore ?? 50)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-300 font-mono">
                          {researchResult.displacementScore}%
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Middle Column Block: LMS Deficiencies & Live Grounding News */}
                  <div className="space-y-4">
                    
                    {/* LMS Vulnerabilities */}
                    <div className="bg-slate-950/85 border border-slate-805 rounded-2xl p-5 shadow-lg space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-850 pb-2">
                        <span className="w-2 h-2 rounded bg-rose-500 inline-block" />
                        Target LMS Flaws & Pain Points
                      </h4>
                      <ul className="space-y-2">
                        {researchResult.lmsPainPoints && researchResult.lmsPainPoints.map((vulnerability, i) => (
                          <li key={i} className="text-xs text-slate-400 leading-normal flex items-start gap-2">
                            <span className="text-rose-500 font-bold mt-0.5 select-none">•</span>
                            <span>{vulnerability}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Grounding News with Real Citation URLs */}
                    {researchResult.learningNews && researchResult.learningNews.length > 0 && (
                      <div className="bg-slate-950/85 border border-slate-805 rounded-2xl p-5 shadow-lg space-y-3">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-850 pb-2">
                          <span className="w-2 h-2 rounded bg-emerald-500 inline-block" />
                          Grounded B2B Sourced Events
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {researchResult.learningNews.map((news, i) => (
                            <div key={i} className="bg-slate-900/45 border border-slate-850/80 p-3.5 rounded-xl space-y-1.5 hover:border-slate-800 transition flex flex-col justify-between">
                              <div className="space-y-1">
                                <span className="text-[8px] text-emerald-400 font-bold uppercase font-mono">{news.date || 'Live Brief'}</span>
                                <h5 className="text-xs font-bold text-slate-100 leading-normal">{news.headline}</h5>
                                <p className="text-[10px] text-slate-400 leading-normal">{news.summary}</p>
                              </div>
                              {news.source_url && (
                                <a 
                                  href={news.source_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[9px] text-rose-400 hover:underline flex items-center gap-1 pt-1.5 self-start font-mono uppercase font-bold tracking-wider"
                                >
                                  View Source File
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* D2L Pitch Hook Angle */}
                    {researchResult.customerStoryAngle && (
                      <div className="bg-gradient-to-r from-rose-950/15 to-slate-950/80 border border-rose-950/70 rounded-2xl p-5 shadow-lg space-y-1.5">
                        <span className="text-[9px] text-rose-400 font-bold uppercase font-mono tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Pat&apos;s Brightspace Tailored Pitch Hook
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          &ldquo;{researchResult.customerStoryAngle}&rdquo;
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Bottom Block Chat outreach template outbox with Copy & Export Connections */}
                  <div className="bg-slate-950 border border-slate-805 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">Personalized Outreach Email</h4>
                        <p className="text-[10px] text-slate-500">Curated specifically to address identified pain points</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={copyEmailToClipboard}
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-200 font-medium text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? 'Copied' : 'Copy Draft'}
                        </button>

                        <button
                          onClick={handleExportToDoc}
                          disabled={isExporting}
                          className="bg-rose-600/90 text-white hover:bg-rose-600 border border-rose-500/10 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                          Export Document
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-950 p-4.5 rounded-xl font-sans text-xs text-slate-300 leading-relaxed whitespace-pre-line overflow-x-auto max-h-[380px] overflow-y-auto">
                      {researchResult.draftEmail}
                    </div>

                    {exportedDocUrl && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-950/40 border border-emerald-900 p-4 rounded-xl flex items-center justify-between gap-2 text-emerald-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Google Doc created! Your outreach is finalized.</span>
                        </div>
                        <a 
                          href={exportedDocUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 shadow hover:bg-emerald-400 transition"
                        >
                          Open Document
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </motion.div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </section>

        </main>
    </div>
  );
}
