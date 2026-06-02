import React, { useState, useEffect } from 'react';
import { 
  BusFront, FileText, TrendingDown, ShieldCheck, 
  CheckCircle2, ChevronRight, Lock, 
  BarChart3, LogIn, User, Send, MessageCircle, Calendar, Filter, LogOut
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); 
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const [liquidations, setLiquidations] = useState([]);
  const [trialCount, setTrialCount] = useState(0); 
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentSavedLiq, setCurrentSavedLiq] = useState(null);

  // Estadísticas Mensuales
  const [selectedStatMonth, setSelectedStatMonth] = useState('');

  // Cargar datos guardados en el dispositivo
  useEffect(() => {
    const saved = localStorage.getItem('rutacuadrada_history');
    const trials = localStorage.getItem('rutacuadrada_trial_count');
    const loggedUser = localStorage.getItem('rutacuadrada_user');
    
    if (saved) {
      const parsed = JSON.parse(saved);
      setLiquidations(parsed);
      
      if (parsed.length > 0 && !selectedStatMonth) {
        setSelectedStatMonth(parsed[0].monthYear || 'Mes Desconocido');
      }
    }
    if (trials) setTrialCount(parseInt(trials));
    if (loggedUser) {
      setUserEmail(loggedUser);
      setIsLoggedIn(true);
    }
  }, []);

  // Estado del Formulario
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
    edad:  { start: '', end: '' },
  });

  const [laps, setLaps] = useState({ v1: false, v2: false, v3: false, v4: false });
  const [expenses, setExpenses] = useState({ planilla: '', petroleo: '', limpieza: '', mantenciones: '', otros: '' });
  const [observations, setObservations] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(20);

  const labels = { largo: 'Largo', medio: 'Medio', local: 'Local', estud: 'Estudiante', edad: '3ra Edad' };

  // Cálculos en vivo
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

  // Navegación y Flujo de Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (userEmail.trim() !== '') {
      setIsLoggedIn(true);
      localStorage.setItem('rutacuadrada_user', userEmail);
      setShowLogin(false);
      if (currentView === 'landing') setCurrentView('setup');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    localStorage.removeItem('rutacuadrada_user');
    setIsPanelOpen(false);
    setCurrentView('landing');
  };

  const handleStartApp = () => {
    if (!isLoggedIn) { 
      setShowLogin(true); 
      return; 
    }
    if (trialCount >= 3) { 
      setShowPaywall(true); 
    } else { 
      setCurrentView('setup'); 
    }
  };

  const handleNavigate = (view) => {
    setIsPanelOpen(false); // Cierra el menú si estaba abierto
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setCurrentView(view);
  };

  // Botón Neón - Compartir directo por WhatsApp
  const shareApp = () => {
    const text = "Estoy usando RutaCuadrada para el cuadre diario en segundos. Prueba Gratis Aquí: https://www.rutacuadrada.cl";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Guardar Liquidación
  const saveLiquidation = () => {
    if (trialCount >= 3) {
      setShowPaywall(true);
      return;
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

    return `*RutaCuadrada - Reporte de Liquidación*\nFecha: ${data.date}\nConductor: ${data.driverName}\nVehículo: ${data.plate} - Maq: ${data.machineNum}\n\n-- DETALLE DE INGRESOS --\n${ticketDetails}\n*INGRESO TOTAL: ${formatMoney(data.totalIncome)}*\n\n-- GASTOS --\nPlanilla: ${formatMoney(data.expenses.planilla || 0)}\nPetróleo: ${formatMoney(data.expenses.petroleo || 0)}\nLimpieza: ${formatMoney(data.expenses.limpieza || 0)}\nMantenciones: ${formatMoney(data.expenses.mantenciones || 0)}\nOtros Gastos: ${formatMoney(data.expenses.otros || 0)}\nComisión Chofer: ${formatMoney(data.driverCommission || 0)}\n*TOTAL GASTOS: ${formatMoney(data.totalExpenses)}*\n\n-- SALDO A ENTREGAR --\n*${formatMoney(data.totalBalance)}*\n\nObservaciones: ${data.observations || 'Ninguna'}`;
  };

  // ===================== VISTAS =====================

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans print:hidden flex flex-col">
        {/* Nav */}
        <nav className="bg-slate-900 text-white p-4 flex justify-between items-center px-4 md:px-12 z-50 sticky top-0">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide flex items-center gap-2"><BusFront className="text-emerald-400"/> RutaCuadrada</span>
            <span className="text-[11px] italic text-emerald-400 font-light tracking-wider">Menos Cuentas. Más Control.</span>
          </div>
          {isLoggedIn ? (
            <div className="relative">
              <button 
                onClick={() => setIsPanelOpen(!isPanelOpen)} 
                className="flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-700 transition-colors"
              >
                <User size={16} /> Mi Panel
              </button>
              {/* Menú Desplegable del Panel */}
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
          ) : (
            <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-400"><LogIn size={18} /> Iniciar Sesión</button>
          )}
        </nav>

        {/* Hero con Imagen Mejorada */}
        <header className="bg-slate-900 text-white pt-16 pb-24 px-4 text-center overflow-hidden relative flex-grow flex flex-col justify-center">
          {/* Fondo escénico: Ruta montañosa y gradiente suave */}
          <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1464039397811-476f652a343b?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/80 to-slate-900" />
          
          <div className="max-w-4xl mx-auto space-y-8 relative z-10">
            
            {/* Botón CyberDay Gigante y de Dos Líneas */}
            <div className="flex justify-center">
              <a href="https://www.flow.cl/btn.php?token=TULINKAQUI" target="_blank" rel="noopener noreferrer" 
                 className="inline-flex flex-col items-center bg-red-600 text-white font-black px-8 py-3 rounded-2xl animate-pulse shadow-[0_0_25px_rgba(220,38,38,0.7)] hover:scale-105 transition-transform border border-red-400">
                <span className="text-sm md:text-lg tracking-wide">⚡ OFERTA CYBER: 75% DESCUENTO ⚡</span>
                <span className="text-xs md:text-sm font-medium mt-1 text-red-100">Adquiere tu licencia de por vida</span>
              </a>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mt-6 text-white drop-shadow-md">
              Cuadra tu bus,<br/>
              <span className="text-emerald-400 block mt-2">Sin Errores.</span>
            </h1>
            
            {/* Botón Principal Permanente */}
            <div className="mt-8">
              <button onClick={handleStartApp} className="bg-emerald-500 text-slate-900 font-black text-xl py-5 px-12 rounded-full hover:bg-emerald-400 transition-transform transform hover:scale-105 shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
                Iniciar mis cálculos <ChevronRight className="inline" size={24} />
              </button>
            </div>

            {/* Botones de Acción Secundarios */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <button onClick={() => handleNavigate('stats')} className="flex items-center justify-center gap-2 bg-slate-800/80 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition-colors shadow-lg">
                <BarChart3 size={20} /> Mis Estadísticas
              </button>
              <button onClick={() => handleNavigate('reports')} className="flex items-center justify-center gap-2 bg-slate-800/80 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-slate-700 hover:border-blue-500 hover:text-blue-400 transition-colors shadow-lg">
                <FileText size={20} /> Reportes PDF
              </button>
            </div>
          </div>
        </header>

        {/* Footer */}
        <footer className="bg-slate-950 text-slate-400 p-8 text-center text-xs space-y-2 relative z-10">
          <p className="font-bold text-sm text-slate-300">RutaCuadrada - Menos Cuentas. Más Control.</p>
          <p>© 2026 RutaCuadrada. Todos los derechos reservados.</p>
          <p>Soporte y Ventas: <a href="mailto:movingexpresschile@gmail.com" className="text-emerald-500">movingexpresschile@gmail.com</a></p>
          <div className="pt-4 border-t border-slate-800 flex justify-center gap-4">
            <button onClick={() => setCurrentView('privacy')} className="hover:text-slate-200 cursor-pointer transition-colors">Política de Privacidad</button>
            <span>|</span>
            <button onClick={() => setCurrentView('terms')} className="hover:text-slate-200 cursor-pointer transition-colors">Términos de Servicio</button>
          </div>
        </footer>

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
                  className="w-full p-3 border-2 border-slate-200 rounded-xl mb-4 focus:border-emerald-500 outline-none transition-colors text-center font-medium"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
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
                  <p className="text-4xl font-black text-emerald-600 my-1">$12.490</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pago Único - Licencia Permanente</p>
                </div>
                <div className="space-y-3">
                  <a href="https://www.flow.cl/btn.php?token=TULINKAQUI" target="_blank" rel="noopener noreferrer" className="block w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg">
                    Comprar Licencia Ahora
                  </a>
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
              <BusFront className="text-emerald-500" /> Configuración Inicial
            </h2>
            <p className="text-slate-500 text-sm mb-8">Ingresa los datos de tu ruta. Esto tomará solo 30 segundos.</p>

            <div className="space-y-6">
              {/* Datos Personales y del Vehículo */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><User size={16}/> Conductor y Vehículo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre del Conductor" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={headerInfo.driverName} onChange={e => setHeaderInfo({...headerInfo, driverName: e.target.value})} />
                  <input type="text" placeholder="RUT (Ej: 15.123.456-7)" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={headerInfo.driverRut} onChange={e => setHeaderInfo({...headerInfo, driverRut: e.target.value})} />
                  <input type="text" placeholder="Empresa (Opcional - Ej: Ruta Lampa)" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={headerInfo.company} onChange={e => setHeaderInfo({...headerInfo, company: e.target.value})} />
                  <input type="text" placeholder="Recorrido (Opcional - Ej: Stgo-Centro)" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={headerInfo.route} onChange={e => setHeaderInfo({...headerInfo, route: e.target.value})} />
                  <input type="text" placeholder="Nº Patente" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={headerInfo.plate} onChange={e => setHeaderInfo({...headerInfo, plate: e.target.value})} />
                  <input type="text" placeholder="Nº Máquina Interno" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={headerInfo.machineNum} onChange={e => setHeaderInfo({...headerInfo, machineNum: e.target.value})} />
                </div>
              </div>

              {/* Destino del Reporte */}
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-4">
                <h3 className="font-bold text-blue-900 text-sm uppercase flex items-center gap-2"><Send size={16}/> Destino del Reporte (Garita/WhatsApp)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input type="tel" placeholder="WhatsApp de la Garita o Dueño (+569...)" className="w-full p-3 border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-medium" value={headerInfo.garitaPhone} onChange={e => setHeaderInfo({...headerInfo, garitaPhone: e.target.value})} />
                </div>
              </div>

              {/* Valores de Boletos */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><TrendingDown size={16}/> Precios de Boletos del Día</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.keys(ticketPrices).map(cat => (
                    <div key={cat}>
                      <label className="text-xs text-slate-500 font-medium mb-1 block">{labels[cat]}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400 font-medium">$</span>
                        <input type="number" className="w-full p-3 pl-7 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700" value={ticketPrices[cat]} onChange={(e) => setTicketPrices({...ticketPrices, [cat]: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <button onClick={() => setCurrentView('daily')} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-800 transition-colors shadow-lg flex justify-center items-center gap-2">
              Iniciar Rendición <ChevronRight />
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
        
        {/* Interfaz Principal de la App (Visible en Pantalla) */}
        <div className="print:hidden max-w-3xl mx-auto space-y-4 relative pb-20">
          
          <div className="flex justify-between items-center px-2">
            <button onClick={() => setCurrentView('setup')} className="text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center gap-1">← Atrás</button>
            <span className="text-xs font-bold text-slate-400">{headerInfo.date}</span>
          </div>

          {/* Tarjeta de Identificación Minimalista */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <p className="font-black text-slate-800">{headerInfo.driverName || 'Conductor'}</p>
              <p className="text-xs text-slate-500">{headerInfo.plate ? `Patente: ${headerInfo.plate}` : 'Vehículo no especificado'}</p>
            </div>
            <div className="bg-slate-100 px-3 py-1 rounded-lg text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Máquina</p>
              <p className="font-black text-slate-700">{headerInfo.machineNum || '--'}</p>
            </div>
          </div>

          {/* Marcador de Vueltas */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Marcador de Vueltas Registradas</h3>
            <div className="grid grid-cols-4 gap-2">
              {['v1', 'v2', 'v3', 'v4'].map((v, i) => (
                <button 
                  key={v}
                  onClick={() => setLaps({...laps, [v]: !laps[v]})}
                  className={`py-2 rounded-xl border-2 font-black transition-all ${laps[v] ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                >
                  {laps[v] && <CheckCircle2 size={16} className="inline mr-1" />}
                  V{i+1}
                </button>
              ))}
            </div>
          </div>

          {/* Ingresos por Boletos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-3 font-bold flex justify-between items-center">
              <span className="flex items-center gap-2"><FileText size={18}/> Boletos Cortados</span>
              <span className="text-xs bg-emerald-500 text-slate-900 px-2 py-1 rounded font-black">FASE 2</span>
            </div>
            
            <div className="p-4 space-y-4">
              {Object.keys(ticketPrices).map((cat) => (
                <div key={cat} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="col-span-12 sm:col-span-2 font-bold text-slate-700">{labels[cat]}</div>
                  <div className="col-span-4 sm:col-span-3">
                    <input type="number" placeholder="Inicio" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" value={tickets[cat].start} onChange={(e) => setTickets({...tickets, [cat]: {...tickets[cat], start: e.target.value}})} />
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <input type="number" placeholder="Fin" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono text-sm" value={tickets[cat].end} onChange={(e) => setTickets({...tickets, [cat]: {...tickets[cat], end: e.target.value}})} />
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

          {/* Gastos y Comisión */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-red-500 text-white p-3 font-bold flex items-center gap-2">
              <TrendingDown size={18}/> Gastos Operativos
            </div>
            <div className="p-4 space-y-3">
              {[
                { id: 'planilla', label: 'Planilla' },
                { id: 'petroleo', label: 'Petróleo' },
                { id: 'limpieza', label: 'Servicio de Limpieza' },
                { id: 'mantenciones', label: 'Mantenciones' },
                { id: 'otros', label: 'Otros Gastos' }
              ].map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                  <label className="font-medium text-slate-700 text-sm">{expense.label}</label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                    <input type="number" className="w-full p-2 pl-6 text-right border border-slate-300 rounded-lg outline-none focus:border-red-500 font-mono text-sm" placeholder="0" value={expenses[expense.id]} onChange={(e) => setExpenses({...expenses, [expense.id]: e.target.value})} />
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100 mt-2">
                <div>
                  <label className="font-bold text-blue-900 text-sm flex items-center gap-2">Comisión Conductor</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="number" className="w-12 p-1 text-center border border-blue-200 rounded text-xs outline-none" value={commissionPercent} onChange={e => setCommissionPercent(parseInt(e.target.value)||0)} />
                    <span className="text-xs text-blue-700 font-bold">% del Ingreso</span>
                  </div>
                </div>
                <div className="font-black text-blue-800 text-lg">
                  {formatMoney(driverCommission)}
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 border-t border-red-100 flex justify-between items-center">
              <span className="font-black text-red-900">TOTAL GASTOS</span>
              <span className="text-xl font-black text-red-600">{formatMoney(totalExpenses)}</span>
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-4">
            <label className="font-bold text-yellow-900 text-sm flex items-center gap-2 mb-2"><MessageCircle size={16}/> Observaciones y Notas</label>
            <textarea 
              className="w-full p-3 border border-yellow-300 rounded-xl outline-none focus:border-yellow-500 bg-white text-sm resize-none" 
              rows="3" 
              placeholder="Ej: Desvío en ruta por accidente, compra de aditivo, etc."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            ></textarea>
          </div>

          {/* RESUMEN FINAL */}
          <div className="bg-slate-900 text-white rounded-3xl shadow-xl overflow-hidden mt-6">
            <div className="p-6 text-center">
              <p className="text-sm text-slate-400 font-bold tracking-widest uppercase mb-1">Saldo a Entregar</p>
              <div className={`text-5xl font-black ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMoney(totalBalance)}
              </div>
            </div>
            <button onClick={saveLiquidation} className="w-full bg-emerald-500 text-slate-900 font-black py-5 text-lg hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2">
              <ShieldCheck size={24} /> GUARDAR LIQUIDACIÓN
            </button>
          </div>

          {/* BOTON NEON - WHATSAPP DIRECTO */}
          <button 
            onClick={shareApp}
            className="fixed bottom-6 right-6 px-6 py-3 rounded-full border border-green-500 text-green-400 bg-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.6)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)] transition-all z-50 font-bold flex items-center gap-2"
          >
            ✨ Invita Gratis a un colega
          </button>
        </div>

        {/* MODAL DE ÉXITO Y ENVÍO SEGURO (SOLO WHATSAPP) */}
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
              
              <div className="p-6 space-y-4">
                <p className="text-center text-slate-600 text-sm font-medium mb-4">Envía este reporte a la garita rápidamente:</p>
                
                <a 
                  href={`https://wa.me/${headerInfo.garitaPhone.replace(/\+/g, '')}?text=${encodeURIComponent(generateReportText(currentSavedLiq))}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#1ebd5a] text-lg shadow-md transition-transform hover:scale-105"
                >
                  <MessageCircle size={24} /> Enviar por WhatsApp
                </a>

                <button 
                  onClick={() => { setShowSuccessModal(false); setCurrentView('landing'); }}
                  className="w-full pt-4 text-slate-400 font-bold hover:text-slate-600 text-sm underline"
                >
                  Volver al Inicio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== ESTADÍSTICAS POR MES =====================
  if (currentView === 'stats') {
    // Agrupar historial por mes para cálculos
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
    
    // Si no hay datos, mostrar cero, si hay, mostrar el del mes seleccionado
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
    // Agrupar por mes
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
                        <p className="text-sm text-slate-500">Saldo: {formatMoney(liq.totalBalance)} | Pax: {Object.keys(liq.tickets).reduce((a,c) => a+getPassengers(c, liq.tickets),0)}</p>
                      </div>
                      <div className="flex gap-2">
                         <a 
                          href={`https://wa.me/?text=${encodeURIComponent(generateReportText(liq))}`}
                          target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#25D366] font-bold rounded-lg text-sm flex items-center gap-2 border border-slate-200"
                        >
                          <MessageCircle size={16}/> Enviar WhatsApp
                        </a>
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
              <p>
                En <strong>RutaCuadrada</strong>, estamos comprometidos con la protección y el manejo responsable de la información generada por nuestros usuarios (conductores y empresas de transporte).
              </p>
              
              <h2 className="text-lg font-bold text-slate-800">1. Confidencialidad de los Datos</h2>
              <p>
                Los datos ingresados en la plataforma, incluyendo montos recaudados, pasajeros transportados, observaciones y datos personales, son estrictamente confidenciales. Estos datos se almacenan localmente en el dispositivo del usuario mediante tecnologías de almacenamiento web (Local Storage) para facilitar el acceso rápido a su historial.
              </p>

              <h2 className="text-lg font-bold text-slate-800">2. Veracidad y Responsabilidad</h2>
              <p>
                La veracidad, exactitud y legalidad de los datos ingresados en los cálculos (folios de boletos, montos de gastos, comisiones y notas) son <strong>exclusiva responsabilidad del usuario</strong> que opera la aplicación. RutaCuadrada funciona únicamente como una herramienta de cálculo matemático y generación de comprobantes, y no asume responsabilidad por errores de digitación, auditorías internas de las empresas de transporte, o declaraciones legales derivadas de la información generada.
              </p>

              <h2 className="text-lg font-bold text-slate-800">3. Uso del Servicio</h2>
              <p>
                El uso de la prueba gratuita está limitado a un máximo de 3 liquidaciones guardadas. El uso continuo de la herramienta requiere el pago de la licencia correspondiente. Está prohibida la manipulación del código o del almacenamiento del navegador para evadir los controles de licencia.
              </p>

              <h2 className="text-lg font-bold text-slate-800">4. Compartir Información (Reportes)</h2>
              <p>
                Al utilizar la función de "Enviar por WhatsApp", el usuario acepta explícitamente transferir los datos de su liquidación diaria a los destinatarios que él mismo seleccione en su aplicación de mensajería.
              </p>
              
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

// Iconos Helper para Estadísticas
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const RotateCcwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;