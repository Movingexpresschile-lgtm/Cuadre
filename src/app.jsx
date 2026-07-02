// ============================================================
// RutaCuadrada - App.jsx
// Firebase Auth + Firestore — Sesión y datos persistentes en nube
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  BusFront, FileText, TrendingDown, ShieldCheck,
  CheckCircle2, ChevronRight, Lock,
  BarChart3, LogIn, User, Send, MessageCircle, Calendar, Filter, LogOut, Download, Star, MessageSquare
} from 'lucide-react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy
} from 'firebase/firestore';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [liquidations, setLiquidations] = useState([]);
  const [trialCount, setTrialCount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentSavedLiq, setCurrentSavedLiq] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showFreemiumModal, setShowFreemiumModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  // PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  const [selectedStatMonth, setSelectedStatMonth] = useState('');

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState('Sugerencia');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // ===================== FORMULARIO =====================
  const [headerInfo, setHeaderInfo] = useState({
    date: new Date().toLocaleDateString('es-CL'),
    driverName: '', driverRut: '', company: '', route: '',
    plate: '', machineNum: '', garitaEmail: '', garitaPhone: ''
  });
  const [ticketPrices, setTicketPrices] = useState({ largo: 1500, medio: 1200, local: 600, estud: 500, edad: 750 });
  const [tickets, setTickets] = useState({
    largo: { start: '', end: '' }, medio: { start: '', end: '' },
    local: { start: '', end: '' }, estud: { start: '', end: '' },
    edad: { start: '', end: '' },
  });
  const [laps, setLaps] = useState({ v1: false, v2: false, v3: false, v4: false });
  const [expenses, setExpenses] = useState({ planilla: '', petroleo: '', limpieza: '', mantenciones: '', otros: '' });
  const [observations, setObservations] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(20);
  const labels = { largo: 'Largo', medio: 'Medio', local: 'Local', estud: 'Estudiante', edad: 'Adulto Mayor' };

  // ===================== CÁLCULOS =====================
  const getPassengers = (cat, t = tickets) => Math.max(0, (parseInt(t[cat].end) || 0) - (parseInt(t[cat].start) || 0));
  const getAmount = (cat, t = tickets, p = ticketPrices) => getPassengers(cat, t) * p[cat];
  const totalIncome = Object.keys(ticketPrices).reduce((acc, cat) => acc + getAmount(cat), 0);
  const driverCommission = totalIncome * (commissionPercent / 100);
  const getExpenseValue = (field, exp = expenses) => parseInt(exp[field]) || 0;
  const totalExpenses = getExpenseValue('planilla') + getExpenseValue('petroleo') + getExpenseValue('limpieza') + getExpenseValue('mantenciones') + getExpenseValue('otros') + driverCommission;
  const totalBalance = totalIncome - totalExpenses;
  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(amount));

  // ===================== FIREBASE AUTH — ESCUCHAR SESIÓN =====================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setUserEmail(user.email);
        setIsLoggedIn(true);
        await cargarDatosConductor(user.uid);
        await cargarHistorial(user.uid);
      } else {
        setFirebaseUser(null);
        setIsLoggedIn(false);
        setUserEmail('');
        // Si no hay sesión, cargar historial local como fallback
        const saved = localStorage.getItem('rutacuadrada_history');
        if (saved) setLiquidations(JSON.parse(saved));
      }
    });
    return () => unsub();
  }, []);

  // PWA banners
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const visitCount = parseInt(localStorage.getItem('rutacuadrada_visits') || '0');
      if (!localStorage.getItem('rutacuadrada_install_dismissed') && visitCount >= 2) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const visitCount = parseInt(localStorage.getItem('rutacuadrada_visits') || '0') + 1;
    localStorage.setItem('rutacuadrada_visits', visitCount.toString());
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone && !localStorage.getItem('rutacuadrada_install_dismissed') && visitCount >= 2 && isIos) setShowIosBanner(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ===================== FIRESTORE — CARGAR DATOS =====================
  const cargarDatosConductor = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'usuarios', uid, 'perfil', 'datos'));
      if (snap.exists()) {
        setHeaderInfo(prev => ({ ...prev, ...snap.data() }));
        if (snap.data().commissionPercent) setCommissionPercent(snap.data().commissionPercent);
        if (snap.data().ticketPrices) setTicketPrices(snap.data().ticketPrices);
      }
    } catch (e) { console.log('Sin perfil previo:', e.message); }
  };

  const cargarHistorial = async (uid) => {
    try {
      const q = query(collection(db, 'usuarios', uid, 'liquidaciones'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiquidations(lista);
      if (lista.length > 0 && !selectedStatMonth) setSelectedStatMonth(lista[0].monthYear || '');
    } catch (e) { console.log('Sin historial:', e.message); }
  };

  const guardarPerfilFirestore = async (uid, datos) => {
    try {
      await setDoc(doc(db, 'usuarios', uid, 'perfil', 'datos'), {
        driverName: datos.driverName || '',
        driverRut: datos.driverRut || '',
        company: datos.company || '',
        route: datos.route || '',
        plate: datos.plate || '',
        machineNum: datos.machineNum || '',
        garitaPhone: datos.garitaPhone || '',
        commissionPercent,
        ticketPrices,
      }, { merge: true });
    } catch (e) { console.log('Error guardando perfil:', e.message); }
  };

  const guardarLiquidacionFirestore = async (uid, liq) => {
    try {
      await addDoc(collection(db, 'usuarios', uid, 'liquidaciones'), {
        ...liq,
        timestamp: new Date().toISOString(),
      });
    } catch (e) { console.log('Error guardando liquidación:', e.message); }
  };

  // ===================== AUTH HANDLERS =====================
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, userEmail, userPassword);
      setShowLogin(false); setUserPassword('');
    } catch (err) {
      setAuthError(err.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : 'Error al iniciar sesión. Intenta de nuevo.');
    }
    setAuthLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
      await guardarPerfilFirestore(cred.user.uid, headerInfo);
      setShowRegister(false); setShowCreateAccount(false); setUserPassword('');
    } catch (err) {
      setAuthError(err.code === 'auth/email-already-in-use' ? 'Este correo ya tiene una cuenta. Inicia sesión.' : err.code === 'auth/weak-password' ? 'La contraseña debe tener al menos 6 caracteres.' : 'Error al crear cuenta.');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsPanelOpen(false); setCurrentView('landing');
    setLiquidations([]); setSelectedStatMonth('');
  };

  const handleResetPassword = async () => {
    if (!userEmail) { setAuthError('Ingresa tu correo primero.'); return; }
    try {
      await sendPasswordResetEmail(auth, userEmail);
      setResetSent(true);
    } catch { setAuthError('No se pudo enviar el correo.'); }
  };

  // ===================== NAVEGACIÓN =====================
  const handleStartApp = () => setCurrentView('setup');
  const handleNavigate = (view) => { setIsPanelOpen(false); setCurrentView(view); };

  const handleInstallApp = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); }
    setShowInstallBanner(false); localStorage.setItem('rutacuadrada_install_dismissed', 'true');
  };
  const dismissInstallBanner = () => {
    setShowInstallBanner(false); setShowIosBanner(false);
    localStorage.setItem('rutacuadrada_install_dismissed', 'true');
  };

  // ===================== GUARDAR LIQUIDACIÓN =====================
  const saveLiquidation = async () => {
    if (firebaseUser) await guardarPerfilFirestore(firebaseUser.uid, headerInfo);

    const newLiq = {
      ...headerInfo, tickets, ticketPrices, expenses, observations, laps,
      driverCommission, totalIncome, totalExpenses, totalBalance,
      monthYear: new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      date: new Date().toLocaleDateString('es-CL'),
    };

    if (firebaseUser) {
      await guardarLiquidacionFirestore(firebaseUser.uid, newLiq);
      await cargarHistorial(firebaseUser.uid);
    } else {
      // Fallback localStorage si no hay cuenta
      const newHistory = [{ ...newLiq, id: Date.now() }, ...liquidations];
      setLiquidations(newHistory);
      localStorage.setItem('rutacuadrada_history', JSON.stringify(newHistory));
    }

    if (!selectedStatMonth) setSelectedStatMonth(newLiq.monthYear);
    setCurrentSavedLiq(newLiq);
    setShowSuccessModal(true);
    window.scrollTo(0, 0);
  };

  const resetAndExit = () => {
    setTickets({ largo: { start: '', end: '' }, medio: { start: '', end: '' }, local: { start: '', end: '' }, estud: { start: '', end: '' }, edad: { start: '', end: '' } });
    setLaps({ v1: false, v2: false, v3: false, v4: false });
    setExpenses({ planilla: '', petroleo: '', limpieza: '', mantenciones: '', otros: '' });
    setObservations('');
    setShowSuccessModal(false); setCurrentSavedLiq(null); setCurrentView('landing');
  };

  const shareApp = () => {
    const text = "Estoy usando RutaCuadrada para el cuadre diario en segundos. Prueba Gratis Aquí: https://www.rutacuadrada.cl";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ===================== REPORTE WHATSAPP =====================
  const generateReportText = (data) => {
    if (!data) return '';
    let ticketDetails = '';
    Object.keys(data.tickets || {}).forEach(cat => {
      const pax = getPassengers(cat, data.tickets);
      if (pax > 0) ticketDetails += `• ${labels[cat]} ($${data.ticketPrices[cat]}): Inicio ${data.tickets[cat].start} | Pax: ${pax} | Total: ${formatMoney(pax * data.ticketPrices[cat])}\n`;
    });
    if (!ticketDetails) ticketDetails = 'Sin boletos registrados\n';
    return `*RutaCuadrada - Reporte de Liquidación*\nFecha: ${data.date}\nConductor: ${data.driverName}\nVehículo: ${data.plate} - Maq: ${data.machineNum}\n\n-- DETALLE DE INGRESOS --\n${ticketDetails}\n*INGRESO TOTAL: ${formatMoney(data.totalIncome)}*\n\n-- GASTOS --\nPlanilla: ${formatMoney(data.expenses?.planilla || 0)}\nCombustible: ${formatMoney(data.expenses?.petroleo || 0)}\nLimpieza: ${formatMoney(data.expenses?.limpieza || 0)}\nMantenciones: ${formatMoney(data.expenses?.mantenciones || 0)}\nOtros Gastos: ${formatMoney(data.expenses?.otros || 0)}\nComisión Chofer: ${formatMoney(data.driverCommission || 0)}\n*TOTAL GASTOS: ${formatMoney(data.totalExpenses)}*\n\n-- SALDO A ENTREGAR --\n*${formatMoney(data.totalBalance)}*\n\nObservaciones: ${data.observations || 'Ninguna'}`;
  };

  // ===================== PDF =====================
  const generatePDF = async (liq) => {
    setIsGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; const margin = 15; let y = 20;
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 30, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('LIQUIDACIÓN DE RUTA', pageW / 2, 13, { align: 'center' });
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text('RutaCuadrada - Menos Cuentas. Más Control.', pageW / 2, 22, { align: 'center' });
      y = 40; doc.setTextColor(30, 30, 30);
      doc.setFillColor(248, 250, 252); doc.rect(margin, y - 5, pageW - margin * 2, 28, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text('DATOS DEL CONDUCTOR', margin + 2, y + 2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(`Conductor: ${liq.driverName || '-'}`, margin + 2, y + 9);
      doc.text(`RUT: ${liq.driverRut || '-'}`, margin + 2, y + 15);
      doc.text(`Empresa: ${liq.company || '-'}`, pageW / 2, y + 9);
      doc.text(`Recorrido: ${liq.route || '-'}`, pageW / 2, y + 15);
      doc.text(`Patente: ${liq.plate || '-'}`, margin + 2, y + 21);
      doc.text(`Máquina N°: ${liq.machineNum || '-'}`, pageW / 2, y + 21);
      doc.text(`Fecha: ${liq.date}`, pageW - margin - 2, y + 2, { align: 'right' });
      y += 35;
      doc.setFillColor(15, 23, 42); doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('BOLETO', margin + 2, y + 5); doc.text('INICIO', margin + 45, y + 5);
      doc.text('PAX', margin + 95, y + 5); doc.text('PRECIO', margin + 115, y + 5); doc.text('TOTAL', margin + 145, y + 5);
      y += 7; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
      let rowBg = false;
      Object.keys(liq.tickets || {}).forEach(cat => {
        const pax = getPassengers(cat, liq.tickets);
        const amount = pax * (liq.ticketPrices?.[cat] || 0);
        if (rowBg) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, 7, 'F'); }
        rowBg = !rowBg; doc.setFontSize(8);
        doc.text(labels[cat], margin + 2, y + 5);
        doc.text(liq.tickets[cat].start || '-', margin + 45, y + 5);
        doc.text(pax.toString(), margin + 95, y + 5);
        doc.text(`$${liq.ticketPrices?.[cat] || 0}`, margin + 115, y + 5);
        doc.text(formatMoney(amount), pageW - margin - 2, y + 5, { align: 'right' });
        y += 7;
      });
      doc.setFillColor(209, 250, 229); doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(6, 78, 59);
      doc.text('TOTAL INGRESOS', margin + 2, y + 6);
      doc.text(formatMoney(liq.totalIncome), pageW - margin - 2, y + 6, { align: 'right' });
      y += 14; doc.setTextColor(30, 30, 30);
      doc.setFillColor(254, 226, 226); doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(127, 29, 29);
      doc.text('GASTOS OPERATIVOS', margin + 2, y + 5); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
      [['Planilla', liq.expenses?.planilla], ['Combustible', liq.expenses?.petroleo], ['Limpieza', liq.expenses?.limpieza], ['Mantenciones', liq.expenses?.mantenciones], ['Otros Gastos', liq.expenses?.otros], ['Comisión Conductor', liq.driverCommission]].forEach(([label, val]) => {
        doc.text(label, margin + 2, y + 5); doc.text(formatMoney(parseInt(val) || 0), pageW - margin - 2, y + 5, { align: 'right' }); y += 6;
      });
      doc.setFillColor(254, 226, 226); doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(127, 29, 29);
      doc.text('TOTAL GASTOS', margin + 2, y + 6); doc.text(formatMoney(liq.totalExpenses), pageW - margin - 2, y + 6, { align: 'right' }); y += 14;
      doc.setFillColor(15, 23, 42); doc.rect(margin, y, pageW - margin * 2, 14, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('SALDO A ENTREGAR', margin + 4, y + 9);
      doc.setTextColor(liq.totalBalance >= 0 ? 52 : 239, liq.totalBalance >= 0 ? 211 : 68, liq.totalBalance >= 0 ? 153 : 68);
      doc.setFontSize(13); doc.text(formatMoney(liq.totalBalance), pageW - margin - 2, y + 9, { align: 'right' }); y += 20;
      if (liq.observations) {
        doc.setTextColor(30, 30, 30); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('Observaciones:', margin, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(liq.observations, pageW - margin * 2);
        doc.text(lines, margin, y + 6);
      }
      doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text('Generado por RutaCuadrada (rutacuadrada.cl) - Menos Cuentas. Más Control.', pageW / 2, 285, { align: 'center' });
      const fileName = `RutaCuadrada_${(liq.date || '').replace(/\//g, '-')}_Maq${liq.machineNum || '0'}.pdf`;
      if (navigator.share && navigator.canShare) {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Liquidación RutaCuadrada' }); setIsGeneratingPdf(false); return; }
      }
      doc.save(fileName);
    } catch (err) { console.error('Error PDF:', err); alert('Error al generar el PDF.'); }
    setIsGeneratingPdf(false);
  };

  const handlePrintHistory = (liq) => { setCurrentSavedLiq(liq); setTimeout(() => generatePDF(liq), 300); };

  // ===================== FEEDBACK =====================
  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    console.log('Feedback:', { version: 'v1.0', timestamp: new Date().toISOString(), userEmail: userEmail || 'Anónimo', empresa: headerInfo.company || '', tipo: feedbackType, calificacion: feedbackRating, mensaje: feedbackMessage, deseaContacto: feedbackContact });
    setFeedbackSuccess(true);
    setTimeout(() => { setShowFeedback(false); setFeedbackSuccess(false); setFeedbackType('Sugerencia'); setFeedbackRating(0); setFeedbackMessage(''); setFeedbackContact(false); }, 4000);
  };

  // ===================== MODAL DE AUTH (Login / Registro) =====================
  const ModalAuth = ({ modo }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl relative">
        <button onClick={() => { setShowLogin(false); setShowRegister(false); setAuthError(''); setResetSent(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">✕</button>
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><User size={32} /></div>
        <h2 className="text-2xl font-black text-slate-800 mb-1">{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
        <p className="text-slate-500 text-sm mb-6">{modo === 'login' ? 'Tu historial te espera en la nube.' : 'Guarda tu historial de liquidaciones en la nube.'}</p>
        {resetSent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm font-medium">
            ✓ Correo enviado. Revisa tu bandeja de entrada.
          </div>
        ) : (
          <form onSubmit={modo === 'login' ? handleLogin : handleRegister}>
            <input type="email" required placeholder="tu@correo.com" className="w-full p-3 border-2 border-slate-200 rounded-xl mb-3 focus:border-emerald-500 outline-none text-center font-medium" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
            <input type="password" required placeholder="Contraseña (mínimo 6 caracteres)" className="w-full p-3 border-2 border-slate-200 rounded-xl mb-3 focus:border-emerald-500 outline-none text-center font-medium" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} />
            {authError && <p className="text-red-500 text-xs mb-3 font-medium">{authError}</p>}
            <button type="submit" disabled={authLoading} className="w-full bg-emerald-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-400 mb-3 disabled:opacity-60">
              {authLoading ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
            {modo === 'login' && (
              <button type="button" onClick={handleResetPassword} className="text-slate-400 text-xs hover:text-slate-600 underline block w-full mb-2">¿Olvidaste tu contraseña?</button>
            )}
          </form>
        )}
        <button onClick={() => { setShowLogin(modo === 'register'); setShowRegister(modo === 'login'); setAuthError(''); setResetSent(false); }} className="text-slate-400 text-sm hover:text-slate-600 mt-1">
          {modo === 'login' ? '¿No tienes cuenta? Créala aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );

  // ===================== VISTA: LANDING =====================
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        {/* Nav */}
        <nav className="bg-slate-900 text-white p-4 flex justify-between items-center px-4 md:px-12 z-50 sticky top-0">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide flex items-center gap-2"><BusFront className="text-emerald-400" /> RutaCuadrada</span>
            <span className="text-[11px] italic text-emerald-400 font-light tracking-wider">Menos Cuentas. Más Control.</span>
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <a href="/articulos.html" className="text-sm font-semibold hover:text-emerald-400 transition-colors hidden sm:block">Artículos</a>
              <div className="relative">
                <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-700 transition-colors">
                  <User size={16} /> Mi Panel
                </button>
                {isPanelOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 border border-slate-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 mb-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sesión Activa</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{userEmail}</p>
                    </div>
                    <button onClick={() => handleNavigate('stats')} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"><BarChart3 size={16} /> Mis Estadísticas</button>
                    <button onClick={() => handleNavigate('reports')} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"><FileText size={16} /> Mis Reportes PDF</button>
                    <div className="border-t border-slate-100 mt-1"></div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={16} /> Cerrar Sesión</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <a href="/articulos.html" className="text-sm font-semibold hover:text-emerald-400 transition-colors hidden sm:block">Artículos</a>
              <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-400"><LogIn size={18} /> Iniciar Sesión</button>
            </div>
          )}
        </nav>

        {/* Hero */}
        <header className="bg-slate-900 text-white pt-16 pb-24 px-4 text-center overflow-hidden relative flex-grow flex flex-col justify-center">
          <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1544620347-c4fd6a3d5957?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center" />
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Ctext x='20' y='60' font-family='Georgia,serif' font-size='48' fill='%2334d399'%3E%E2%88%AB%3C/text%3E%3Ctext x='160' y='50' font-family='Georgia,serif' font-size='40' fill='%2334d399'%3E%CE%A3%3C/text%3E%3Ctext x='280' y='70' font-family='Georgia,serif' font-size='44' fill='%2334d399'%3E%CF%80%3C/text%3E%3Ctext x='60' y='160' font-family='Arial' font-size='42' fill='%2334d399'%3E=%3C/text%3E%3Ctext x='220' y='170' font-family='Arial' font-size='38' fill='%2334d399'%3E%25%3C/text%3E%3Cpolyline points='40,260 80,230 120,250 160,200 200,220 240,180 280,210 320,160' fill='none' stroke='%2334d399' stroke-width='3'/%3E%3Ctext x='30' y='340' font-family='Georgia,serif' font-size='40' fill='%2334d399'%3E%CF%80%3C/text%3E%3Ctext x='150' y='330' font-family='Arial' font-size='40' fill='%2334d399'%3E%25%3C/text%3E%3Ctext x='270' y='350' font-family='Georgia,serif' font-size='44' fill='%2334d399'%3E%E2%88%AB%3C/text%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '400px 400px' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900" />

          <div className="max-w-4xl mx-auto space-y-8 relative z-10">
            <div className="mt-2">
              <button onClick={handleStartApp} className="bg-emerald-500 text-slate-900 font-black text-xl py-5 px-12 rounded-full hover:bg-emerald-400 transition-transform transform hover:scale-105 shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
                Iniciar mis cálculos <ChevronRight className="inline" size={24} />
              </button>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mt-6 text-white drop-shadow-md">
              Líquida.<br />
              <span className="text-emerald-400 block mt-2">Rápido. Exacto.</span>
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <button onClick={() => handleNavigate('stats')} className="flex items-center justify-center gap-2 bg-slate-800/80 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition-colors shadow-lg">
                <BarChart3 size={20} className="text-emerald-400" /> Mis Estadísticas
              </button>
              <button onClick={() => handleNavigate('reports')} className="flex items-center justify-center gap-2 bg-slate-800/80 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-slate-700 hover:border-blue-500 hover:text-blue-400 transition-colors shadow-lg">
                <FileText size={20} className="text-blue-400" /> Reportes PDF
              </button>
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => window.open('https://www.flow.cl/btn.php?token=qf8691478077e8d649aae7f380c116e87afd54fd', '_blank')} className="inline-flex items-center gap-3 bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 hover:bg-emerald-500 transition-all border border-emerald-400 cursor-pointer">
                <span className="text-sm md:text-base tracking-wide">💚 Funcionamos gracias a tu colaboración — Apóyanos aquí</span>
              </button>
            </div>
          </div>
        </header>

        {/* Footer */}
        <footer className="bg-slate-950 text-slate-400 p-8 text-center text-xs space-y-2">
          <p className="font-bold text-sm text-slate-300">RutaCuadrada - Menos Cuentas. Más Control.</p>
          <p>© 2026 RutaCuadrada. Todos los derechos reservados.</p>
          <p>Soporte: <a href="mailto:movingexpresschile@gmail.com" className="text-emerald-500">movingexpresschile@gmail.com</a></p>
          <div className="pt-4 border-t border-slate-800 flex justify-center gap-4 flex-wrap">
            <button onClick={() => setCurrentView('terms')} className="hover:text-slate-200 transition-colors">Términos de Servicio</button>
            <span>|</span>
            <a href="/nuestra-razon.html" className="hover:text-slate-200 transition-colors">Nuestra Razón</a>
            <span>|</span>
            <a href="/articulos.html" className="hover:text-slate-200 transition-colors">Artículos</a>
          </div>
        </footer>

        {showInstallBanner && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-emerald-500 p-4 flex items-center justify-between gap-3 z-[200] shadow-2xl">
            <div className="flex items-center gap-3"><BusFront className="text-emerald-400 shrink-0" size={28} /><div><p className="text-white font-bold text-sm">Instala RutaCuadrada</p><p className="text-slate-400 text-xs">Agrégala a tu pantalla de inicio</p></div></div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleInstallApp} className="bg-emerald-500 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm">Instalar</button>
              <button onClick={dismissInstallBanner} className="text-slate-400 hover:text-white px-2 text-lg">✕</button>
            </div>
          </div>
        )}
        {showIosBanner && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-emerald-500 p-4 z-[200] shadow-2xl">
            <div className="flex justify-between items-start mb-3"><p className="text-white font-bold text-sm flex items-center gap-2"><BusFront className="text-emerald-400" size={20} /> Instala RutaCuadrada en tu iPhone</p><button onClick={dismissInstallBanner} className="text-slate-400 hover:text-white text-lg">✕</button></div>
            <div className="space-y-2 text-slate-300 text-xs">
              <div className="flex items-center gap-2"><span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0">1</span><span>Toca el botón <strong className="text-white">Compartir</strong> (⬆️) en Safari</span></div>
              <div className="flex items-center gap-2"><span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0">2</span><span>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong></span></div>
              <div className="flex items-center gap-2"><span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0">3</span><span>Toca <strong className="text-white">Agregar</strong></span></div>
            </div>
          </div>
        )}
        {showLogin && <ModalAuth modo="login" />}
        {showRegister && <ModalAuth modo="register" />}
      </div>
    );
  }

  // ===================== VISTA: SETUP =====================
  if (currentView === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-medium">← Volver al Inicio</button>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full">Paso 1 de 2</span>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2"><BusFront className="text-emerald-500" /> Iniciar Cálculo</h2>
            <p className="text-slate-500 text-sm mb-8">Ingresa los valores y los números de tus boletos para comenzar.</p>
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><TrendingDown size={16} /> Valores de Boletos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.keys(ticketPrices).map(cat => (
                    <div key={cat}>
                      <label className="text-xs text-slate-500 font-medium mb-1 block">{labels[cat]}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400 font-medium">$</span>
                        <input type="number" className="w-full p-3 pl-7 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700" value={ticketPrices[cat]} onChange={(e) => setTicketPrices({ ...ticketPrices, [cat]: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-3 font-bold flex justify-between items-center">
                  <span className="flex items-center gap-2"><FileText size={18} /> Boletos Cortados</span>
                  <span className="text-xs bg-emerald-500 text-slate-900 px-2 py-1 rounded font-black">FASE 2</span>
                </div>
                <div className="p-4 space-y-4">
                  {Object.keys(ticketPrices).map((cat) => (
                    <div key={cat} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="col-span-12 sm:col-span-2 font-bold text-slate-700">{labels[cat]}</div>
                      <div className="col-span-4 sm:col-span-3"><input type="number" placeholder="Inicio" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" value={tickets[cat].start} onChange={(e) => setTickets({ ...tickets, [cat]: { ...tickets[cat], start: e.target.value } })} /></div>
                      <div className="col-span-4 sm:col-span-3"><input type="number" placeholder="Fin" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" value={tickets[cat].end} onChange={(e) => setTickets({ ...tickets, [cat]: { ...tickets[cat], end: e.target.value } })} /></div>
                      <div className="col-span-4 sm:col-span-2 text-center bg-slate-200 rounded-lg py-1.5 font-bold text-slate-600 text-sm">{getPassengers(cat)} <span className="text-[10px] uppercase block -mt-1">Pax</span></div>
                      <div className="col-span-12 sm:col-span-2 text-right font-black text-slate-800 flex justify-between sm:block items-center"><span className="text-xs text-slate-400 sm:hidden">Total:</span><span>{formatMoney(getAmount(cat))}</span></div>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-50 p-4 border-t border-emerald-100 flex justify-between items-center">
                  <span className="font-black text-emerald-900">INGRESO TOTAL</span>
                  <span className="text-2xl font-black text-emerald-700">{formatMoney(totalIncome)}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setCurrentView('daily')} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-800 transition-colors shadow-lg flex justify-center items-center gap-2">
              Continuar con Gastos <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== VISTA: DAILY =====================
  if (currentView === 'daily') {
    return (
      <div className="min-h-screen bg-slate-100 p-2 md:p-6 font-sans print:bg-white print:p-0">
        <div className="hidden print:block w-full max-w-3xl mx-auto p-8 font-sans">
          {currentSavedLiq && (
            <div className="space-y-6">
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-3xl font-black">LIQUIDACIÓN DE RUTA</h1>
                <p className="text-lg text-slate-600 mt-1">{currentSavedLiq.company} - {currentSavedLiq.route}</p>
                <p className="text-sm text-slate-500 font-mono mt-1">Fecha: {currentSavedLiq.date}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-200 pb-4">
                <div><span className="font-bold">Conductor:</span> {currentSavedLiq.driverName}</div>
                <div><span className="font-bold">RUT:</span> {currentSavedLiq.driverRut}</div>
                <div><span className="font-bold">Patente:</span> {currentSavedLiq.plate}</div>
                <div><span className="font-bold">Máquina Nº:</span> {currentSavedLiq.machineNum}</div>
              </div>
            </div>
          )}
        </div>

        <div className="print:hidden max-w-3xl mx-auto space-y-4 relative pb-20">
          <div className="flex justify-between items-center px-2">
            <button onClick={() => setCurrentView('setup')} className="text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center gap-1">← Atrás</button>
            <span className="text-xs font-bold text-slate-400">{headerInfo.date}</span>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-red-500 text-white p-3 font-bold flex items-center gap-2"><TrendingDown size={18} /> Gastos Operativos</div>
            <div className="p-4 space-y-3">
              {[{ id: 'planilla', label: 'Planilla' }, { id: 'petroleo', label: 'Combustible' }, { id: 'limpieza', label: 'Servicio de Limpieza' }, { id: 'mantenciones', label: 'Mantenciones' }, { id: 'otros', label: 'Otros Gastos' }].map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                  <label className="font-medium text-slate-700 text-sm">{expense.label}</label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                    <input type="number" className="w-full p-2 pl-6 text-right border border-slate-300 rounded-lg outline-none focus:border-red-500 font-mono text-sm" placeholder="0" value={expenses[expense.id]} onChange={(e) => setExpenses({ ...expenses, [expense.id]: e.target.value })} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100 mt-2">
                <div>
                  <label className="font-bold text-blue-900 text-sm">Comisión Conductor</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="number" className="w-12 p-1 text-center border border-blue-200 rounded text-xs outline-none" value={commissionPercent} onChange={e => setCommissionPercent(parseInt(e.target.value) || 0)} />
                    <span className="text-xs text-blue-700 font-bold">% del Ingreso</span>
                  </div>
                </div>
                <div className="font-black text-blue-800 text-lg">{formatMoney(driverCommission)}</div>
              </div>
            </div>
            <div className="bg-red-50 p-4 border-t border-red-100 flex justify-between items-center">
              <span className="font-black text-red-900">TOTAL GASTOS</span>
              <span className="text-xl font-black text-red-600">{formatMoney(totalExpenses)}</span>
            </div>
          </div>

          {/* Marcador Vueltas */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Marcador de Vueltas Registradas</h3>
            <div className="grid grid-cols-4 gap-2">
              {['v1', 'v2', 'v3', 'v4'].map((v, i) => {
                const prevKey = i === 0 ? null : `v${i}`;
                const isEnabled = i === 0 || laps[prevKey];
                const isActive = laps[v];
                return (
                  <button key={v} onClick={() => {
                    if (!isEnabled) return;
                    if (isActive) {
                      const newLaps = { ...laps };
                      ['v1', 'v2', 'v3', 'v4'].forEach((k, ki) => { if (ki >= i) newLaps[k] = false; });
                      setLaps(newLaps);
                    } else { setLaps({ ...laps, [v]: true }); }
                  }} className={`py-2 rounded-xl border-2 font-black transition-all ${isActive ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : isEnabled ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300' : 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'}`}>
                    {isActive && <CheckCircle2 size={16} className="inline mr-1" />}V{i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-4">
            <label className="font-bold text-yellow-900 text-sm flex items-center gap-2 mb-2"><MessageCircle size={16} /> Observaciones y Notas</label>
            <textarea className="w-full p-3 border border-yellow-300 rounded-xl outline-none focus:border-yellow-500 bg-white text-sm resize-none" rows="2" placeholder="Ej: Desvío en ruta por accidente, compra de aditivo, etc." value={observations} onChange={(e) => setObservations(e.target.value)}></textarea>
          </div>

          {/* Datos conductor */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><User size={14} /> Datos del Conductor y Vehículo <span className="text-emerald-500">(opcional)</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Nombre del Conductor" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" value={headerInfo.driverName} onChange={e => setHeaderInfo({ ...headerInfo, driverName: e.target.value })} />
              <input type="text" placeholder="RUT (Ej: 15.123.456-7)" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" value={headerInfo.driverRut} onChange={e => setHeaderInfo({ ...headerInfo, driverRut: e.target.value })} />
              <input type="text" placeholder="Empresa" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" value={headerInfo.company} onChange={e => setHeaderInfo({ ...headerInfo, company: e.target.value })} />
              <input type="text" placeholder="Recorrido" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" value={headerInfo.route} onChange={e => setHeaderInfo({ ...headerInfo, route: e.target.value })} />
              <input type="text" placeholder="Nº Patente" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" value={headerInfo.plate} onChange={e => setHeaderInfo({ ...headerInfo, plate: e.target.value })} />
              <input type="text" placeholder="Nº Máquina Interno" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" value={headerInfo.machineNum} onChange={e => setHeaderInfo({ ...headerInfo, machineNum: e.target.value })} />
            </div>
          </div>

          {/* Destino */}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
            <h3 className="font-bold text-blue-900 text-sm uppercase flex items-center gap-2"><Send size={16} /> Destino del Reporte</h3>
            <input type="tel" placeholder="WhatsApp de la Garita o Dueño (+569...)" className="w-full p-3 border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm" value={headerInfo.garitaPhone} onChange={e => setHeaderInfo({ ...headerInfo, garitaPhone: e.target.value })} />
          </div>

          {/* Saldo y Guardar */}
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">Saldo a Entregar</p>
              <div className={`text-4xl font-black ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(totalBalance)}</div>
            </div>
            <button onClick={saveLiquidation} className="w-full bg-emerald-500 text-slate-900 font-black py-4 text-lg hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2">
              <ShieldCheck size={22} /> GUARDAR LIQUIDACIÓN
            </button>
          </div>

          {/* Invitar */}
          <button onClick={shareApp} className="fixed bottom-6 right-6 px-6 py-3 rounded-full border border-green-500 text-green-400 bg-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.6)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)] transition-all z-50 font-bold flex items-center gap-2">
            ✨ Invita a un colega
          </button>
        </div>

        {/* Modal Éxito */}
        {showSuccessModal && currentSavedLiq && (
          <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
              <div className="bg-emerald-500 text-center p-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-3"><CheckCircle2 size={40} /></div>
                <h2 className="text-2xl font-black text-white">¡Liquidación Guardada!</h2>
                <p className="text-emerald-100 text-sm mt-1">{firebaseUser ? '✓ Guardada en la nube' : 'Guardada en tu dispositivo'}</p>
              </div>
              <div className="p-6 space-y-3">
                <a href={`https://wa.me/${(headerInfo.garitaPhone || '').replace(/\+/g, '')}?text=${encodeURIComponent(generateReportText(currentSavedLiq))}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#1ebd5a] text-lg shadow-md">
                  <MessageCircle size={24} /> Enviar por WhatsApp
                </a>
                <button onClick={() => generatePDF(currentSavedLiq)} disabled={isGeneratingPdf} className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 text-lg shadow-md disabled:opacity-60">
                  <Download size={24} /> {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                </button>
                {!firebaseUser && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-center text-slate-500 text-xs font-medium mb-3">💡 Crea una cuenta para guardar tu historial en la nube</p>
                    <button onClick={() => { setShowSuccessModal(false); setShowRegister(true); }} className="w-full bg-emerald-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-400 text-sm">
                      Crear cuenta gratuita
                    </button>
                  </div>
                )}
                <button onClick={resetAndExit} className="w-full text-slate-400 font-medium hover:text-slate-600 text-sm pt-1">
                  {firebaseUser ? 'Finalizar y volver al inicio' : 'Salir sin crear cuenta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showLogin && <ModalAuth modo="login" />}
        {showRegister && <ModalAuth modo="register" />}
      </div>
    );
  }

  // ===================== VISTA: ESTADÍSTICAS =====================
  if (currentView === 'stats') {
    const groupedStats = liquidations.reduce((acc, liq) => {
      const month = liq.monthYear || 'Mes Desconocido';
      if (!acc[month]) acc[month] = { driver: 0, company: 0, pax: 0, laps: 0 };
      acc[month].driver += liq.driverCommission || 0;
      acc[month].company += liq.totalBalance || 0;
      Object.keys(liq.tickets || {}).forEach(cat => {
        acc[month].pax += Math.max(0, (parseInt(liq.tickets[cat].end) || 0) - (parseInt(liq.tickets[cat].start) || 0));
      });
      acc[month].laps += Object.values(liq.laps || {}).filter(Boolean).length;
      return acc;
    }, {});
    const availableMonths = Object.keys(groupedStats);
    const currentStats = (availableMonths.length > 0 && groupedStats[selectedStatMonth]) ? groupedStats[selectedStatMonth] : { driver: 0, company: 0, pax: 0, laps: 0 };
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-bold">← Inicio</button>
            <h2 className="text-xl font-black flex items-center gap-2"><BarChart3 /> Mis Estadísticas</h2>
          </div>
          {!firebaseUser && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm text-center">💡 <button onClick={() => setShowLogin(true)} className="font-bold underline">Inicia sesión</button> para ver tu historial guardado en la nube</div>}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
            <Filter className="text-slate-400" size={20} />
            <select className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg cursor-pointer" value={selectedStatMonth} onChange={(e) => setSelectedStatMonth(e.target.value)}>
              {availableMonths.length === 0 && <option value="">Sin historial disponible</option>}
              {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center"><p className="text-slate-500 font-bold text-sm uppercase">Total Ganado (Conductor)</p><p className="text-4xl font-black text-blue-600 mt-2">{formatMoney(currentStats.driver)}</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center"><p className="text-slate-500 font-bold text-sm uppercase">Total Rendido (Empresa)</p><p className="text-4xl font-black text-emerald-600 mt-2">{formatMoney(currentStats.company)}</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center"><p className="text-slate-500 font-bold text-sm uppercase">Pasajeros Transportados</p><p className="text-3xl font-black text-slate-800">{currentStats.pax}</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center"><p className="text-slate-500 font-bold text-sm uppercase">Vueltas Realizadas</p><p className="text-3xl font-black text-slate-800">{currentStats.laps}</p></div>
          </div>
        </div>
        {showLogin && <ModalAuth modo="login" />}
        {showRegister && <ModalAuth modo="register" />}
      </div>
    );
  }

  // ===================== VISTA: REPORTES =====================
  if (currentView === 'reports') {
    const grouped = liquidations.reduce((acc, liq) => {
      const month = liq.monthYear || 'Mes Desconocido';
      if (!acc[month]) acc[month] = [];
      acc[month].push(liq);
      return acc;
    }, {});
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-bold">← Inicio</button>
            <h2 className="text-xl font-black flex items-center gap-2"><FileText /> Historial de Reportes</h2>
          </div>
          {!firebaseUser && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm text-center">💡 <button onClick={() => setShowLogin(true)} className="font-bold underline">Inicia sesión</button> para acceder a tu historial completo en la nube</div>}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200"><Calendar className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-500 font-medium">Aún no hay reportes guardados.</p></div>
          ) : (
            Object.keys(grouped).map(month => (
              <div key={month} className="mb-8">
                <h3 className="text-lg font-black text-slate-800 mb-4 bg-slate-200 px-4 py-2 rounded-lg inline-block uppercase tracking-wider">{month}</h3>
                <div className="space-y-3">
                  {grouped[month].map(liq => (
                    <div key={liq.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-800">{liq.date} - Maq: {liq.machineNum || 'N/A'}</p>
                        <p className="text-sm text-slate-500">Saldo: {formatMoney(liq.totalBalance)} | Pax: {Object.keys(liq.tickets || {}).reduce((a, c) => a + Math.max(0, (parseInt(liq.tickets[c].end) || 0) - (parseInt(liq.tickets[c].start) || 0)), 0)}</p>
                      </div>
                      <button onClick={() => handlePrintHistory(liq)} disabled={isGeneratingPdf} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-60">
                        <Download size={16} /> {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        {showLogin && <ModalAuth modo="login" />}
        {showRegister && <ModalAuth modo="register" />}
      </div>
    );
  }

  // ===================== VISTA: TÉRMINOS =====================
  if (currentView === 'terms') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2">← Volver al Inicio</button>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h1 className="text-3xl font-black text-slate-800 mb-6 flex items-center gap-3"><ShieldCheck className="text-emerald-500" size={32} /> Términos de Servicio</h1>
            <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
              <p>En <strong>RutaCuadrada</strong>, estamos comprometidos con la protección y el manejo responsable de la información de nuestros usuarios.</p>
              <h2 className="text-lg font-bold text-slate-800">1. Confidencialidad de los Datos</h2>
              <p>Los datos ingresados se almacenan de forma segura en Firebase (Google Cloud) y son accesibles solo por el usuario autenticado.</p>
              <h2 className="text-lg font-bold text-slate-800">2. Veracidad y Responsabilidad</h2>
              <p>La veracidad y legalidad de los datos ingresados son <strong>exclusiva responsabilidad del usuario</strong>.</p>
              <h2 className="text-lg font-bold text-slate-800">3. Uso del Servicio</h2>
              <p>RutaCuadrada es una plataforma gratuita sostenida por colaboraciones voluntarias de sus usuarios.</p>
              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="font-bold text-slate-700">¿Tienes dudas?</p>
                <p>Contáctanos: <a href="mailto:movingexpresschile@gmail.com" className="text-emerald-600 font-bold">movingexpresschile@gmail.com</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div>Cargando...</div>;
}
