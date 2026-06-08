"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Upload, 
  Search, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Mail, 
  User, 
  Building2, 
  Globe, 
  Phone, 
  FileText, 
  Check, 
  Copy, 
  Trash2, 
  SlidersHorizontal, 
  CheckSquare, 
  Briefcase,
  ChevronRight,
  LogOut,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

// Types
interface BANTAnalysis {
  budget: string;
  authority: string;
  need: string;
  timeline: string;
}

interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  status: "New" | "Contacted" | "Qualified" | "ClosedWon" | "ClosedLost";
  score: number;
  notes: string;
  userId: string;
  createdAt: any;
  updatedAt?: any;
  aiEmail?: {
    subject: string;
    body: string;
  };
  aiAnalysis?: {
    score: number;
    bantAnalysis: BANTAnalysis;
    strengths: string[];
    risks: string[];
    nextSteps: string[];
  };
}

// Initial Premium Dummy Leads for dynamic demonstration
const DEFAULT_DUMMY_LEADS = (userId: string): Partial<Lead>[] => [
  {
    name: "Sarah Jenkins",
    company: "VantaLink Solutions",
    role: "VP of Product Engineering",
    email: "sjenkin@vantalink.io",
    phone: "+1 (555) 349-2041",
    website: "https://vantalink.io",
    status: "Qualified",
    score: 88,
    notes: "Evaluating secure identity platform. High interest in enterprise Single Sign-On and multi-tenant access controls. Budget is approved for Q3 deployment of secure identity broker.",
    aiAnalysis: {
      score: 88,
      bantAnalysis: {
        budget: "Budget of $50k+ explicitly earmarked for Identity & Access Management solutions for late Q3 launch.",
        authority: "Core decision-maker. Coordinates with CSO and VP of Ops on the vendor selection panel.",
        need: "High need. Expanding compliance frameworks require instant federated identities for 15,000 employees.",
        timeline: "Active. Pilot evaluation must complete by next month to meet integration deadlines."
      },
      strengths: [
        "Identified decision owner with authority",
        "Assigned budget category",
        "Clear technical and compliance integrations requirement"
      ],
      risks: [
        "Stringent custom security audit required",
        "Rigid rollout deadline"
      ],
      nextSteps: [
        "Send tailored architecture specification whitepaper",
        "Schedule a custom technical integration live demo with lead developer"
      ]
    },
    aiEmail: {
      subject: "Accelerating VantaLink Access Provisioning (Security Demo request)",
      body: "Hi Sarah,\n\nI saw your team is ramping up compliance and federated enterprise scaling. With VantaLink’s expansion of secure identities for your Q3 roadmap, integrating identity brokering is typically a major bottleneck.\n\nWe would love to show you how our system shaves off 4 weeks of custom configuration with pre-audited single sign-on widgets designed for enterprise grade federated networks.\n\nAre you available for a 15-minute runtime walkthrough this Thursday at 2 PM?\n\nBest regards,\n[Your Name]\nSales & Access Architect"
    }
  },
  {
    name: "Marcus Chen",
    company: "Retoolify Corp",
    role: "Director of Business Development",
    email: "marcus.chen@retoolify.co",
    phone: "+1 (555) 710-8841",
    website: "https://retoolify.co",
    status: "Contacted",
    score: 74,
    notes: "Trying to transition cold sales pipelines. Needs automated enrichment and scoring of contact databases. Intrigued by prompt personalization.",
    aiAnalysis: {
      score: 74,
      bantAnalysis: {
        budget: "Flexible. Spending from Marketing Operations discretionary fund is likely, but needs to prove ROI during pilot.",
        authority: "Influencer. Owns vendor scanning, but purchasing department requires final executive approval.",
        need: "Critical. Pipeline conversion rate dropped 12% due to generic and stale outreach batches.",
        timeline: "Hoping to transition within this business quarter."
      },
      strengths: [
        "Urgent operational pain point identified",
        "High affinity for Gemini integrations"
      ],
      risks: [
        "May require lengthy approval channels from Director to CIO",
        "Low initial pilot spending tier"
      ],
      nextSteps: [
        "Provide a ROI business calculator sheet custom prepared",
        "Perform a short AI lead enrichment sandbox sandbox trial"
      ]
    },
    aiEmail: {
      subject: "Data-driven prospecting: Cold pipeline strategy reform",
      body: "Hi Marcus,\n\nI noticed Retoolify is scaling business development efforts. When outbound conversion starts stalling, the root cause is almost always generic messaging sent to broad databases.\n\nOur intelligent pipeline scorer filters out unqualified entries and uses Gemini to analyze and custom craft personalized triggers in seconds.\n\nI have prepared a quick calculation of how much and how fast VantaLink improved operations. Let me know if we can share it on a brief call.\n\nBest,\n[Your Name]"
    }
  },
  {
    name: "Elena Rostova",
    company: "CloudPulse Systems",
    role: "VP of Cloud Architecture",
    email: "elena@cloudpulse.net",
    phone: "+1 (555) 489-0092",
    website: "https://cloudpulse.net",
    status: "New",
    score: 62,
    notes: "Reviewing tools for pipeline scoring. Need to migrate high capacity telemetry lead pipelines.",
    aiAnalysis: {
      score: 62,
      bantAnalysis: {
        budget: "Evaluating options under general server optimization funds.",
        authority: "High authority on architectural recommendation, relies on procurement team for signature.",
        need: "High scale telemetry analytics to filter server performance patterns.",
        timeline: "Evaluating tools in exploration phase."
      },
      strengths: [
        "Extremely high technical competency",
        "Direct architect ownership"
      ],
      risks: [
        "No clear immediate financial commitment timeline yet"
      ],
      nextSteps: [
        "Send performance benchmarks",
        "Propose proof of concept evaluation framework"
      ]
    }
  },
  {
    name: "David Kim",
    company: "FinFlow Analytics",
    role: "Head of Growth Operations",
    email: "david@finflowanalytics.com",
    phone: "+1 (555) 925-1150",
    website: "https://finflowanalytics.com",
    status: "Qualified",
    score: 81,
    notes: "Immediate requirement to analyze and clean up lead database. Ready to pull contract trigger if scalability checks out.",
    aiAnalysis: {
      score: 81,
      bantAnalysis: {
        budget: "Pre-allocated budget is ready for operations tooling integration.",
        authority: "Sole decision maker for growth software stack.",
        need: "Critical need for database lead hygiene and automated intelligence gathering.",
        timeline: "Immediate. Wants setup running in under 2 weeks."
      },
      strengths: [
        "Immediate urgent timeline",
        "Authorized buyer with confirmed budget"
      ],
      risks: [
        "Extremely high initial customization requirement"
      ],
      nextSteps: [
        "Share a secure onboarding template checklist",
        "Draft the proof of concept configuration today"
      ]
    }
  },
  {
    name: "Amelia Vance",
    company: "DevForce Consulting",
    role: "VP of Enterprise Accounts",
    email: "amelia@devforce.consulting",
    phone: "+1 (555) 211-5509",
    status: "ClosedWon",
    score: 95,
    notes: "Signed 12-month contract for full-scale workspace prospecting integration on enterprise tier.",
  }
];

