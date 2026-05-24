'use client'

import { useState, useCallback, useRef } from 'react'
import { analyzeImage, PredictionResult } from '@/lib/api'
import {
  Upload, X, AlertTriangle, CheckCircle, Brain,
  FileImage, Activity, ChevronDown, ChevronUp,
  Eye, ClipboardList, Loader2, Bone, Stethoscope, ScanLine
} from 'lucide-react'

type AppState = 'idle' | 'loading' | 'result' | 'error'

export default function HomePage() {
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
    if (!file.type.startsWith('image/')) { setErrorMsg('Image requis (JPEG, PNG)'); setState('error'); return }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Max 10 MB'); setState('error'); return }
    setSelectedFile(file); setPreview(URL.createObjectURL(file))
    setState('idle'); setResult(null); setErrorMsg('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }, [handleFile])

  const resetAll = () => {
    setSelectedFile(null); setPreview(null); setResult(null)
    setErrorMsg(''); setState('idle'); setReportExpanded(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setState('loading'); setResult(null); setErrorMsg('')
    try {
      const data = await analyzeImage(selectedFile)
      setResult(data); setState('result'); setReportExpanded(false)
    } catch (err: any) { setErrorMsg(err.message || 'Erreur analyse'); setState('error') }
  }

  const isFractured = result?.is_fractured

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── NAVBAR — light medical style ─────────────────────── */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e8eef6', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(30,58,138,0.06)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bone className="w-4 h-4" color="white" />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div className="font-display" style={{ color: '#1e1b4b', fontWeight: 800, fontSize: '1.05rem' }}>FractureAI</div>
              <div style={{ color: '#6366f1', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.14em' }}>MEDICAL ASSISTANT</div>
            </div>
          </div>

          {/* Nav links — pill style like Healthology */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8faff', borderRadius: 100, padding: '4px', border: '1px solid #e8eef6' }}>
            <span className="nav-link active">Analyse IA</span>
            <span className="nav-link">Méthodologie</span>
            <span className="nav-link">Résultats</span>
            <span className="nav-link">Équipe</span>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 100, padding: '6px 14px' }}>
            <div className="pulse-dot" />
            <span style={{ color: '#16a34a', fontSize: '0.74rem', fontWeight: 600 }}>Système actif</span>
          </div>
        </div>
      </nav>

      {/* ── HERO — light with scanner animation ──────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)', padding: '48px 24px 72px', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #e0e7ff' }}>

        {/* X-ray scanner animation */}
        <div className="scanner-container">
          <div className="dot-grid" />
          <div className="xray-corner tl" />
          <div className="xray-corner tr" />
          <div className="xray-corner bl" />
          <div className="xray-corner br" />
          <div className="scan-h scan-h-1" />
          <div className="scan-h scan-h-2" />
          <div className="scan-v scan-v-1" />
          <div className="scan-v scan-v-2" />
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #c7d2fe', borderRadius: 100, padding: '6px 18px', marginBottom: 22, boxShadow: '0 2px 8px rgba(99,102,241,0.1)' }}>
            <Stethoscope className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
            <span style={{ color: '#4f46e5', fontSize: '0.74rem', fontWeight: 600, letterSpacing: '0.08em' }}>ASSISTANT MÉDICAL INTELLIGENT</span>
          </div>

          <h1 className="font-display" style={{ fontSize: '2.9rem', color: '#1e1b4b', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Détection de Fractures<br />
            <span style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Assistée par IA
            </span>
          </h1>

          <p style={{ color: '#64748b', fontSize: '0.97rem', lineHeight: 1.75, margin: '0 auto 36px', maxWidth: 500 }}>
            Un assistant intelligent conçu pour aider les médecins à analyser les radiographies osseuses plus rapidement et avec plus de précision.
          </p>

          {/* Stats — white cards like Healthology */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 700, margin: '0 auto' }}>
            {[
              { value: '98.79%', label: 'Val Accuracy', icon: '🎯', color: '#4f46e5' },
              { value: '9 246', label: 'Radiographies', icon: '🩻', color: '#0891b2' },
              { value: 'ResNet50', label: 'Architecture', icon: '🧠', color: '#7c3aed' },
              { value: 'Grad-CAM', label: 'Explainability', icon: '🔬', color: '#4f46e5' },
            ].map(({ value, label, icon, color }) => (
              <div key={label} className="stat-card">
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
                <div style={{ color, fontWeight: 700, fontSize: '0.95rem' }}>{value}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1120, margin: '-28px auto 0', padding: '0 24px 60px', position: 'relative', zIndex: 2 }}>

        {/* Warning */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 12, padding: '10px 16px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle className="w-4 h-4" style={{ color: '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: '#92400e' }}>
            <strong>Avertissement médical.</strong> Outil d'aide à la décision clinique — les résultats doivent être validés par un professionnel de santé qualifié.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: state === 'result' ? '1fr 1fr' : '1fr', gap: 22, maxWidth: state === 'result' ? '100%' : 600, margin: '0 auto' }}>

          {/* COL GAUCHE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Upload */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '13px 20px', background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', borderBottom: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ScanLine className="w-4 h-4" style={{ color: '#6366f1' }} />
                <span style={{ fontWeight: 600, color: '#3730a3', fontSize: '0.87rem' }}>Charger une radiographie</span>
              </div>
              <div style={{ padding: 20 }}>
                {!preview ? (
                  <div className={`drop-zone${dragOver ? ' over' : ''}`}
                    style={{ padding: '44px 20px', textAlign: 'center', cursor: 'pointer' }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '2px solid #c7d2fe' }}>
                      <Upload className="w-6 h-6" style={{ color: '#6366f1' }} />
                    </div>
                    <p style={{ color: '#3730a3', fontWeight: 600, marginBottom: 6, fontSize: '0.93rem' }}>Glissez une image ou cliquez pour parcourir</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.77rem' }}>Formats : JPEG, PNG — Max 10 MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0f172a' }}>
                      <img src={preview} alt="Radio" style={{ width: '100%', borderRadius: 12, objectFit: 'contain', maxHeight: 300, display: 'block' }} />
                      {state === 'loading' && <div className="scan-overlay" />}
                    </div>
                    <button onClick={resetAll} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
                      <X className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
                    </button>
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{selectedFile?.name}</span>
                      <span>·</span>
                      <span>{((selectedFile?.size || 0) / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton */}
            {selectedFile && (
              <button className="btn-primary fade-up" onClick={handleAnalyze} disabled={state === 'loading'}>
                {state === 'loading'
                  ? <><Loader2 className="w-4 h-4 spin" />Analyse en cours…</>
                  : <><Activity className="w-4 h-4" />Lancer l'analyse IA</>
                }
              </button>
            )}

            {/* Erreur */}
            {state === 'error' && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10 }} className="fade-up">
                <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: '#dc2626', margin: 0, fontSize: '0.85rem' }}>{errorMsg}</p>
              </div>
            )}

            {/* Résultat score */}
            {state === 'result' && result && (
              <div className={`fade-up ${isFractured ? 'fracture-box' : 'normal-box'}`} style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: isFractured ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isFractured ? <AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} /> : <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: isFractured ? '#dc2626' : '#16a34a', margin: 0, fontSize: '0.98rem' }}>
                      {isFractured ? 'Fracture osseuse détectée' : 'Aucune fracture détectée'}
                    </p>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.76rem', marginTop: 2 }}>Score de confiance du modèle</p>
                  </div>
                  <div style={{ background: isFractured ? '#dc2626' : '#16a34a', color: 'white', fontWeight: 800, fontSize: '1.15rem', padding: '6px 16px', borderRadius: 100, boxShadow: `0 4px 14px ${isFractured ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)'}` }}>
                    {result.confidence}%
                  </div>
                </div>
                {Object.entries(result.probabilities).map(([cls, prob]) => (
                  <div key={cls} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.8rem' }}>
                      <span style={{ color: '#475569', fontWeight: 500, textTransform: 'capitalize' }}>{cls}</span>
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

            {/* Info cards idle */}
            {state === 'idle' && !selectedFile && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="fade-up">
                {[
                  { icon: <Brain className="w-5 h-5" />, title: 'ResNet50', desc: 'Transfer Learning ImageNet', color: '#4f46e5', bg: '#eef2ff' },
                  { icon: <Eye className="w-5 h-5" />, title: 'Grad-CAM', desc: 'Explainability visuelle', color: '#0891b2', bg: '#e0f7fa' },
                  { icon: <ClipboardList className="w-5 h-5" />, title: 'Rapport IA', desc: 'Structuré automatique', color: '#7c3aed', bg: '#f5f3ff' },
                ].map(({ icon, title, desc, color, bg }) => (
                  <div key={title} className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color }}>{icon}</div>
                    <p style={{ fontWeight: 600, color: '#1e1b4b', margin: '0 0 3px', fontSize: '0.82rem' }}>{title}</p>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.71rem' }}>{desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COL DROITE */}
          {state === 'result' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="fade-up">

              {/* Grad-CAM */}
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                  {(['gradcam', 'heatmap'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.79rem', fontWeight: 500, borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === tab ? '#6366f1' : '#94a3b8', transition: 'all 0.2s' }}>
                      {tab === 'gradcam' ? '🔥 Grad-CAM superposé' : '🌡 Heatmap seule'}
                    </button>
                  ))}
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ borderRadius: 10, overflow: 'hidden', background: '#0f172a' }}>
                    <img src={activeTab === 'gradcam' ? result.gradcam_image : result.heatmap_image} alt="Grad-CAM" style={{ width: '100%', objectFit: 'contain', maxHeight: 270, display: 'block' }} />
                  </div>
                  <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.71rem', marginTop: 8 }}>
                    {activeTab === 'gradcam' ? "Zones d'attention superposées · Rouge = région décisive" : 'Carte thermique brute · Gradient de la classe prédite'}
                  </p>
                </div>
              </div>

              {/* Rapport */}
              {result.report && (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button onClick={() => setReportExpanded(!reportExpanded)} style={{ width: '100%', padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: reportExpanded ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ClipboardList className="w-4 h-4" style={{ color: '#6366f1' }} />
                      <span style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.87rem' }}>Rapport médical structuré</span>
                      {result.report.niveau_urgence && (
                        <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 10px', borderRadius: 100, background: result.report.niveau_urgence === 'Élevé' ? '#fee2e2' : result.report.niveau_urgence === 'Modéré' ? '#fef3c7' : '#dcfce7', color: result.report.niveau_urgence === 'Élevé' ? '#dc2626' : result.report.niveau_urgence === 'Modéré' ? '#d97706' : '#16a34a' }}>
                          {result.report.niveau_urgence}
                        </span>
                      )}
                    </div>
                    {reportExpanded ? <ChevronUp className="w-4 h-4" style={{ color: '#94a3b8' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#94a3b8' }} />}
                  </button>

                  {reportExpanded && (
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Statut</label>
                        <p style={{ fontWeight: 700, color: isFractured ? '#dc2626' : '#16a34a', margin: '4px 0 0', fontSize: '0.93rem' }}>{result.report.statut}</p>
                      </div>
                      {result.report.resume_clinique && (
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Résumé clinique</label>
                          <p style={{ color: '#475569', margin: '4px 0 0', fontSize: '0.82rem', lineHeight: 1.65 }}>{result.report.resume_clinique}</p>
                        </div>
                      )}
                      {result.report.recommandation && (
                        <div style={{ background: '#eef2ff', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #6366f1' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recommandation</label>
                          <p style={{ color: '#1e1b4b', margin: '4px 0 0', fontSize: '0.82rem', lineHeight: 1.65, fontWeight: 500 }}>{result.report.recommandation}</p>
                        </div>
                      )}
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Méthode IA</label>
                          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.73rem' }}>{result.report.methode_ia}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confiance</label>
                          <p style={{ color: '#6366f1', margin: '4px 0 0', fontSize: '0.73rem', fontWeight: 700 }}>{result.report.score_confiance}</p>
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

              <button onClick={resetAll} style={{ background: 'white', border: '1px solid #e0e7ff', borderRadius: 12, padding: '12px 20px', cursor: 'pointer', color: '#6366f1', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                ↩ Nouvelle analyse
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />
        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="glow-line" style={{ marginBottom: 24 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bone className="w-3.5 h-3.5" color="white" />
                </div>
                <span className="font-display" style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>FractureAI</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', margin: 0, maxWidth: 380, lineHeight: 1.75 }}>
                Un assistant intelligent conçu pour aider les médecins à analyser les radiographies osseuses plus rapidement et avec plus de précision.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0 0 6px', fontWeight: 500 }}>Projet Master · Intelligence Artificielle</p>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem', margin: 0 }}>ResNet50 · Grad-CAM · PyTorch · Google Colab T4 · 98.79%</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.64rem', margin: 0 }}>
              Outil d'aide à la décision clinique — Ne constitue pas un avis médical certifié — Usage académique uniquement
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}