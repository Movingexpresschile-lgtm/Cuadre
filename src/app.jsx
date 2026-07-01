import React, { useState, useEffect, useRef } from 'react';
import {
  BusFront, FileText, TrendingDown, ShieldCheck,
  CheckCircle2, ChevronRight, Lock,
  BarChart3, LogIn, User, Send, MessageCircle, Calendar, Filter, LogOut, Download
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [liquidations, setLiquidations] = useState([]);
  const [trialCount, setTrialCount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentSavedLiq, setCurrentSavedLiq] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // [FREEMIUM - TAREA 4] Estado del Modal Freemium
  const [showFreemiumModal, setShowFreemiumModal] = useState(false);

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  // Estadísticas Mensuales
  const [selectedStatMonth, setSelectedStatMonth] = useState('');

  const printRef = useRef(null);

  // ===================== CARGAR DATOS AL INICIO =====================
  useEffect(() => {
    const saved = localStorage.getItem('rutacuadrada_history');
    const trials = localStorage.getItem('rutacuadrada_trial_count');

    // Verificar sesión persistente
    const sessionExpiry = localStorage.getItem('rutacuadrada_session_expiry');
    const sessionEmail = localStorage.getItem('rutacuadrada_session_email');

    if (sessionEmail && sessionExpiry) {
      const now = new Date().getTime();
      if (now < parseInt(sessionExpiry)) {
        setUserEmail(sessionEmail);
        setIsLoggedIn(true);
        // Cargar datos del conductor para este usuario
        const driverData = localStorage.getItem(`rutacuadrada_driver_${sessionEmail}`);
        if (driverData) {
          const parsed = JSON.parse(driverData);
          setHeaderInfo(prev => ({ ...prev, ...parsed }));
        }
      } else {
        // Sesión expirada
        localStorage.removeItem('rutacuadrada_session_expiry');
        localStorage.removeItem('rutacuadrada_session_email');
      }
    } else {
      // Compatibilidad con sistema anterior
      const loggedUser = localStorage.getItem('rutacuadrada_user');
      if (loggedUser) {
        setUserEmail(loggedUser);
        setIsLoggedIn(true);
      }
    }

    if (saved) {
      const parsed = JSON.parse(saved);
      setLiquidations(parsed);
      if (parsed.length > 0 && !selectedStatMonth) {
        setSelectedStatMonth(parsed[0].monthYear || 'Mes Desconocido');
      }
    }
    if (trials) setTrialCount(parseInt(trials));

    // PWA: detectar visitas para mostrar banner de instalación
    const visitCount = parseInt(localStorage.getItem('rutacuadrada_visits') || '0') + 1;
    localStorage.setItem('rutacuadrada_visits', visitCount.toString());

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const installDismissed = localStorage.getItem('rutacuadrada_install_dismissed');

    if (!isInStandaloneMode && !installDismissed && visitCount >= 2) {
      if (isIos) {
        setShowIosBanner(true);
      }
    }
  }, []);

  // PWA: capturar evento beforeinstallprompt (Android/Desktop)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const installDismissed = localStorage.getItem('rutacuadrada_install_dismissed');
      const visitCount = parseInt(localStorage.getItem('rutacuadrada_visits') || '0');
      if (!installDismissed && visitCount >= 2) {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowInstallBanner(false);
    localStorage.setItem('rutacuadrada_install_dismissed', 'true');
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    setShowIosBanner(false);
    localStorage.setItem('rutacuadrada_install_dismissed', 'true');
  };

  // ===================== ESTADO DEL FORMULARIO =====================
  const [headerInfo, setHeaderInfo] = useState({
    date: new Date().toLocaleDateString('es-CL'),
    driverName: '',
    driverRut: '',
    company: '',
    route: '',
    plate: '',
    machineNum: '',
    garitaEmail: '',
    garitaPhone: ''
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

  const labels = { largo: 'Largo', medio: 'Medio', local: 'Local', estud: 'Estudiante', edad: '3ra Edad' };

  // ===================== CÁLCULOS EN VIVO =====================
  const getPassengers = (category, ticketData = tickets) => {
    const start = parseInt(ticketData[category].start) || 0;
    const end = parseInt(ticketData[category].end) || 0;
    return end - start > 0 ? end - start : 0;
  };

  const getAmount = (category, ticketData = tickets, prices = ticketPrices) => getPassengers(category, ticketData) * prices[category];

  const totalIncome = Object.keys(ticketPrices).reduce((acc, cat) => acc + getAmount(cat), 0);
  const driverCommission = totalIncome * (commissionPercent / 100);

  const getExpenseValue = (field, expData = expenses) => parseInt(expData[field]) || 0;

  const totalExpenses = getExpenseValue('planilla') + getExpenseValue('petroleo') + getExpenseValue('limpieza') + getExpenseValue('mantenciones') + getExpenseValue('otros') + driverCommission;
  const totalBalance = totalIncome - totalExpenses;

  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(amount));

  // ===================== LOGIN CON SESIÓN PERSISTENTE =====================
  const handleLogin = (e) => {
    e.preventDefault();
    if (userEmail.trim() !== '') {
      setIsLoggedIn(true);

      if (rememberMe) {
        const expiry = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 días
        localStorage.setItem('rutacuadrada_session_expiry', expiry.toString());
        localStorage.setItem('rutacuadrada_session_email', userEmail);
      } else {
        localStorage.setItem('rutacuadrada_user', userEmail);
      }

      // Cargar datos del conductor si existen
      const driverData = localStorage.getItem(`rutacuadrada_driver_${userEmail}`);
      if (driverData) {
        const parsed = JSON.parse(driverData);
        setHeaderInfo(prev => ({ ...prev, ...parsed }));
      }

      setShowLogin(false);
      if (currentView === 'landing') setCurrentView('setup');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setUserPassword('');
    localStorage.removeItem('rutacuadrada_user');
    localStorage.removeItem('rutacuadrada_session_expiry');
    localStorage.removeItem('rutacuadrada_session_email');
    setIsPanelOpen(false);
    setCurrentView('landing');
  };

  // Acceso 100% libre a la calculadora sin requerir login
  const handleStartApp = () => {
    setCurrentView('setup');
  };

  // Navegación libre: stats y reports accesibles sin login
  const handleNavigate = (view) => {
    setIsPanelOpen(false);
    setCurrentView(view);
  };

  // ===================== PRE-GUARDAR DATOS DEL CONDUCTOR =====================
  const saveDriverData = (email, data) => {
    const driverFields = {
      driverName: data.driverName,
      driverRut: data.driverRut,
      company: data.company,
      route: data.route,
      plate: data.plate,
      machineNum: data.machineNum,
      garitaPhone: data.garitaPhone,
    };
    localStorage.setItem(`rutacuadrada_driver_${email}`, JSON.stringify(driverFields));
  };

  const shareApp = () => {
    const text = "Estoy usando RutaCuadrada para el cuadre diario en segundos. Prueba Gratis Aquí: https://www.rutacuadrada.cl";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ===================== GUARDAR LIQUIDACIÓN =====================
  // Operación 100% libre: guarda la liquidación y abre el modal de éxito (compartir/PDF/crear cuenta)
  const saveLiquidation = () => {
    // Guardar datos del conductor para próximas sesiones
    if (userEmail) {
      saveDriverData(userEmail, headerInfo);
    }

    const newLiq = {
      id: Date.now(),
      ...headerInfo,
      tickets,
      ticketPrices,
      laps,
      expenses,
      observations,
      driverCommission,
      totalIncome,
      totalExpenses,
      totalBalance,
      monthYear: new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    };

    const newHistory = [newLiq, ...liquidations];
    setLiquidations(newHistory);
    localStorage.setItem('rutacuadrada_history', JSON.stringify(newHistory));

    const newCount = trialCount + 1;
    setTrialCount(newCount);
    localStorage.setItem('rutacuadrada_trial_count', newCount.toString());

    if (!selectedStatMonth) setSelectedStatMonth(newLiq.monthYear);

    setCurrentSavedLiq(newLiq);
    setShowSuccessModal(true);
    window.scrollTo(0, 0);
  };

  // ===================== RESETEAR Y VOLVER AL INICIO =====================
  const resetAndExit = () => {
    setTickets({
      largo: { start: '', end: '' }, medio: { start: '', end: '' },
      local: { start: '', end: '' }, estud: { start: '', end: '' },
      edad: { start: '', end: '' },
    });
    setLaps({ v1: false, v2: false, v3: false, v4: false });
    setExpenses({ planilla: '', petroleo: '', limpieza: '', mantenciones: '', otros: '' });
    setObservations('');
    setShowSuccessModal(false);
    setCurrentSavedLiq(null);
    setCurrentView('landing');
  };

  // ===================== GENERAR REPORTE WHATSAPP =====================
  const generateReportText = (data) => {
    let ticketDetails = '';
    Object.keys(data.tickets).forEach(cat => {
      const pax = getPassengers(cat, data.tickets);
      if (pax > 0) {
        const amount = getAmount(cat, data.tickets, data.ticketPrices);
        ticketDetails += `• ${labels[cat]} ($${data.ticketPrices[cat]}): In ${data.tickets[cat].start} - Fin ${data.tickets[cat].end} | Pax: ${pax} | Total: ${formatMoney(amount)}\n`;
      }
    });
    if (!ticketDetails) ticketDetails = 'Sin boletos registrados\n';
    return `*RutaCuadrada - Reporte de Liquidación*\nFecha: ${data.date}\nConductor: ${data.driverName}\nVehículo: ${data.plate} - Maq: ${data.machineNum}\n\n-- DETALLE DE INGRESOS --\n${ticketDetails}\n*INGRESO TOTAL: ${formatMoney(data.totalIncome)}*\n\n-- GASTOS --\nPlanilla: ${formatMoney(data.expenses.planilla || 0)}\nCombustible: ${formatMoney(data.expenses.petroleo || 0)}\nLimpieza: ${formatMoney(data.expenses.limpieza || 0)}\nMantenciones: ${formatMoney(data.expenses.mantenciones || 0)}\nOtros Gastos: ${formatMoney(data.expenses.otros || 0)}\nComisión Chofer: ${formatMoney(data.driverCommission || 0)}\n*TOTAL GASTOS: ${formatMoney(data.totalExpenses)}*\n\n-- SALDO A ENTREGAR --\n*${formatMoney(data.totalBalance)}*\n\nObservaciones: ${data.observations || 'Ninguna'}`;
  };

  // ===================== GENERAR PDF DESCARGABLE =====================
  const generatePDF = async (liq) => {
    setIsGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const margin = 15;
      let y = 20;

      // Encabezado
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LIQUIDACIÓN DE RUTA', pageW / 2, 13, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RutaCuadrada - Menos Cuentas. Más Control.', pageW / 2, 22, { align: 'center' });

      y = 40;
      doc.setTextColor(30, 30, 30);

      // Datos del conductor
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 5, pageW - margin * 2, 28, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL CONDUCTOR', margin + 2, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Conductor: ${liq.driverName || '-'}`, margin + 2, y + 9);
      doc.text(`RUT: ${liq.driverRut || '-'}`, margin + 2, y + 15);
      doc.text(`Empresa: ${liq.company || '-'}`, pageW / 2, y + 9);
      doc.text(`Recorrido: ${liq.route || '-'}`, pageW / 2, y + 15);
      doc.text(`Patente: ${liq.plate || '-'}`, margin + 2, y + 21);
      doc.text(`Máquina N°: ${liq.machineNum || '-'}`, pageW / 2, y + 21);
      doc.text(`Fecha: ${liq.date}`, pageW - margin - 2, y + 2, { align: 'right' });

      y += 35;

      // Tabla de boletos
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('BOLETO', margin + 2, y + 5);
      doc.text('INICIO', margin + 45, y + 5);
      doc.text('FIN', margin + 70, y + 5);
      doc.text('PAX', margin + 95, y + 5);
      doc.text('PRECIO', margin + 115, y + 5);
      doc.text('TOTAL', margin + 145, y + 5);
      y += 7;

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      let rowBg = false;
      Object.keys(liq.tickets).forEach(cat => {
        const pax = getPassengers(cat, liq.tickets);
        const amount = getAmount(cat, liq.tickets, liq.ticketPrices);
        if (rowBg) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, 7, 'F'); }
        rowBg = !rowBg;
        doc.setFontSize(8);
        doc.text(labels[cat], margin + 2, y + 5);
        doc.text(liq.tickets[cat].start || '-', margin + 45, y + 5);
        doc.text(liq.tickets[cat].end || '-', margin + 70, y + 5);
        doc.text(pax.toString(), margin + 95, y + 5);
        doc.text(`$${liq.ticketPrices[cat]}`, margin + 115, y + 5);
        doc.text(formatMoney(amount), pageW - margin - 2, y + 5, { align: 'right' });
        y += 7;
      });

      // Total ingresos
      doc.setFillColor(209, 250, 229);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(6, 78, 59);
      doc.text('TOTAL INGRESOS', margin + 2, y + 6);
      doc.text(formatMoney(liq.totalIncome), pageW - margin - 2, y + 6, { align: 'right' });
      y += 14;

      // Gastos
      doc.setTextColor(30, 30, 30);
      doc.setFillColor(254, 226, 226);
      doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(127, 29, 29);
      doc.text('GASTOS OPERATIVOS', margin + 2, y + 5);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const gastosRows = [
        ['Planilla', liq.expenses.planilla],
        ['Combustible', liq.expenses.petroleo],
        ['Limpieza', liq.expenses.limpieza],
        ['Mantenciones', liq.expenses.mantenciones],
        ['Otros Gastos', liq.expenses.otros],
        ['Comisión Conductor', liq.driverCommission],
      ];
      gastosRows.forEach(([label, val]) => {
        doc.text(label, margin + 2, y + 5);
        doc.text(formatMoney(parseInt(val) || 0), pageW - margin - 2, y + 5, { align: 'right' });
        y += 6;
      });

      // Total gastos
      doc.setFillColor(254, 226, 226);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(127, 29, 29);
      doc.text('TOTAL GASTOS', margin + 2, y + 6);
      doc.text(formatMoney(liq.totalExpenses), pageW - margin - 2, y + 6, { align: 'right' });
      y += 14;

      // Saldo final
      const saldoColor = liq.totalBalance >= 0 ? [6, 78, 59] : [127, 29, 29];
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, pageW - margin * 2, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('SALDO A ENTREGAR', margin + 4, y + 9);
      doc.setTextColor(...saldoColor);
      doc.setFontSize(13);
      doc.text(formatMoney(liq.totalBalance), pageW - margin - 2, y + 9, { align: 'right' });
      y += 20;

      // Observaciones
      if (liq.observations) {
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones:', margin, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(liq.observations, pageW - margin * 2);
        doc.text(lines, margin, y + 6);
        y += 6 + lines.length * 5;
      }

      // Pie de página
      y = 285;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Generado por RutaCuadrada (rutacuadrada.cl) - Menos Cuentas. Más Control.', pageW / 2, y, { align: 'center' });

      const fileName = `RutaCuadrada_${liq.date.replace(/\//g, '-')}_Maq${liq.machineNum || '0'}.pdf`;

      // Intentar compartir en móvil, si no descargar
      if (navigator.share && navigator.canShare) {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Liquidación RutaCuadrada' });
        } else {
          doc.save(fileName);
        }
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    }
    setIsGeneratingPdf(false);
  };

  const handlePrintHistory = (liq) => {
    setCurrentSavedLiq(liq);
    setTimeout(() => generatePDF(liq), 300);
  };

  // ===================== VISTAS =====================

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans print:hidden flex flex-col">
        {/* Nav */}
        <nav className="bg-slate-900 text-white p-4 flex justify-between items-center px-4 md:px-12 z-50 sticky top-0">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide flex items-center gap-2"><BusFront className="text-emerald-400" /> RutaCuadrada</span>
            <span className="text-[11px] italic text-emerald-400 font-light tracking-wider">Menos Cuentas. Más Control.</span>
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <a href="/articulos.html" className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-400 transition-colors">
                Artículos
              </a>
              <div className="relative">
                <button
                  onClick={() => setIsPanelOpen(!isPanelOpen)}
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-700 transition-colors"
                >
                  <User size={16} /> Mi Panel
                </button>
                {isPanelOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 border border-slate-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 mb-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sesión Activa</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{userEmail}</p>
                    </div>
                    <button onClick={() => handleNavigate('stats')} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2">
                      <BarChart3 size={16} /> Mis Estadísticas
                    </button>
                    <button onClick={() => handleNavigate('reports')} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2">
                      <FileText size={16} /> Mis Reportes PDF
                    </button>
                    <div className="border-t border-slate-100 mt-1"></div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <a href="/articulos.html" className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-400 transition-colors">
                Artículos
              </a>
              <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-400"><LogIn size={18} /> Iniciar Sesión</button>
            </div>
          )}
        </nav>

        {/* Hero */}
        <header className="bg-slate-900 text-white pt-16 pb-24 px-4 text-center overflow-hidden relative flex-grow flex flex-col justify-center">
          <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1544620347-c4fd6a3d5957?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center" />
          {/* Patrón sutil de símbolos matemáticos y datos */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Ctext x='20' y='60' font-family='Georgia,serif' font-size='48' fill='%2334d399'%3E%E2%88%AB%3C/text%3E%3Ctext x='160' y='50' font-family='Georgia,serif' font-size='40' fill='%2334d399'%3E%CE%A3%3C/text%3E%3Ctext x='280' y='70' font-family='Georgia,serif' font-size='44' fill='%2334d399'%3E%CF%80%3C/text%3E%3Ctext x='60' y='160' font-family='Arial' font-size='42' fill='%2334d399'%3E=%3C/text%3E%3Ctext x='220' y='170' font-family='Arial' font-size='38' fill='%2334d399'%3E%25%3C/text%3E%3Cpolyline points='40,260 80,230 120,250 160,200 200,220 240,180 280,210 320,160' fill='none' stroke='%2334d399' stroke-width='3'/%3E%3Ctext x='30' y='340' font-family='Georgia,serif' font-size='40' fill='%2334d399'%3E%CF%80%3C/text%3E%3Ctext x='150' y='330' font-family='Arial' font-size='40' fill='%2334d399'%3E%25%3C/text%3E%3Ctext x='270' y='350' font-family='Georgia,serif' font-size='44' fill='%2334d399'%3E%E2%88%AB%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '400px 400px',
            }}
          />
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
              <button
                onClick={() => window.open('https://www.flow.cl/btn.php?token=qf8691478077e8d649aae7f380c116e87afd54fd', '_blank')}
                className="inline-flex flex-col items-center bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 hover:bg-emerald-500 transition-all border border-emerald-400 cursor-pointer">
                <span className="text-sm md:text-base tracking-wide">💚 Funcionamos gracias a tu colaboración — Apóyanos aquí</span>
              </button>
            </div>
          </div>
        </header>

        <footer className="bg-slate-950 text-slate-400 p-8 text-center text-xs space-y-2 relative z-10">
          <p className="font-bold text-sm text-slate-300">RutaCuadrada - Menos Cuentas. Más Control.</p>
          <p>© 2026 RutaCuadrada. Todos los derechos reservados.</p>
          <p>Soporte y Ventas: <a href="mailto:movingexpresschile@gmail.com" className="text-emerald-500">movingexpresschile@gmail.com</a></p>
          <div className="pt-4 border-t border-slate-800 flex justify-center gap-4 flex-wrap">
            <button onClick={() => setCurrentView('terms')} className="hover:text-slate-200 cursor-pointer transition-colors">Términos de Servicio</button>
            <span>|</span>
            <a href="/nuestra-razon.html" className="hover:text-slate-200 cursor-pointer transition-colors">Nuestra Razón</a>
            <span>|</span>
            <a href="/articulos.html" className="hover:text-slate-200 cursor-pointer transition-colors">Artículos</a>
          </div>
        </footer>

        {/* Banner PWA Android/Desktop */}
        {showInstallBanner && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-emerald-500 p-4 flex items-center justify-between gap-3 z-[200] shadow-2xl">
            <div className="flex items-center gap-3">
              <BusFront className="text-emerald-400 shrink-0" size={28} />
              <div>
                <p className="text-white font-bold text-sm">Instala RutaCuadrada</p>
                <p className="text-slate-400 text-xs">Agrégala a tu pantalla de inicio</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleInstallApp} className="bg-emerald-500 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm hover:bg-emerald-400">
                Instalar
              </button>
              <button onClick={dismissInstallBanner} className="text-slate-400 hover:text-white px-2 py-2 text-lg">✕</button>
            </div>
          </div>
        )}

        {/* Banner PWA iOS */}
        {showIosBanner && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-emerald-500 p-4 z-[200] shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <p className="text-white font-bold text-sm flex items-center gap-2"><BusFront className="text-emerald-400" size={20} /> Instala RutaCuadrada en tu iPhone</p>
              <button onClick={dismissInstallBanner} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <span>Toca el botón <strong className="text-white">Compartir</strong> (⬆️) en la barra de Safari</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <span>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <span>Toca <strong className="text-white">Agregar</strong> para confirmar</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Login */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl relative">
              <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">✕</button>
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Crea tu cuenta</h2>
              <p className="text-slate-500 text-sm mb-6">Ingresa tu correo para guardar tu historial y acceder a tus 3 pruebas gratuitas.</p>
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  className="w-full p-3 border-2 border-slate-200 rounded-xl mb-3 focus:border-emerald-500 outline-none transition-colors text-center font-medium"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Contraseña (mínimo 4 caracteres)"
                  className="w-full p-3 border-2 border-slate-200 rounded-xl mb-4 focus:border-emerald-500 outline-none transition-colors text-center font-medium"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                />
                <div className="flex items-center justify-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer">Recordar sesión por 30 días</label>
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-400">
                  Comenzar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Paywall CyberDay */}
        {showPaywall && (
          <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
              <div className="bg-red-600 text-white p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <h2 className="text-3xl font-black relative z-10">¡OFERTA CYBERDAY!</h2>
                <p className="font-medium relative z-10">75% DE DESCUENTO</p>
              </div>
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-800">
                  <Lock size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Tu prueba gratuita ha finalizado</h3>
                  <p className="text-slate-600 mt-2 text-sm">Has utilizado tus 3 liquidaciones de prueba. Activa tu licencia de por vida ahora y no pagues mensualidades.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-slate-400 line-through text-sm">Precio Normal: $49.990</p>
                  <p className="text-4xl font-black text-emerald-600 my-1">$2.000</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pago Único - Licencia Permanente</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => window.open('https://www.flow.cl/btn.php?token=qf8691478077e8d649aae7f380c116e87afd54fd', '_blank')}
                    className="block w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    Comprar Licencia Ahora
                  </button>
                  <button onClick={() => setShowPaywall(false)} className="text-slate-400 text-sm font-medium hover:text-slate-600">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== SETUP (Fase 1) =====================
  if (currentView === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:hidden">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-medium">← Volver al Inicio</button>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full">Paso 1 de 2</span>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
              <BusFront className="text-emerald-500" /> Iniciar Cálculo
            </h2>
            <p className="text-slate-500 text-sm mb-8">Ingresa los valores y los números de tus boletos para comenzar.</p>

            <div className="space-y-6">

              {/* Valores de Boletos */}
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

              {/* Boletos Cortados — Fase 2 */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-3 font-bold flex justify-between items-center">
                  <span className="flex items-center gap-2"><FileText size={18} /> Boletos Cortados</span>
                  <span className="text-xs bg-emerald-500 text-slate-900 px-2 py-1 rounded font-black">FASE 2</span>
                </div>
                <div className="p-4 space-y-4">
                  {Object.keys(ticketPrices).map((cat) => (
                    <div key={cat} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="col-span-12 sm:col-span-2 font-bold text-slate-700">{labels[cat]}</div>
                      <div className="col-span-4 sm:col-span-3">
                        <input type="number" placeholder="Inicio" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" value={tickets[cat].start} onChange={(e) => setTickets({ ...tickets, [cat]: { ...tickets[cat], start: e.target.value } })} />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <input type="number" placeholder="Fin" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" value={tickets[cat].end} onChange={(e) => setTickets({ ...tickets, [cat]: { ...tickets[cat], end: e.target.value } })} />
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-center bg-slate-200 rounded-lg py-1.5 font-bold text-slate-600 text-sm">
                        {getPassengers(cat)} <span className="text-[10px] uppercase block -mt-1">Pax</span>
                      </div>
                      <div className="col-span-12 sm:col-span-2 text-right font-black text-slate-800 flex justify-between sm:block items-center">
                        <span className="text-xs text-slate-400 sm:hidden">Total:</span>
                        <span>{formatMoney(getAmount(cat))}</span>
                      </div>
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

  // ===================== DAILY (Fase 2 - Rendición) =====================
  if (currentView === 'daily') {
    return (
      <div className="min-h-screen bg-slate-100 p-2 md:p-6 font-sans print:bg-white print:p-0">

        {/* Vista Imprimible */}
        <div className="hidden print:block w-full max-w-3xl mx-auto p-8 font-sans">
          {currentSavedLiq && (
            <div className="space-y-6">
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-3xl font-black">LIQUIDACIÓN DE RUTA</h1>
                <p className="text-lg text-slate-600 mt-1">{currentSavedLiq.company || 'Empresa de Transporte'} - {currentSavedLiq.route}</p>
                <p className="text-sm text-slate-500 font-mono mt-1">ID: #{currentSavedLiq.id} | Fecha: {currentSavedLiq.date}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-200 pb-4">
                <div><span className="font-bold">Conductor:</span> {currentSavedLiq.driverName}</div>
                <div><span className="font-bold">RUT:</span> {currentSavedLiq.driverRut}</div>
                <div><span className="font-bold">Vehículo PPU:</span> {currentSavedLiq.plate}</div>
                <div><span className="font-bold">Máquina Nº:</span> {currentSavedLiq.machineNum}</div>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="text-left py-2 px-2">Boleto</th>
                    <th className="text-right py-2 px-2">Inicio</th>
                    <th className="text-right py-2 px-2">Fin</th>
                    <th className="text-center py-2 px-2">Pax</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(currentSavedLiq.tickets).map(cat => (
                    <tr key={cat} className="border-b border-slate-100">
                      <td className="py-2 px-2 font-medium">{labels[cat]} <span className="text-xs text-slate-500">(${currentSavedLiq.ticketPrices[cat]})</span></td>
                      <td className="text-right py-2 px-2 font-mono">{currentSavedLiq.tickets[cat].start || '-'}</td>
                      <td className="text-right py-2 px-2 font-mono">{currentSavedLiq.tickets[cat].end || '-'}</td>
                      <td className="text-center py-2 px-2 font-bold">{getPassengers(cat, currentSavedLiq.tickets)}</td>
                      <td className="text-right py-2 px-2">{formatMoney(getAmount(cat, currentSavedLiq.tickets, currentSavedLiq.ticketPrices))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center py-2 border-b-2 border-slate-800">
                <span className="font-black text-lg">TOTAL INGRESOS</span>
                <span className="font-black text-xl">{formatMoney(currentSavedLiq.totalIncome)}</span>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm mt-6">
                <div>
                  <h3 className="font-bold border-b border-slate-300 mb-2 pb-1">Vueltas Registradas</h3>
                  <div className="flex gap-2">
                    {['v1', 'v2', 'v3', 'v4'].map((v, i) => (
                      <span key={v} className={`px-2 py-1 border rounded ${currentSavedLiq.laps[v] ? 'bg-slate-200 font-bold' : 'text-slate-300'}`}>
                        V{i + 1} {currentSavedLiq.laps[v] ? '✓' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold border-b border-slate-300 mb-2 pb-1">Desglose de Gastos</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Planilla:</span> <span>{formatMoney(currentSavedLiq.expenses.planilla)}</span></div>
                    <div className="flex justify-between"><span>Combustible:</span> <span>{formatMoney(currentSavedLiq.expenses.petroleo)}</span></div>
                    <div className="flex justify-between"><span>Limpieza:</span> <span>{formatMoney(currentSavedLiq.expenses.limpieza)}</span></div>
                    <div className="flex justify-between"><span>Mantenciones:</span> <span>{formatMoney(currentSavedLiq.expenses.mantenciones)}</span></div>
                    <div className="flex justify-between"><span>Otros Gastos:</span> <span>{formatMoney(currentSavedLiq.expenses.otros)}</span></div>
                    <div className="flex justify-between font-bold"><span>Comisión Conductor:</span> <span>{formatMoney(currentSavedLiq.driverCommission)}</span></div>
                    <div className="flex justify-between font-black border-t border-slate-300 pt-1 mt-1"><span>Total Gastos:</span> <span>{formatMoney(currentSavedLiq.totalExpenses)}</span></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 p-4 rounded mt-6 flex justify-between items-center">
                <span className="font-black text-2xl uppercase">Saldo Final a Entregar</span>
                <span className="font-black text-3xl">{formatMoney(currentSavedLiq.totalBalance)}</span>
              </div>

              {currentSavedLiq.observations && (
                <div className="mt-6 border border-slate-300 p-4 rounded text-sm">
                  <span className="font-bold block mb-1">Observaciones / Notas:</span>
                  <p>{currentSavedLiq.observations}</p>
                </div>
              )}

              <div className="text-center text-xs text-slate-400 mt-12">
                Generado por RutaCuadrada (rutacuadrada.cl) - Menos Cuentas. Más Control.
              </div>
            </div>
          )}
        </div>

        {/* Interfaz Principal */}
        <div className="print:hidden max-w-3xl mx-auto space-y-4 relative pb-20">

          <div className="flex justify-between items-center px-2">
            <button onClick={() => setCurrentView('setup')} className="text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center gap-1">← Atrás</button>
            <span className="text-xs font-bold text-slate-400">{headerInfo.date}</span>
          </div>

          {/* BLOQUE 1: Gastos Operativos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-red-500 text-white p-3 font-bold flex items-center gap-2">
              <TrendingDown size={18} /> Gastos Operativos
            </div>
            <div className="p-4 space-y-3">
              {[
                { id: 'planilla', label: 'Planilla' },
                { id: 'petroleo', label: 'Combustible' },
                { id: 'limpieza', label: 'Servicio de Limpieza' },
                { id: 'mantenciones', label: 'Mantenciones' },
                { id: 'otros', label: 'Otros Gastos' }
              ].map(expense => (
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
                  <label className="font-bold text-blue-900 text-sm flex items-center gap-2">Comisión Conductor</label>
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

          {/* BLOQUE 2: Marcador de Vueltas */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Marcador de Vueltas Registradas</h3>
            <div className="grid grid-cols-4 gap-2">
              {['v1', 'v2', 'v3', 'v4'].map((v, i) => {
                const prevKey = i === 0 ? null : `v${i}`;
                const isEnabled = i === 0 || laps[prevKey];
                const isActive = laps[v];
                return (
                  <button
                    key={v}
                    onClick={() => {
                      if (!isEnabled) return;
                      // Al desactivar una vuelta, desactiva también las siguientes
                      if (isActive) {
                        const newLaps = { ...laps };
                        ['v1','v2','v3','v4'].forEach((k, ki) => { if (ki >= i) newLaps[k] = false; });
                        setLaps(newLaps);
                      } else {
                        setLaps({ ...laps, [v]: true });
                      }
                    }}
                    className={`py-2 rounded-xl border-2 font-black transition-all
                      ${isActive ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                        : isEnabled ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300'
                        : 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'}`}
                  >
                    {isActive && <CheckCircle2 size={16} className="inline mr-1" />}
                    V{i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BLOQUE 3: Observaciones */}
          <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-4">
            <label className="font-bold text-yellow-900 text-sm flex items-center gap-2 mb-2"><MessageCircle size={16} /> Observaciones y Notas</label>
            <textarea
              className="w-full p-3 border border-yellow-300 rounded-xl outline-none focus:border-yellow-500 bg-white text-sm resize-none"
              rows="2"
              placeholder="Ej: Desvío en ruta por accidente, compra de aditivo, etc."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            ></textarea>
          </div>

          {/* BLOQUE 4: Datos del Conductor y Vehículo */}
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

          {/* BLOQUE 5: Destino del Reporte */}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
            <h3 className="font-bold text-blue-900 text-sm uppercase flex items-center gap-2"><Send size={16} /> Destino del Reporte</h3>
            <input
              type="tel"
              placeholder="WhatsApp de la Garita o Dueño (+569...)"
              className="w-full p-3 border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm"
              value={headerInfo.garitaPhone}
              onChange={e => setHeaderInfo({ ...headerInfo, garitaPhone: e.target.value })}
            />
          </div>

          {/* BLOQUE 6: Saldo y Guardar */}
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">Saldo a Entregar</p>
              <div className={`text-4xl font-black ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMoney(totalBalance)}
              </div>
            </div>
            <button onClick={saveLiquidation} className="w-full bg-emerald-500 text-slate-900 font-black py-4 text-lg hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2">
              <ShieldCheck size={22} /> GUARDAR LIQUIDACIÓN
            </button>
          </div>

          {/* BOTON NEON - WHATSAPP */}
          <button
            onClick={shareApp}
            className="fixed bottom-6 right-6 px-6 py-3 rounded-full border border-green-500 text-green-400 bg-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.6)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)] transition-all z-50 font-bold flex items-center gap-2"
          >
            ✨ Invita Gratis a un colega
          </button>
        </div>

        {/* MODAL DE ÉXITO */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-[100] backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
              <div className="bg-emerald-500 text-center p-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-3 shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">¡Cálculo Guardado!</h2>
                <p className="text-emerald-100 text-sm mt-1">El reporte está seguro en tu historial.</p>
              </div>

              <div className="p-6 space-y-3">
                <p className="text-center text-slate-600 text-sm font-medium mb-2">Envía o descarga tu reporte:</p>

                <a
                  href={`https://wa.me/${headerInfo.garitaPhone.replace(/\+/g, '')}?text=${encodeURIComponent(generateReportText(currentSavedLiq))}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#1ebd5a] text-lg shadow-md transition-transform hover:scale-105"
                >
                  <MessageCircle size={24} /> Enviar por WhatsApp
                </a>

                <button
                  onClick={() => currentSavedLiq && generatePDF(currentSavedLiq)}
                  disabled={isGeneratingPdf}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 text-lg shadow-md transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download size={24} /> {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                </button>

                <button
                  onClick={resetAndExit}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 text-base shadow-md transition-colors"
                >
                  ✓ Finalizar y Volver al Inicio
                </button>

                <button
                  onClick={() => { setShowSuccessModal(false); setCurrentView('landing'); }}
                  className="w-full pt-2 text-slate-400 font-bold hover:text-slate-600 text-sm underline"
                >
                  Volver al Inicio
                </button>
              </div>
            </div>
          </div>
        )}
        {/* [FREEMIUM - TAREA 4 - INICIO] Modal Freemium Paywall */}
        {showFreemiumModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
              <div className="bg-slate-900 text-white p-6 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={36} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">¡Cálculo Completado!</h2>
                <p className="text-slate-400 text-sm mt-1">Tu ruta está lista para reportar</p>
              </div>
              <div className="p-6 space-y-4 text-center">
                <p className="text-slate-700 text-sm leading-relaxed">
                  Has calculado tu ruta con éxito. Para generar, descargar y compartir tu reporte en PDF, adquiere tu licencia completa.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-slate-400 line-through text-sm">Precio Normal: $49.990</p>
                  <p className="text-4xl font-black text-emerald-600 my-1">$2.000</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pago Único · Licencia Permanente</p>
                </div>
                <button
                  onClick={() => window.open('https://www.flow.cl/btn.php?token=qf8691478077e8d649aae7f380c116e87afd54fd', '_blank')}
                  className="block w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Adquiere tu licencia completa en Oferta
                </button>
                <button
                  onClick={() => setShowFreemiumModal(false)}
                  className="w-full text-slate-400 text-sm font-medium hover:text-slate-600 pt-1"
                >
                  Volver a la calculadora
                </button>
              </div>
            </div>
          </div>
        )}
        {/* [FREEMIUM - TAREA 4 - FIN] */}
      </div>
    );
  }

  // ===================== ESTADÍSTICAS POR MES =====================
  if (currentView === 'stats') {
    const groupedStats = liquidations.reduce((acc, liq) => {
      const month = liq.monthYear || 'Mes Desconocido';
      if (!acc[month]) acc[month] = { driver: 0, company: 0, pax: 0, laps: 0 };
      acc[month].driver += liq.driverCommission || 0;
      acc[month].company += liq.totalBalance || 0;
      Object.keys(liq.tickets || {}).forEach(cat => {
        const start = parseInt(liq.tickets[cat].start) || 0;
        const end = parseInt(liq.tickets[cat].end) || 0;
        acc[month].pax += (end - start > 0 ? end - start : 0);
      });
      acc[month].laps += Object.values(liq.laps || {}).filter(Boolean).length;
      return acc;
    }, {});

    const availableMonths = Object.keys(groupedStats);
    const currentStats = availableMonths.length > 0 && groupedStats[selectedStatMonth]
      ? groupedStats[selectedStatMonth]
      : { driver: 0, company: 0, pax: 0, laps: 0 };

    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:hidden">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-bold">← Inicio</button>
            <h2 className="text-xl font-black flex items-center gap-2"><BarChart3 /> Mis Estadísticas</h2>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
            <Filter className="text-slate-400" size={20} />
            <select
              className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg cursor-pointer"
              value={selectedStatMonth}
              onChange={(e) => setSelectedStatMonth(e.target.value)}
            >
              {availableMonths.length === 0 && <option value="">Sin historial disponible</option>}
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <p className="text-slate-500 font-bold text-sm uppercase">Total Ganado (Conductor)</p>
              <p className="text-4xl font-black text-blue-600 mt-2">{formatMoney(currentStats.driver)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <p className="text-slate-500 font-bold text-sm uppercase">Total Rendido (Empresa)</p>
              <p className="text-4xl font-black text-emerald-600 mt-2">{formatMoney(currentStats.company)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
              <UsersIcon />
              <p className="text-slate-500 font-bold text-sm uppercase mt-2">Pasajeros Transportados</p>
              <p className="text-3xl font-black text-slate-800">{currentStats.pax}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
              <RotateCcwIcon />
              <p className="text-slate-500 font-bold text-sm uppercase mt-2">Vueltas Realizadas</p>
              <p className="text-3xl font-black text-slate-800">{currentStats.laps}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== REPORTES (Historial) =====================
  if (currentView === 'reports') {
    const grouped = liquidations.reduce((acc, liq) => {
      const month = liq.monthYear || 'Mes Desconocido';
      if (!acc[month]) acc[month] = [];
      acc[month].push(liq);
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:hidden">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-bold">← Inicio</button>
            <h2 className="text-xl font-black flex items-center gap-2"><FileText /> Historial de Reportes</h2>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
              <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium">Aún no hay reportes guardados.</p>
            </div>
          ) : (
            Object.keys(grouped).map(month => (
              <div key={month} className="mb-8">
                <h3 className="text-lg font-black text-slate-800 mb-4 bg-slate-200 px-4 py-2 rounded-lg inline-block uppercase tracking-wider">{month}</h3>
                <div className="space-y-3">
                  {grouped[month].map(liq => (
                    <div key={liq.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-800">{liq.date} - Maq: {liq.machineNum || 'N/A'}</p>
                        <p className="text-sm text-slate-500">Saldo: {formatMoney(liq.totalBalance)} | Pax: {Object.keys(liq.tickets).reduce((a, c) => a + getPassengers(c, liq.tickets), 0)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintHistory(liq)}
                          disabled={isGeneratingPdf}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Download size={16} /> {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ===================== VISTAS LEGALES =====================
  if (currentView === 'privacy' || currentView === 'terms') {
    const isPrivacy = currentView === 'privacy';
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:hidden">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setCurrentView('landing')} className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2">← Volver al Inicio</button>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h1 className="text-3xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <ShieldCheck className="text-emerald-500" size={32} />
              {isPrivacy ? 'Política de Privacidad' : 'Términos de Servicio'}
            </h1>

            <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
              <p>En <strong>RutaCuadrada</strong>, estamos comprometidos con la protección y el manejo responsable de la información generada por nuestros usuarios (conductores y empresas de transporte).</p>
              <h2 className="text-lg font-bold text-slate-800">1. Confidencialidad de los Datos</h2>
              <p>Los datos ingresados en la plataforma son estrictamente confidenciales y se almacenan localmente en el dispositivo del usuario.</p>
              <h2 className="text-lg font-bold text-slate-800">2. Veracidad y Responsabilidad</h2>
              <p>La veracidad y legalidad de los datos ingresados en los cálculos son <strong>exclusiva responsabilidad del usuario</strong> que opera la aplicación.</p>
              <h2 className="text-lg font-bold text-slate-800">3. Uso del Servicio</h2>
              <p>El uso de la prueba gratuita está limitado a un máximo de 3 liquidaciones guardadas.</p>

              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="font-bold text-slate-700">¿Tienes dudas legales o comerciales?</p>
                <p>Contáctanos en: <a href="mailto:movingexpresschile@gmail.com" className="text-emerald-600 font-bold">movingexpresschile@gmail.com</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div>Cargando...</div>;
}

const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const RotateCcwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>;