export default function ProspectingDashboard() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Add Lead Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    company: "",
    role: "",
    email: "",
    phone: "",
    website: "",
    status: "New" as "New" | "Contacted" | "Qualified" | "ClosedWon" | "ClosedLost",
    score: 50,
    notes: ""
  });

  // Action Triggers Loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Copy to clipboard indicator
  const [isCopied, setIsCopied] = useState(false);

  // CSV Importer State
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccessCount, setCsvSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication: Monitor user state, and sign in anonymously on first visit to create an isolated sandbox session.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
      } else {
        try {
          setAuthLoading(true);
          const credential = await signInAnonymously(auth);
          setCurrentUser(credential.user);
          setAuthLoading(false);
        } catch (e: any) {
          console.error("Auth Exception:", e);
          setAuthError("Failed to initialize secure anonymous user session: " + e.message);
          setAuthLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync & Seed logic
  useEffect(() => {
    if (!currentUser) return;

    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, where("userId", "==", currentUser.uid));

    setLeadsLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Lead[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Lead);
      });

      // Sort by newest leads
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setLeads(data);
      setLeadsLoading(false);

      // If empty database, pre-seed beautiful mock leads automatically to prevent 404/blank screen feeling!
      if (snapshot.empty && !leadsLoading) {
        seedDummyDatabase();
      }
    }, (error) => {
      console.error("Firestore sync error: ", error);
      setLeadsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, leadsLoading]);

  // Seed DB Function
  const seedDummyDatabase = async () => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      const leadsRef = collection(db, "leads");
      
      const dummies = DEFAULT_DUMMY_LEADS(currentUser.uid);
      for (const item of dummies) {
        const newDocRef = doc(leadsRef);
        batch.set(newDocRef, {
          ...item,
          userId: currentUser.uid,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      await batch.commit();
      console.log("Mock B2B Lead entries seeded perfectly!");
    } catch (err) {
      console.error("Failed to seed B2B database: ", err);
    }
  };

  // Create Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newLeadForm.name || !newLeadForm.company) return;

    try {
      const docRef = await addDoc(collection(db, "leads"), {
        ...newLeadForm,
        userId: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setIsAddOpen(false);
      setNewLeadForm({
        name: "",
        company: "",
        role: "",
        email: "",
        phone: "",
        website: "",
        status: "New",
        score: 50,
        notes: ""
      });
    } catch (err) {
      console.error("Lead creation failed:", err);
    }
  };

  // Trigger server-side Gemini analysis for BANT and Scoring
  const handleRunAiAnalysis = async (lead: Lead) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "analyze",
          name: lead.name,
          company: lead.company,
          role: lead.role,
          website: lead.website,
          notes: lead.notes
        })
      });

      if (!response.ok) {
        const errInfo = await response.json();
        throw new Error(errInfo.error || "Failed server-side analytics response");
      }

      const parsedAnalysis = await response.json();

      // Update lead in Firestore
      const leadDocRef = doc(db, "leads", lead.id);
      const updatedFields = {
        score: parsedAnalysis.score,
        aiAnalysis: parsedAnalysis,
        updatedAt: new Date()
      };
      
      await updateDoc(leadDocRef, updatedFields);
      
      const updatedLead = { ...lead, ...updatedFields };
      setSelectedLead(updatedLead);
      setIsAnalyzing(false);

    } catch (err: any) {
      console.error("Analysis trigger failed:", err);
      alert("AI Service Error: " + err.message);
      setIsAnalyzing(false);
    }
  };

  // Trigger server-side Gemini cold email copywriting generator
  const handleGenerateOutreachEmail = async (lead: Lead) => {
    if (isGeneratingEmail) return;
    setIsGeneratingEmail(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "email",
          name: lead.name,
          company: lead.company,
          role: lead.role,
          notes: lead.notes || `Cold prospecting customized template targeting ${lead.role}`
        })
      });

      if (!response.ok) {
        const errInfo = await response.json();
        throw new Error(errInfo.error || "Email model generation failed");
      }

      const parsedEmail = await response.json();

      // Update lead doc
      const leadDocRef = doc(db, "leads", lead.id);
      const updatedFields = {
        aiEmail: parsedEmail,
        updatedAt: new Date()
      };

      await updateDoc(leadDocRef, updatedFields);

      const updatedLead = { ...lead, ...updatedFields };
      setSelectedLead(updatedLead);
      setIsGeneratingEmail(false);

    } catch (err: any) {
      console.error("Email trigger failed:", err);
      alert("AI Copywriting Error: " + err.message);
      setIsGeneratingEmail(false);
    }
  };

  // CSV Reader & Parser loop mapping standard column headers
  const handleCsvUpload = async () => {
    if (!csvFile || !currentUser) return;
    setIsCsvImporting(true);
    setCsvError(null);
    setCsvSuccessCount(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setCsvError("Unable to extract character content from this CSV.");
        setIsCsvImporting(false);
        return;
      }

      try {
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          setCsvError("No rows found. Verify headers exist.");
          setIsCsvImporting(false);
          return;
        }

        // Header mapping
        const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
        
        let nameIndex = headers.indexOf("name");
        let companyIndex = headers.indexOf("company");
        let roleIndex = headers.indexOf("role");
        let emailIndex = headers.indexOf("email");
        let phoneIndex = headers.indexOf("phone");
        let websiteIndex = headers.indexOf("website") !== -1 ? headers.indexOf("website") : headers.indexOf("site");
        let notesIndex = headers.indexOf("notes") !== -1 ? headers.indexOf("notes") : headers.indexOf("context");

        // Fallbacks if columns lack explicit standard labels
        if (nameIndex === -1) nameIndex = 0;
        if (companyIndex === -1) companyIndex = 1;
        if (roleIndex === -1) roleIndex = 2;
        if (emailIndex === -1) emailIndex = 3;
        
        const leadsCollection = collection(db, "leads");
        const batch = writeBatch(db);
        let successfullyEnqueued = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple split with quote stripping
          const cells = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
          if (cells.length < 2 || !cells[nameIndex]) continue;

          const leadName = cells[nameIndex];
          const leadCompany = cells[companyIndex] || "Independent Vendor";
          const leadRole = cells[roleIndex] || "B2B Prospect";
          const leadEmail = cells[emailIndex] || "";
          const leadPhone = cells[phoneIndex] || "";
          const leadWebsite = cells[websiteIndex] || "";
          const leadNotes = cells[notesIndex] || "Imported via Account CSV";

          const newDocRef = doc(leadsCollection);
          batch.set(newDocRef, {
            name: leadName,
            company: leadCompany,
            role: leadRole,
            email: leadEmail,
            phone: leadPhone,
            website: leadWebsite,
            status: "New",
            score: 50, // default mid score
            notes: leadNotes,
            userId: currentUser.uid,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          successfullyEnqueued++;
        }

        if (successfullyEnqueued > 0) {
          await batch.commit();
          setCsvSuccessCount(successfullyEnqueued);
          setCsvFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          setCsvError("No valid rows containing a Lead Name and Company were parsed.");
        }

      } catch (err: any) {
        console.error("CSV Import failure:", err);
        setCsvError("An unexpected compilation parse error occurred during upload: " + err.message);
      } finally {
        setIsCsvImporting(false);
      }
    };

    reader.readAsText(csvFile);
  };

  // Modify individual status
  const handleUpdateStatus = async (leadId: string, newStatus: any) => {
    try {
      const docRef = doc(db, "leads", leadId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      // update selected lead view
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Remove Lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this prospect from your pipeline? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "leads", leadId));
      setSelectedLead(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Copy Email Copy Utility
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Download Sample CSV Helper template
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Company,Role,Email,Phone,Website,Notes\n" +
      "Regina Halpert,Halpert Logistics,VP Supply Chain,regina@halpertlogistics.com,+15550021,\"https://halpertlogistics.com\",\"Actively evaluating automated intelligence routes for Q4.\"\n" +
      "Jim Halpert,Paper Solutions,Co-CEO,jim@papersol.net,+15551122,\"https://papersol.net\",\"Inquiring about outbound scoring integrations for tech branch.\"";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "prospecting_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Leads
  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      (lead.role && lead.role.toLowerCase().includes(query)) ||
      (lead.email && lead.email.toLowerCase().includes(query));
    
    const matchStatus = statusFilter === "All" || lead.status === statusFilter;
    const matchScore = lead.score >= minScoreFilter;

    return matchSearch && matchStatus && matchScore;
  });

  // Calculate Aggregates
  const totalCount = leads.length;
  const scoredLeads = leads.filter(l => l.score !== undefined);
  const averageBantScore = scoredLeads.length > 0 
    ? Math.round(scoredLeads.reduce((acc, curr) => acc + curr.score, 0) / scoredLeads.length) 
    : 0;
  
  const contactedCount = leads.filter(l => l.status === "Contacted" || l.status === "Qualified" || l.status === "ClosedWon").length;
  const closedWonCount = leads.filter(l => l.status === "ClosedWon").length;
  const conversionRate = totalCount > 0 ? Math.round((closedWonCount / totalCount) * 100) : 0;

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
        <RefreshCw className="w-12 h-12 text-teal-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading interactive secure workspace instance...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-semibold text-white">Authentication Fault</h2>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">{authError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold tracking-wide transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans selection:bg-teal-500/25 selection:text-teal-200">
      
      {/* Top Professional Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-indigo-600 rounded-xl shadow-lg ring-1 ring-white/10">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Prospecting Intelligence <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/20 font-mono font-medium">Gemini Pro-2.5</span>
            </h1>
            <p className="text-xs text-slate-400">Real-time B2B Outbound CRM pipeline & intelligence engine</p>
          </div>
        </div>

        {/* Sync Controls / Account info */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[10px] text-slate-500 font-mono">WORKSPACE SANDBOX SESSION</span>
            <span className="text-xs text-slate-300 font-medium font-mono">{currentUser?.uid.slice(0, 12)}... (Anonymous User)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={seedDummyDatabase}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              title="Prepopulate Workspace with clean Realistic Leads"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Seed Data
            </button>

            <button
              onClick={async () => {
                await auth.signOut();
                window.location.reload();
              }}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              title="Reset session completely"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main CRM Workspace Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 space-y-6">

        {/* Statistical KPI Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Pipeline Leads</span>
              <span className="text-2xl font-bold font-mono text-white">{totalCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                Average BANT Score
                <Info className="w-3 h-3 text-slate-500" title="Probability of commitment based on AI Budget/Authority/Need/Timeline analysis" />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">{averageBantScore}%</span>
                <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-mono">High Quality</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Contacted & Active</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">{contactedCount}</span>
                <span className="text-xs text-slate-500 font-mono">leads active</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Pipeline Conversion Rate</span>
              <span className="text-2xl font-bold font-mono text-white">{conversionRate}%</span>
            </div>
          </div>

        </section>

        {/* Dashboard Grid split: Left Control Hub & CRM Board / Right Active Lead details Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Main CRM List/Board & CSV Module - 8 column span */}
          <div className="xl:col-span-8 space-y-6">

            {/* CSV Import & Quick CSV Template Download Row */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/80 to-indigo-950/20 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    B2B Lead CSV File Importer
                  </h3>
                  <p className="text-xs text-slate-400">Pre-populate your outbound pipe instantly with raw spreadsheet file uploads</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 tracking-wide text-left md:text-right"
                >
                  Download Sample CSV Template
                </button>
              </div>

              {/* CSV Upload interactive drop zone */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                
                <div className="md:col-span-8 flex items-center gap-3">
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCsvFile(e.target.files[0]);
                          setCsvError(null);
                          setCsvSuccessCount(null);
                        }
                      }}
                      ref={fileInputRef}
                      className="hidden" 
                      id="csv-file-picker"
                    />
                    <label 
                      htmlFor="csv-file-picker"
                      className="flex items-center gap-3 px-4 py-3 bg-slate-950 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition text-xs font-mono text-slate-300"
                    >
                      <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[240px]">
                        {csvFile ? csvFile.name : "Select or drag prospecting template..."}
                      </span>
                    </label>
                  </div>

                  {csvFile && (
                    <button
                      onClick={handleCsvUpload}
                      disabled={isCsvImporting}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-bold font-mono tracking-wider transition shrink-0"
                    >
                      {isCsvImporting ? "IMPORTING..." : "COMMIT UPLOAD"}
                    </button>
                  )}
                </div>

                <div className="md:col-span-4 text-xs font-mono">
                  {isCsvImporting && <span className="text-slate-400 animate-pulse">Processing CSV headers/rows...</span>}
                  {csvError && <span className="text-rose-400 flex items-center gap-1 leading-tight"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {csvError}</span>}
                  {csvSuccessCount !== null && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4 shrink-0" /> Seeded {csvSuccessCount} leads successfully!
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Live Search and Filters */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="relative w-full md:max-w-xs">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, company, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-slate-750 pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition font-sans"
                />
              </div>

              {/* Extended Selectable Sorters */}
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-mono">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="ClosedWon">Closed (Won)</option>
                    <option value="ClosedLost">Closed (Lost)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-mono">Score &ge; {minScoreFilter}%</span>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="10"
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                    className="accent-teal-400 w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="border-l border-slate-800 h-6 pl-2 flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setViewMode("board")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition ${
                      viewMode === "board" ? "bg-slate-800 text-teal-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Kanban
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition ${
                      viewMode === "list" ? "bg-slate-800 text-teal-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Table
                  </button>
                </div>

                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ml-auto md:ml-0 shadow-lg shadow-teal-500/10 shrink-0"
                >
                  <Plus className="w-4 h-4 text-slate-950 shrink-0" />
                  New Lead
                </button>
              </div>

            </div>

            {/* Main view renderer: Board or Kanban layout */}
            <AnimatePresence mode="wait">
              {viewMode === "board" ? (
                <motion.div 
                  key="board"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                  
                  {/* Status columns: New, Contacted, Qualified, ClosedWon, ClosedLost */}
                  {(["New", "Contacted", "Qualified", "ClosedWon", "ClosedLost"] as const).map((colStatus) => {
                    const colLeads = filteredLeads.filter(l => l.status === colStatus);
                    return (
                      <div key={colStatus} className="flex flex-col bg-slate-900/35 border border-slate-900 rounded-2xl p-3 min-h-[500px]">
                        
                        {/* Column Header banner */}
                        <div className="flex items-center justify-between mb-3.5 px-1.5">
                          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                            colStatus === "New" ? "text-blue-400" :
                            colStatus === "Contacted" ? "text-amber-400" :
                            colStatus === "Qualified" ? "text-cyan-400" :
                            colStatus === "ClosedWon" ? "text-emerald-400" : "text-slate-500"
                          }`}>
                            {colStatus === "ClosedWon" ? "Closed Won" :
                             colStatus === "ClosedLost" ? "Closed Lost" : colStatus}
                          </span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-800">
                            {colLeads.length}
                          </span>
                        </div>

                        {/* Leads Cards wrapper */}
                        <div className="space-y-3 flex-1 overflow-y-auto">
                          {colLeads.length === 0 ? (
                            <div className="h-24 border border-dashed border-slate-900/60 rounded-xl flex items-center justify-center p-3 text-center">
                              <span className="text-[10px] text-slate-600 font-mono">No prospects</span>
                            </div>
                          ) : (
                            colLeads.map((lead) => {
                              const isSelected = selectedLead?.id === lead.id;
                              return (
                                <motion.div
                                  layoutId={`card-${lead.id}`}
                                  key={lead.id}
                                  onClick={() => setSelectedLead(lead)}
                                  className={`p-4 border rounded-xl shadow-md space-y-3 cursor-pointer text-left transition group ${
                                    isSelected 
                                      ? "bg-slate-800/80 border-teal-500/50 shadow-teal-500/5" 
                                      : "bg-slate-900/80 hover:bg-slate-900 border-slate-850 hover:border-slate-800"
                                  }`}
                                >
                                  <div>
                                    <h4 className="text-xs font-bold text-white tracking-wide group-hover:text-teal-400 transition">{lead.name}</h4>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{lead.company}</p>
                                    {lead.role && <p className="text-[10px] text-slate-500 truncate">{lead.role}</p>}
                                  </div>

                                  {/* Score threshold label */}
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-900/40">
                                    <span className="text-[10px] text-slate-500 font-mono">BANT SCORE</span>
                                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      lead.score >= 80 ? "bg-emerald-500/10 text-emerald-400" :
                                      lead.score >= 60 ? "bg-cyan-500/10 text-cyan-400" :
                                      "bg-slate-800 text-slate-400"
                                    }`}>
                                      {lead.score || 50}%
                                    </span>
                                  </div>

                                  {/* Indicator micro dots for AI attributes */}
                                  <div className="flex items-center space-x-1.5 pt-1">
                                    {lead.aiAnalysis && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" title="Has AI-scoring Intelligence" />
                                    )}
                                    {lead.aiEmail && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Has AI Cold Outreach draft" />
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    );
                  })}

                </motion.div>
              ) : (
                /* List table view */
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/60 border border-slate-850 rounded-2xl overflow-hidden"
                >
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Prospect particulars</th>
                        <th className="px-5 py-3">Work company</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">BANT score</th>
                        <th className="px-5 py-3">AI Intel</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-xs text-slate-500 font-mono">
                            No prospecting pipeline matches found.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => {
                          const isSelected = selectedLead?.id === lead.id;
                          return (
                            <tr
                              key={lead.id}
                              onClick={() => setSelectedLead(lead)}
                              className={`cursor-pointer transition group ${
                                isSelected ? "bg-slate-800/40" : "hover:bg-slate-900/60"
                              }`}
                            >
                              <td className="px-5 py-4">
                                <span className="text-xs font-bold text-white block group-hover:text-teal-400 transition">{lead.name}</span>
                                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{lead.email}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs text-slate-300 block font-medium">{lead.company}</span>
                                <span className="text-[10px] text-slate-500 block">{lead.role || "Prospect"}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                  lead.status === 'New' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  lead.status === 'Contacted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  lead.status === 'Qualified' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                  lead.status === 'ClosedWon' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={`text-xs font-mono font-bold ${
                                  lead.score >= 80 ? "text-emerald-400" :
                                  lead.score >= 60 ? "text-cyan-400" :
                                  "text-slate-400"
                                }`}>
                                  {lead.score || 50}%
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center space-x-2">
                                  {lead.aiAnalysis && <Sparkles className="w-3.5 h-3.5 text-teal-400" title="Equipped with BANT audit" />}
                                  {lead.aiEmail && <Mail className="w-3.5 h-3.5 text-indigo-400" title="Equipped with outreach copydraft" />}
                                  {!lead.aiAnalysis && !lead.aiEmail && <span className="text-[10px] text-slate-600 font-mono">&mdash;</span>}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition inline" />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Active Lead Details Side Shelf / Custom Panel - 4 column span */}
          <div className="xl:col-span-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 min-h-[640px] shadow-2xl relative">
            
            <AnimatePresence mode="wait">
              {selectedLead ? (
                <motion.div
                  key={selectedLead.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-6"
                >
                  
                  {/* Prospect Header Summary */}
                  <div className="flex items-start justify-between border-b border-slate-800 pb-5">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white tracking-tight">{selectedLead.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {selectedLead.company} &bull; {selectedLead.role || "Prospect"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800/40 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Operational Controls Block (Quick status edits + raw scoring) */}
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-mono block">PIPELINE STATUS</span>
                        <select
                          value={selectedLead.status}
                          onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-200 cursor-pointer focus:outline-none focus:border-teal-500/40"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Qualified">Qualified</option>
                          <option value="ClosedWon">Closed (Won)</option>
                          <option value="ClosedLost">Closed (Lost)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-mono block">BANT PROBABILITY</span>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={selectedLead.score}
                            onChange={async (e) => {
                              const v = parseInt(e.target.value) || 0;
                              await updateDoc(doc(db, "leads", selectedLead.id), { score: v });
                              setSelectedLead({ ...selectedLead, score: v });
                            }}
                            className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg text-xs font-bold font-mono text-center w-16 text-teal-400 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">% Fit</span>
                        </div>
                      </div>

                    </div>

                    <div className="space-y-1 border-t border-slate-900/60 pt-3">
                      <span className="text-[10px] text-slate-500 font-mono block">NOTES & CONTEXT</span>
                      <p className="text-xs text-slate-300 bg-slate-900/40 p-2 rounded border border-slate-900/40 max-h-24 overflow-y-auto leading-relaxed">
                        {selectedLead.notes || "No context specified. Click 'Run AI BANT analysis' to auto score."}
                      </p>
                    </div>

                  </div>

                  {/* AI Intel Operations Trigger */}
                  <div className="space-y-3.5">
                    
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white font-sans flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        Gemini B2B Intelligence Hub
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">REAL-TIME MODELS</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      
                      <button
                        onClick={() => handleRunAiAnalysis(selectedLead)}
                        disabled={isAnalyzing}
                        className="p-3 bg-gradient-to-tr from-teal-500/10 to-emerald-500/5 hover:from-teal-500/20 text-teal-300 hover:text-white border border-teal-500/25 rounded-xl text-xs font-bold tracking-wide transition flex flex-col items-center justify-center gap-1.5"
                      >
                        <RefreshCw className={`w-4 h-4 text-teal-400 ${isAnalyzing ? "animate-spin" : ""}`} />
                        <span>{isAnalyzing ? "Analyzing..." : "Run BANT Audit"}</span>
                      </button>

                      <button
                        onClick={() => handleGenerateOutreachEmail(selectedLead)}
                        disabled={isGeneratingEmail}
                        className="p-3 bg-gradient-to-tr from-indigo-500/10 to-violet-500/5 hover:from-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/25 rounded-xl text-xs font-bold tracking-wide transition flex flex-col items-center justify-center gap-1.5"
                      >
                        <Mail className={`w-4 h-4 text-indigo-400 ${isGeneratingEmail ? "animate-pulse" : ""}`} />
                        <span>{isGeneratingEmail ? "Drafting..." : "Outreach Draft"}</span>
                      </button>

                    </div>

                  </div>

                  {/* BANT Analysis Results Dashboard */}
                  {selectedLead.aiAnalysis ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="border-t border-slate-800 pt-5">
                        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">BANT AUDIT INSIGHTS</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-875">
                            <span className="text-[10px] text-slate-500 font-bold block font-mono">BUDGET</span>
                            <p className="text-[10px] text-slate-300 leading-normal mt-0.5">{selectedLead.aiAnalysis.bantAnalysis.budget}</p>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-875">
                            <span className="text-[10px] text-slate-500 font-bold block font-mono">AUTHORITY</span>
                            <p className="text-[10px] text-slate-300 leading-normal mt-0.5">{selectedLead.aiAnalysis.bantAnalysis.authority}</p>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-875">
                            <span className="text-[10px] text-slate-500 font-bold block font-mono">NEED</span>
                            <p className="text-[10px] text-slate-300 leading-normal mt-0.5">{selectedLead.aiAnalysis.bantAnalysis.need}</p>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-875">
                            <span className="text-[10px] text-slate-500 font-bold block font-mono">TIMELINE</span>
                            <p className="text-[10px] text-slate-300 leading-normal mt-0.5">{selectedLead.aiAnalysis.bantAnalysis.timeline}</p>
                          </div>

                        </div>
                      </div>

                      {/* Strengths & Actionable items */}
                      <div className="space-y-3">
                        
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-400 font-bold font-mono block">STRENGTHS</span>
                          <ul className="space-y-1">
                            {selectedLead.aiAnalysis.strengths?.map((str, idx) => (
                              <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1 leading-normal">
                                <span className="text-emerald-500 block">•</span> {str}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-indigo-400 font-bold font-mono block">NEXT PRESCRIBED ACTION</span>
                          <ul className="space-y-1">
                            {selectedLead.aiAnalysis.nextSteps?.map((step, idx) => (
                              <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1 leading-normal">
                                <span className="text-indigo-400 block font-bold font-mono">{idx + 1}.</span> {step}
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>

                    </motion.div>
                  ) : null}

                  {/* Cold Outreach Email Copy Block */}
                  {selectedLead.aiEmail ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t border-slate-800 pt-5 space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-indigo-400 font-bold font-mono tracking-widest uppercase">COULD OUTREACH EMAIL</span>
                        
                        <button
                          onClick={() => handleCopyToClipboard(`${selectedLead.aiEmail?.subject}\n\n${selectedLead.aiEmail?.body}`)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold font-mono flex items-center gap-1 rounded-lg transition"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {isCopied ? "COPIED" : "COPY EMAIL"}
                        </button>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-indigo-950/40 text-left font-serif text-slate-300 text-xs leading-relaxed space-y-3">
                        <p className="font-sans text-[10px] text-slate-500 font-mono pb-2 border-b border-slate-900">
                          <strong>Subject:</strong> {selectedLead.aiEmail.subject}
                        </p>
                        <p className="whitespace-pre-line text-xs">
                          {selectedLead.aiEmail.body}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}

                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="p-4 bg-slate-950 rounded-full border border-slate-850">
                    <Briefcase className="w-8 h-8 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">No Lead Selected</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                      Select a B2B prospect from your board pipeline or import lists. Run instant AI-BANT analysis and draft customized cold emails.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center px-6">
        <p className="text-[10px] text-slate-600 font-mono">
          PROSPECTING INTELLIGENCE SECURED ACCESS CONTROL &bull; CRAFTED IN CLOUD RUN CONTEXT &bull; SATELLITE CRM
        </p>
      </footer>

      {/* New Lead Form Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              
              <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wide">Add Prospect Lead</h3>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-white font-medium text-xs font-mono"
                >
                  ESC
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="p-6 space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block">FULL NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block">COMPANY *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Microsoft"
                      value={newLeadForm.company}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block">JOB TITLE / ROLE</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Developer"
                      value={newLeadForm.role}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block">WEBSITE</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newLeadForm.website}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, website: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      placeholder="johndoe@email.com"
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block">PHONE NUMBER</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono block">INITIAL PIPELINE STATUS</label>
                  <select
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500/40 cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono block">BUSINESS context / PROSPECT NOTES</label>
                  <textarea
                    rows={3}
                    placeholder="Describe their budget readiness, needs or conversation hooks..."
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40 leading-relaxed resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold font-mono tracking-wider transition shadow-lg shadow-teal-500/10"
                >
                  ADD PROSPECT TO PIPE
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
