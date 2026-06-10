'use client'

import { useState, useCallback, useRef } from 'react'
import { analyzeImage, PredictionResult } from '@/lib/api'
import {
  Upload, X, AlertTriangle, CheckCircle, Brain,
  FileImage, Activity, ChevronDown, ChevronUp,
  Eye, ClipboardList, Loader2, Bone, Stethoscope, ScanLine
} from 'lucide-react'

type AppState = 'idle' | 'loading' | 'result' | 'error'
type MainTab = 'dashboard' | 'analyse'
type Lang = 'FR' | 'EN'

const dict = {
  FR: {
    dashboard: "Tableau de bord",
    analyseTab: "Analyse IA",
    systemActive: "Système actif",
    title: "RadiSense",
    tagline: "Aide à la décision clinique par IA pour la radiologie",
    taglineDesc: "Système intelligent d'analyse clinique pour accompagner les radiologues et accélérer le traitement des urgences osseuses.",
    capabilitiesTitle: "Fonctionnalités Cliniques",
    features: [
      {
        title: "DÉTECTION RESNET50",
        desc: "Classification haute précision entraînée sur clichés validés pour l'identification rapide des pathologies."
      },
      {
        title: "EXPLICABILITÉ GRAD-CAM",
        desc: "Cartes de chaleur visuelles mettant en évidence les régions précises ayant influencé le diagnostic de l'IA."
      },
      {
        title: "RAPPORTS STRUCTURÉS",
        desc: "Génération automatique de documentation clinique suivant des modèles radiologiques standardisés."
      }
    ],
    startAnalysis: "Lancer l'analyse →",
    howItWorks: "Processus d'Analyse Clinique",
    steps: [
      {
        title: "1. Téléversement du cliché",
        desc: "Le clinicien charge la radiographie au format JPEG ou PNG sur l'interface."
      },
      {
        title: "2. Inférence IA & Grad-CAM",
        desc: "Le modèle ResNet50 localise l'anomalie et projette une carte d'attention Grad-CAM."
      },
      {
        title: "3. Rapport d'Aide à la Décision",
        desc: "L'agent Gemini Flash synthétise les résultats en un rapport structuré pour le médecin."
      }
    ],

    analyseTitle: "RadiSense — Agent Clinique IA",
    analyseSubtitle: "Aider les médecins à analyser les radiographies osseuses plus rapidement et avec une plus grande précision.",
    medicalAssistant: "ASSISTANT MÉDICAL INTELLIGENT",
    warningTitle: "Avertissement clinique.",
    warningDesc: "Outil d'aide à la décision — La responsabilité du diagnostic final incombe exclusivement au médecin signataire.",
    footerDisclaimer: "Destiné exclusivement à l'assistance clinique — ne constitue pas un dispositif médical certifié",
    power: "Propulsé par ResNet50 · Grad-CAM · Gemini Flash · Arize Phoenix",
    uploadTitle: "Charger une radiographie",
    dragDropText: "Glissez une image ou cliquez pour parcourir",
    sizeLimit: "Formats : JPEG, PNG — Max 10 MB",
    loadingText: "Analyse en cours…",
    startAnalyzeBtn: "Lancer l'analyse IA",
    fractureDetected: "Fracture osseuse détectée",
    noFractureDetected: "Aucune fracture détectée",
    confidenceScore: "Score de confiance",
    gradcamOverlay: "🔥 Grad-CAM superposé",
    heatmapOnly: "🌡 Heatmap seule",
    heatmapDesc: "Carte thermique brute · Gradient de la classe prédite",
    gradcamDesc: "Zones d'attention superposées · Rouge = région décisive",
    structuredReportTitle: "Rapport médical structuré",
    newAnalysisBtn: "↩ Nouvelle analyse",
    differentialTitle: "Diagnostic différentiel",
    imagingTitle: "Imagerie de suivi suggérée",
    clinicalSupport: "RadiSense — Aide à la Décision Clinique par IA"
  },
  EN: {
    dashboard: "Dashboard",
    analyseTab: "AI Analysis",
    systemActive: "System Active",
    title: "RadiSense",
    tagline: "Clinical AI Decision Support for Radiology",
    taglineDesc: "Intelligent clinical analysis system to support radiologists and accelerate the triage of osseous emergencies.",
    capabilitiesTitle: "Clinical Capabilities",
    features: [
      {
        title: "RESNET50 DETECTION",
        desc: "High-precision deep learning model trained on validated clinical scans for pathology identification."
      },
      {
        title: "GRAD-CAM EXPLAINABILITY",
        desc: "Visual heatmaps highlighting the exact regions that influenced the AI's diagnostic confidence score."
      },
      {
        title: "STRUCTURED REPORTS",
        desc: "Automatic generation of clinical documentation following standardized radiological reporting templates."
      }
    ],
    startAnalysis: "Start Analysis →",
    howItWorks: "Clinical Analysis Workflow",
    steps: [
      {
        title: "1. Upload X-Ray",
        desc: "The clinician uploads the X-Ray scan (JPEG/PNG) to the secure interface."
      },
      {
        title: "2. AI Analysis & Grad-CAM",
        desc: "The ResNet50 model localizes the anomaly and projects a Grad-CAM attention heatmap."
      },
      {
        title: "3. Decision Support Report",
        desc: "The Gemini Flash agent synthesizes findings into a structured report for the physician."
      }
    ],
    analyseTitle: "RadiSense — AI Clinical Agent",
    analyseSubtitle: "Helping physicians analyze bone radiographs faster and with greater precision.",
    medicalAssistant: "INTELLIGENT MEDICAL ASSISTANT",
    warningTitle: "Clinical Disclaimer.",
    warningDesc: "Decision support tool — final diagnostic responsibility rests solely with the attending physician.",
    footerDisclaimer: "For clinical assistance only — not a certified medical device",
    power: "Powered by ResNet50 · Grad-CAM · Gemini Flash · Arize Phoenix",
    uploadTitle: "Upload X-Ray scan",
    dragDropText: "Drag image here or click to browse",
    sizeLimit: "Formats: JPEG, PNG — Max 10 MB",
    loadingText: "Analyzing scan…",
    startAnalyzeBtn: "Run AI Analysis",
    fractureDetected: "Bone fracture detected",
    noFractureDetected: "No fracture detected",
    confidenceScore: "Confidence score",
    gradcamOverlay: "🔥 Grad-CAM Overlay",
    heatmapOnly: "🌡 Heatmap Only",
    heatmapDesc: "Raw heat map · Gradient of the predicted class",
    gradcamDesc: "Overlay attention regions · Red = decisive region",
    structuredReportTitle: "Structured clinical report",
    newAnalysisBtn: "↩ New analysis",
    differentialTitle: "Differential Diagnosis",
    imagingTitle: "Suggested Follow-up Imaging",
    clinicalSupport: "RadiSense — AI Clinical Decision Support"
  }
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('FR')
  const [mainTab, setMainTab] = useState<MainTab>('dashboard')
  const [state, setState] = useState<AppState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [activeTab, setActiveTab] = useState<'gradcam' | 'heatmap'>('gradcam')
  const [reportExpanded, setReportExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg(lang === 'FR' ? 'Image requis (JPEG, PNG)' : 'Image required (JPEG, PNG)')
      setState('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(lang === 'FR' ? 'Max 10 MB' : 'Max 10 MB')
      setState('error')
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setState('idle')
    setResult(null)
    setErrorMsg('')
  }, [lang])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const resetAll = () => {
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    setErrorMsg('')
    setState('idle')
    setReportExpanded(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setState('loading')
    setResult(null)
    setErrorMsg('')
    try {
      const data = await analyzeImage(selectedFile, lang)
      setResult(data)
      setState('result')
      setReportExpanded(true) // Expand report on complete
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'FR' ? 'Erreur analyse' : 'Analysis error'))
      setState('error')
    }
  }

  const isFractured = result?.is_fractured

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 10px rgba(15, 23, 42, 0.03)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bone className="w-5 h-5" color="white" />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div className="font-display" style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.1rem' }}>{dict[lang].title}</div>
              <div style={{ color: '#6366f1', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em', marginTop: 1 }}>CLINICAL AGENT</div>
            </div>
          </div>

          {/* Center: Tabs with underline style (Medicai inspired) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, height: '100%' }}>
            <button
              onClick={() => setMainTab('dashboard')}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.87rem',
                fontWeight: mainTab === 'dashboard' ? 700 : 500,
                color: mainTab === 'dashboard' ? '#4f46e5' : '#64748b',
                padding: '21px 0',
                borderBottom: mainTab === 'dashboard' ? '2px solid #4f46e5' : '2px solid transparent',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              {dict[lang].dashboard}
            </button>
            <button
              onClick={() => setMainTab('analyse')}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.87rem',
                fontWeight: mainTab === 'analyse' ? 700 : 500,
                color: mainTab === 'analyse' ? '#4f46e5' : '#64748b',
                padding: '21px 0',
                borderBottom: mainTab === 'analyse' ? '2px solid #4f46e5' : '2px solid transparent',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              {dict[lang].analyseTab}
            </button>
          </div>

          {/* Right: Language toggle + Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Language toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#f1f5f9', padding: 2, borderRadius: 100, border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setLang('FR')}
                style={{
                  border: 'none',
                  background: lang === 'FR' ? 'white' : 'transparent',
                  color: lang === 'FR' ? '#4f46e5' : '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 100,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: lang === 'FR' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                FR
              </button>
              <button
                onClick={() => setLang('EN')}
                style={{
                  border: 'none',
                  background: lang === 'EN' ? 'white' : 'transparent',
                  color: lang === 'EN' ? '#4f46e5' : '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 100,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: lang === 'EN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                EN
              </button>
            </div>

            {/* Status active */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 100, padding: '6px 14px' }}>
              <div className="pulse-dot" />
              <span style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 600 }}>{dict[lang].systemActive}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {mainTab === 'dashboard' ? (
          /* ── TAB 1: DASHBOARD (Vertical scroll layout) ───────── */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* SECTION 1: HERO — full-width with 3D as absolute background */}
            <section style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)', padding: '80px 24px 88px', borderBottom: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>

              {/* 3D Animation — absolute background, subtle */}
              <div className="bone3d-scanner-bg">
                <div className="hologram-grid" />
                <div className="hologram-glow" />
                <div className="scanner-radar">
                  <div className="hologram-scan-sweep" />
                  <div className="hologram-container">
                    <div className="hologram-core">

                      <div className="bone-joint shaft-center" />
                      <div className="bone-joint shaft-mid" />
                      <div className="bone-joint joint-head-top" />
                      <div className="bone-joint joint-neck-top" />
                      <div className="bone-joint joint-head-bottom" />
                      <div className="bone-joint joint-neck-bottom" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Foreground content — sits on top */}
              <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 28 }} className="fade-up">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #c7d2fe', borderRadius: 100, padding: '6px 18px', boxShadow: '0 2px 8px rgba(99,102,241,0.1)' }}>
                  <Stethoscope className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                  <span style={{ color: '#4f46e5', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em' }}>{dict[lang].medicalAssistant}</span>
                </div>

                <h1 className="font-display" style={{ fontSize: '3rem', color: '#0f172a', margin: 0, lineHeight: 1.12, maxWidth: 720 }}>
                  {dict[lang].tagline}
                </h1>

                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.7, margin: 0, maxWidth: 580 }}>
                  {dict[lang].taglineDesc}
                </p>

                <button className="btn-primary" onClick={() => setMainTab('analyse')} style={{ width: 'fit-content', padding: '14px 44px', marginTop: 4 }}>
                  {dict[lang].startAnalysis}
                </button>
              </div>
            </section>

            {/* SECTION 2: CLINICAL CAPABILITIES (Cards) */}
            <section style={{ padding: '64px 24px', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
              <h2 className="font-display" style={{ fontSize: '1.9rem', color: '#0f172a', textAlign: 'center', marginBottom: 36 }}>
                {dict[lang].capabilitiesTitle}
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                {dict[lang].features.map((feat, i) => (
                  <div key={i} className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '4px solid #6366f1' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.05em' }}>
                      {feat.title}
                    </span>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                      {feat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>



            {/* SECTION 4: HOW IT WORKS (Separate elements layout) */}
            <section style={{ padding: '64px 24px', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
              <h2 className="font-display" style={{ fontSize: '1.9rem', color: '#0f172a', textAlign: 'center', marginBottom: 44 }}>
                {dict[lang].howItWorks}
              </h2>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, position: 'relative' }}>
                {/* Horizontal flow steps */}
                {dict[lang].steps.map((step, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                    {/* Circle badge */}
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, border: '2px solid #c7d2fe', marginBottom: 16, boxShadow: '0 4px 10px rgba(99,102,241,0.08)' }}>
                      0{i + 1}
                    </div>
                    <h4 style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px' }}>
                      {step.title}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: 0, maxWidth: 260 }}>
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

          </div>
        ) : (
          /* ── TAB 2: ANALYSE IA ───── */
          <div style={{ width: '100%' }}>
            {/* MAIN INTERACTION */}
            <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 60px', position: 'relative', zIndex: 2 }}>

              <div style={{ display: 'grid', gridTemplateColumns: state === 'result' ? '1.1fr 0.9fr' : '1fr', gap: 24, maxWidth: state === 'result' ? '100%' : 600, margin: '0 auto' }}>

                {/* COL LEFT: Upload & confidence bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Upload Card */}
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '13px 20px', background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', borderBottom: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ScanLine className="w-4 h-4" style={{ color: '#6366f1' }} />
                      <span style={{ fontWeight: 600, color: '#3730a3', fontSize: '0.87rem' }}>{dict[lang].uploadTitle}</span>
                    </div>
                    
                    <div style={{ padding: 20 }}>
                      {!preview ? (
                        <div className={`drop-zone${dragOver ? ' over' : ''}`}
                          style={{ padding: '44px 20px', textAlign: 'center', cursor: 'pointer' }}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '2px solid #c7d2fe' }}>
                            <Upload className="w-6 h-6" style={{ color: '#6366f1' }} />
                          </div>
                          <p style={{ color: '#3730a3', fontWeight: 600, marginBottom: 6, fontSize: '0.93rem' }}>{dict[lang].dragDropText}</p>
                          <p style={{ color: '#94a3b8', fontSize: '0.77rem' }}>{dict[lang].sizeLimit}</p>
                          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0f172a' }}>
                            <img src={preview} alt="Radio" style={{ width: '100%', borderRadius: 12, objectFit: 'contain', maxHeight: 300, display: 'block' }} />
                            {state === 'loading' && <div className="scan-overlay" />}
                          </div>
                          {state !== 'loading' && (
                            <button onClick={resetAll} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
                              <X className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
                            </button>
                          )}
                          <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: 8 }}>
                            <span style={{ fontWeight: 500 }}>{selectedFile?.name}</span>
                            <span>·</span>
                            <span>{((selectedFile?.size || 0) / 1024).toFixed(0)} KB</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Warning — after upload card */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: '#d97706', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#92400e' }}>
                      <strong>{dict[lang].warningTitle}</strong> {dict[lang].warningDesc}
                    </span>
                  </div>
                  {selectedFile && state !== 'result' && (
                    <button className="btn-primary fade-up" onClick={handleAnalyze} disabled={state === 'loading'}>
                      {state === 'loading'
                        ? <><Loader2 className="w-4 h-4 spin" /> {dict[lang].loadingText}</>
                        : <><Activity className="w-4 h-4" /> {dict[lang].startAnalyzeBtn}</>
                      }
                    </button>
                  )}

                  {/* Error display */}
                  {state === 'error' && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10 }} className="fade-up">
                      <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ color: '#dc2626', margin: 0, fontSize: '0.85rem' }}>{errorMsg}</p>
                    </div>
                  )}

                  {/* Results box with probabilities */}
                  {state === 'result' && result && (
                    <div className={`fade-up ${isFractured ? 'fracture-box' : 'normal-box'}`} style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: isFractured ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isFractured ? <AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} /> : <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, color: isFractured ? '#dc2626' : '#16a34a', margin: 0, fontSize: '0.98rem' }}>
                            {isFractured ? dict[lang].fractureDetected : dict[lang].noFractureDetected}
                          </p>
                          <p style={{ color: '#64748b', margin: 0, fontSize: '0.76rem', marginTop: 2 }}>{dict[lang].confidenceScore}</p>
                        </div>
                        <div style={{ background: isFractured ? '#dc2626' : '#16a34a', color: 'white', fontWeight: 800, fontSize: '1.15rem', padding: '6px 16px', borderRadius: 100, boxShadow: `0 4px 14px ${isFractured ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)'}` }}>
                          {result.confidence}%
                        </div>
                      </div>
                      
                      {Object.entries(result.probabilities).map(([cls, prob]) => (
                        <div key={cls} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.8rem' }}>
                            <span style={{ color: '#475569', fontWeight: 500, textTransform: 'capitalize' }}>
                              {cls === 'fractured' ? (lang === 'FR' ? 'Fracture' : 'Fractured') : (lang === 'FR' ? 'Normal' : 'Not fractured')}
                            </span>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{prob}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${prob}%`, background: cls === 'fractured' ? 'linear-gradient(90deg,#f87171,#dc2626)' : 'linear-gradient(90deg,#4ade80,#16a34a)' }} />
                          </div>
                        </div>
                      ))}
                      
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.73rem', color: '#94a3b8' }}>
                        <span>📐 {result.image_info.dimensions}</span>
                        <span>📁 {result.image_info.size_kb} KB</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* COL RIGHT: Grad-CAM overlay & clinical report */}
                {state === 'result' && result && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-up">
                    
                    {/* Grad-CAM visuals */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                        {(['gradcam', 'heatmap'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{ flex: 1, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.79rem', fontWeight: 500, borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === tab ? '#6366f1' : '#94a3b8', transition: 'all 0.2s' }}
                          >
                            {tab === 'gradcam' ? dict[lang].gradcamOverlay : dict[lang].heatmapOnly}
                          </button>
                        ))}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ borderRadius: 10, overflow: 'hidden', background: '#0f172a' }}>
                          <img src={activeTab === 'gradcam' ? result.gradcam_image : result.heatmap_image} alt="Grad-CAM" style={{ width: '100%', objectFit: 'contain', maxHeight: 270, display: 'block' }} />
                        </div>
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.71rem', marginTop: 8 }}>
                          {activeTab === 'gradcam' ? dict[lang].gradcamDesc : dict[lang].heatmapDesc}
                        </p>
                      </div>
                    </div>

                    {/* Clinical Report Drawer */}
                    {result.report && (
                      <div className="card" style={{ overflow: 'hidden' }}>
                        <button onClick={() => setReportExpanded(!reportExpanded)} style={{ width: '100%', padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: reportExpanded ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClipboardList className="w-4 h-4" style={{ color: '#6366f1' }} />
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.87rem' }}>{dict[lang].structuredReportTitle}</span>
                            {result.report.niveau_urgence && (
                              <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 10px', borderRadius: 100, background: result.report.niveau_urgence === 'Élevé' ? '#fee2e2' : result.report.niveau_urgence === 'Modéré' ? '#fef3c7' : '#dcfce7', color: result.report.niveau_urgence === 'Élevé' ? '#dc2626' : result.report.niveau_urgence === 'Modéré' ? '#d97706' : '#16a34a' }}>
                                {result.report.niveau_urgence}
                              </span>
                            )}
                          </div>
                          {reportExpanded ? <ChevronUp className="w-4 h-4" style={{ color: '#94a3b8' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#94a3b8' }} />}
                        </button>

                        {reportExpanded && (
                          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Statut */}
                            <div>
                              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Statut</label>
                              <p style={{ fontWeight: 700, color: isFractured ? '#dc2626' : '#16a34a', margin: '4px 0 0', fontSize: '0.93rem' }}>{result.report.statut}</p>
                            </div>
                            
                            {/* Résumé clinique */}
                            {result.report.resume_clinique && (
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Résumé clinique</label>
                                <p style={{ color: '#334155', margin: '4px 0 0', fontSize: '0.82rem', lineHeight: 1.65 }}>{result.report.resume_clinique}</p>
                              </div>
                            )}

                            {/* Diagnostic Différentiel */}
                            {result.report.differential_diagnosis && result.report.differential_diagnosis.length > 0 && (
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                  {dict[lang].differentialTitle}
                                </label>
                                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {result.report.differential_diagnosis.map((item: string, i: number) => (
                                    <span key={i} style={{ fontSize: '0.74rem', background: '#f8fafc', color: '#475569', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontWeight: 500 }}>
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Recommandation */}
                            {result.report.recommandation && (
                              <div style={{ background: '#eef2ff', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #6366f1' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recommandation</label>
                                <p style={{ color: '#1e1b4b', margin: '4px 0 0', fontSize: '0.82rem', lineHeight: 1.65, fontWeight: 500 }}>{result.report.recommandation}</p>
                              </div>
                            )}

                            {/* Imagerie de suivi */}
                            {result.report.follow_up_imaging && (
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                  {dict[lang].imagingTitle}
                                </label>
                                <p style={{ color: '#334155', margin: '4px 0 0', fontSize: '0.82rem', lineHeight: 1.65, fontWeight: 500 }}>{result.report.follow_up_imaging}</p>
                              </div>
                            )}

                            {/* Actions suggérées */}
                            {result.report['actions_suggérées']?.length > 0 && (
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions suggérées</label>
                                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                                  {result.report['actions_suggérées'].map((action: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: '#475569' }}>
                                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                                      {action}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Bas de rapport */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Méthode IA</label>
                                <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.73rem' }}>{result.report.methode_ia}</p>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Générateur</label>
                                <p style={{ color: '#6366f1', margin: '4px 0 0', fontSize: '0.73rem', fontWeight: 700 }}>{result.report.generated_by}</p>
                              </div>
                            </div>
                            
                            {result.report.mise_en_garde && (
                              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: '0.73rem', color: '#92400e' }}>
                                {result.report.mise_en_garde}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}



                    {/* Start new scan button */}
                    <button onClick={resetAll} style={{ background: 'white', border: '1px solid #e0e7ff', borderRadius: 12, padding: '12px 20px', cursor: 'pointer', color: '#6366f1', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {dict[lang].newAnalysisBtn}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />
        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="glow-line" style={{ marginBottom: 24 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bone className="w-4 h-4" color="white" />
                </div>
                <span className="font-display" style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{dict[lang].title}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', margin: 0, maxWidth: 380, lineHeight: 1.75 }}>
                {dict[lang].clinicalSupport} — {dict[lang].power}
              </p>
            </div>
            <div style={{ textTransform: 'none', textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0 0 6px', fontWeight: 500 }}>RadiSense AI — Clinical Agent</p>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem', margin: 0 }}>{dict[lang].footerDisclaimer}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.64rem', margin: 0 }}>
              &copy; {new Date().getFullYear()} RadiSense · {dict[lang].footerDisclaimer} · Academic Demonstration
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}