import React, { useState, useEffect, useMemo } from 'react';
import { Share2, FileText, BarChart2, Calculator, ArrowLeft, Send, CheckCircle2, AlertCircle, LogOut, MessageSquare, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  // ==========================================
  // ESTADOS GLOBALES Y DE SESIÓN
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, calculator
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // ==========================================
  // TAREA 2: PERSISTENCIA DE CONFIGURACIÓN INICIAL
  // ==========================================
  const [driverData, setDriverData] = useState({
    nombre: '', rut: '', empresa: '', recorrido: '', patente: '', maquina: '', whatsappGarita: ''
  });

  // Carga inicial desde localStorage al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      const savedData = localStorage.getItem(`rutacuadrada_driver_${email}`);
      if (savedData) {
        setDriverData(JSON.parse(savedData));
      }
    }
  }, [isAuthenticated, email]);

  // Guardado automático ante cualquier cambio
  useEffect(() => {
    if (isAuthenticated && email) {
      localStorage.setItem(`rutacuadrada_driver_${email}`, JSON.stringify(driverData));
    }
  }, [driverData, isAuthenticated, email]);
  // ==========================================
  // FIN TAREA 2
  // ==========================================

  // ==========================================
  // TAREA 3: REESTRUCTURACIÓN DE BOLETOS CORRELATIVOS
  // ==========================================
  const [boletos, setBoletos] = useState({
    largo: { precio: 1500, inicio: '', v1: '', v2: '', v3: '', v4: '' },
    medio: { precio: 1200, inicio: '', v1: '', v2: '', v3: '', v4: '' },
    local: { precio: 600, inicio: '', v1: '', v2: '', v3: '', v4: '' },
    estudiante: { precio: 500, inicio: '', v1: '', v2: '', v3: '', v4: '' },
    adultoMayor: { precio: 750, inicio: '', v1: '', v2: '', v3: '', v4: '' } // Renombrado de 3ra Edad
  });

  const [gastos, setGastos] = useState({
    planilla: '', petroleo: '', limpieza: '', mantenciones: '', otros: ''
  });
  const [comisionPorcentaje, setComisionPorcentaje] = useState(20);
  const [notas, setNotas] = useState('');

  // Lógica de cálculo correlativo
  const calcularPax = (boleto) => {
    const v4 = parseInt(boleto.v4);
    const v3 = parseInt(boleto.v3);
    const v2 = parseInt(boleto.v2);
    const v1 = parseInt(boleto.v1);
    const ini = parseInt(boleto.inicio) || 0;

    let ultimoCorte = null;
    if (!isNaN(v4)) ultimoCorte = v4;
    else if (!isNaN(v3)) ultimoCorte = v3;
    else if (!isNaN(v2)) ultimoCorte = v2;
    else if (!isNaN(v1)) ultimoCorte = v1;

    if (ultimoCorte !== null && ultimoCorte > ini) {
      return ultimoCorte - ini;
    }
    return 0;
  };

  const resultados = useMemo(() => {
    let ingresosTotales = 0;
    const detalles = {};

    Object.entries(boletos).forEach(([tipo, datos]) => {
      const pax = calcularPax(datos);
      const total = pax * datos.precio;
      ingresosTotales += total;
      detalles[tipo] = { pax, total };
    });

    const totalGastosFijos = ['planilla', 'petroleo', 'limpieza', 'mantenciones', 'otros']
      .reduce((sum, key) => sum + (parseInt(gastos[key]) || 0), 0);

    const comision = Math.round(ingresosTotales * (comisionPorcentaje / 100));
    const totalGastos = totalGastosFijos + comision;
    const saldoLiquido = ingresosTotales - totalGastos;

    return { ingresosTotales, detalles, totalGastos, comision, saldoLiquido };
  }, [boletos, gastos, comisionPorcentaje]);
  // ==========================================
  // FIN TAREA 3
  // ==========================================

  // ==========================================
  // TAREA 4: ESTADOS DEL MÓDULO DE FEEDBACK
  // ==========================================
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    tipo: 'Sugerencia', rating: 5, mensaje: '', contacto: false
  });

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    const payload = {
      userId: email,
      empresa: driverData.empresa || 'No especificada',
      region: 'Metropolitana', // Placeholder para métricas futuras
      fecha: new Date().toLocaleDateString(),
      hora: new Date().toLocaleTimeString(),
      version: 'v1.0',
      ...feedbackData
    };

    console.log('--- PAYLOAD PARA PANEL DE ADMINISTRACIÓN ---');
    console.log(JSON.stringify(payload, null, 2));
    console.log('--------------------------------------------');

    alert('Gracias por ayudarnos a mejorar. Tu opinión es muy importante para seguir construyendo una mejor herramienta para los conductores de Chile.');
    setIsFeedbackOpen(false);
    setFeedbackData({ tipo: 'Sugerencia', rating: 5, mensaje: '', contacto: false });
  };
  // ==========================================
  // FIN TAREA 4
  // ==========================================

  // Funciones CORE de la App
  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) setIsAuthenticated(true);
  };

  const resetAndExit = () => {
    setCurrentView('dashboard');
    setShowSuccessModal(false);
  };

  // VISTAS
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <Calculator className="w-10 h-10 text-emerald-600 mr-2" />
            <h1 className="text-3xl font-bold text-slate-800">RutaCuadrada</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" required />
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-900">Recordar sesión por 30 días</label>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header General */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {currentView === 'calculator' && (
              <button onClick={() => setCurrentView('dashboard')} className="mr-3 p-1 hover:bg-slate-800 rounded">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <Calculator className="w-6 h-6 text-emerald-400 mr-2" />
            <span className="font-bold text-xl">RutaCuadrada</span>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-slate-400 hover:text-white flex items-center text-sm">
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ========================================== */}
            {/* TAREA 1: HERO SECTION REFACTORIZADO */}
            {/* ========================================== */}
            <div className="relative bg-slate-900 text-white pt-16 pb-20 px-6 rounded-b-[2.5rem] shadow-xl overflow-hidden">
              {/* Imagen de fondo sutil (Buses/Transporte) */}
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop')" }}
              ></div>
              {/* Overlay oscuro para contraste */}
              <div className="absolute inset-0 z-0 bg-black/60"></div>
              
              <div className="relative z-10 text-center">
                <h2 className="text-5xl font-extrabold mb-4 leading-tight">
                  Cuadra tu ruta,<br />
                  <span className="text-emerald-400">Rápido y Sin Errores.</span>
                </h2>
                <p className="text-slate-300 text-lg mb-8 max-w-md mx-auto">
                  La herramienta profesional para conductores del transporte público.
                </p>
                
                {/* Botón Principal con Efecto Neón */}
                <button 
                  onClick={() => setCurrentView('calculator')}
                  className="bg-emerald-500 text-slate-900 font-bold text-xl py-4 px-10 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] transform transition hover:scale-105 w-full max-w-xs mx-auto flex items-center justify-center"
                >
                  Iniciar mis cálculos <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                </button>
              </div>
            </div>

            {/* Dashboard Actions */}
            <div className="px-4 -mt-8 relative z-20 space-y-4">
              {/* Botón Mis Estadísticas (Efecto estático) */}
              <button className="w-full bg-white p-5 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between text-slate-800">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-xl mr-4"><BarChart2 className="w-6 h-6 text-blue-600" /></div>
                  <span className="font-bold text-lg">Mis Estadísticas</span>
                </div>
              </button>

              {/* Botón Mis Reportes PDF */}
              <button className="w-full bg-white p-5 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between text-slate-800 transition transform hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="bg-rose-100 p-3 rounded-xl mr-4"><FileText className="w-6 h-6 text-rose-600" /></div>
                  <span className="font-bold text-lg">Mis Reportes PDF</span>
                </div>
              </button>

              {/* ========================================== */}
              {/* TAREA 1: BOTÓN DE OFERTA / PAYWALL MOVIDO */}
              {/* ========================================== */}
              <a 
                href="https://www.flow.cl/btn.php?token=qf8691478077e8d649aae7f380c116e87afd54fd" 
                target="_blank" 
                rel="noreferrer"
                className="block w-full bg-slate-800 p-5 rounded-2xl shadow-[0_0_15px_rgba(30,41,59,0.5)] border border-slate-700 text-center transition transform hover:-translate-y-1 mt-6"
              >
                <div className="flex items-center justify-center mb-1">
                  <Star className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" />
                  <span className="font-bold text-white text-lg tracking-wide uppercase">
                    Ofertas del Equipo Razonable y Prudente
                  </span>
                  <Star className="w-5 h-5 text-yellow-400 ml-2" fill="currentColor" />
                </div>
                <span className="text-slate-300 text-sm">Protección médica y legal a un clic</span>
              </a>
              {/* ========================================== */}
              {/* FIN TAREA 1 */}
              {/* ========================================== */}
            </div>
            
            {/* ========================================== */}
            {/* TAREA 4: BOTONES INFERIORES Y MÓDULO FEEDBACK */}
            {/* ========================================== */}
            <div className="px-4 mt-8 flex space-x-3">
              <button className="flex-1 bg-slate-900 text-emerald-400 font-semibold py-4 rounded-2xl shadow-md flex justify-center items-center text-sm border border-slate-800">
                ✨ Invita Gratis a un colega
              </button>
              
              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="flex-1 bg-white text-slate-700 font-semibold py-4 rounded-2xl shadow-md border border-slate-200 flex justify-center items-center text-sm"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-blue-500" /> Ayúdanos a Mejorar
              </button>
            </div>
            
            {/* Enlaces Footer (SEO) */}
            <div className="mt-12 text-center pb-8 flex justify-center space-x-6 text-sm text-slate-500 font-medium">
              <a href="/nuestra-razon.html" className="hover:text-emerald-600 transition">Nuestra Razón</a>
              <a href="/articulos.html" className="hover:text-emerald-600 transition">Artículos</a>
              <a href="#" className="hover:text-emerald-600 transition">Términos de Servicio</a>
            </div>
          </div>
        )}

        {currentView === 'calculator' && (
          <div className="p-4 space-y-6 animate-in fade-in">
            {/* Configuración Inicial Precargada */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center mb-4">
                <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">1</span>
                Conductor y Vehículo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nombre Conductor" value={driverData.nombre} onChange={(e) => setDriverData({...driverData, nombre: e.target.value})} className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="text" placeholder="RUT" value={driverData.rut} onChange={(e) => setDriverData({...driverData, rut: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm" />
                <input type="text" placeholder="Empresa" value={driverData.empresa} onChange={(e) => setDriverData({...driverData, empresa: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm" />
                <input type="text" placeholder="N° Patente" value={driverData.patente} onChange={(e) => setDriverData({...driverData, patente: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm" />
                <input type="text" placeholder="N° Máquina" value={driverData.maquina} onChange={(e) => setDriverData({...driverData, maquina: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm" />
              </div>
            </section>

            {/* ========================================== */}
            {/* TAREA 3: CONTROL DE BOLETOS CORRELATIVOS UI */}
            {/* ========================================== */}
            <section className="bg-slate-900 rounded-2xl p-5 shadow-lg text-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-emerald-400" /> Control de Boletos Correlativos
                </h3>
                <span className="bg-emerald-500 text-slate-900 text-xs font-bold px-2 py-1 rounded">FASE 2</span>
              </div>

              {/* Cabeceras del Grid Mobile */}
              <div className="grid grid-cols-5 gap-1 mb-2 text-[10px] sm:text-xs text-center text-slate-400 font-semibold uppercase tracking-wider">
                <div>Inicio</div>
                <div>V1</div>
                <div>V2</div>
                <div>V3</div>
                <div>V4</div>
              </div>

              <div className="space-y-5">
                {Object.entries({
                  largo: 'Largo',
                  medio: 'Medio',
                  local: 'Local',
                  estudiante: 'Estudiante',
                  adultoMayor: 'Adulto Mayor' // Tarea 3: Renombrado
                }).map(([key, label]) => (
                  <div key={key} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{label}</span>
                      <span className="text-slate-400 text-sm">${boletos[key].precio}</span>
                    </div>
                    {/* Grid de 5 inputs */}
                    <div className="grid grid-cols-5 gap-1">
                      <input type="number" placeholder="0" value={boletos[key].inicio} onChange={(e) => setBoletos({...boletos, [key]: {...boletos[key], inicio: e.target.value}})} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm focus:ring-2 focus:ring-emerald-500" />
                      <input type="number" placeholder="-" value={boletos[key].v1} onChange={(e) => setBoletos({...boletos, [key]: {...boletos[key], v1: e.target.value}})} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm focus:ring-2 focus:ring-emerald-500" />
                      <input type="number" placeholder="-" value={boletos[key].v2} onChange={(e) => setBoletos({...boletos, [key]: {...boletos[key], v2: e.target.value}})} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm focus:ring-2 focus:ring-emerald-500" />
                      <input type="number" placeholder="-" value={boletos[key].v3} onChange={(e) => setBoletos({...boletos, [key]: {...boletos[key], v3: e.target.value}})} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm focus:ring-2 focus:ring-emerald-500" />
                      <input type="number" placeholder="-" value={boletos[key].v4} onChange={(e) => setBoletos({...boletos, [key]: {...boletos[key], v4: e.target.value}})} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-slate-400">PAX: <strong className="text-white">{resultados.detalles[key].pax}</strong></span>
                      <span className="text-emerald-400 font-bold">${resultados.detalles[key].total.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center bg-emerald-900/30 p-3 rounded-lg">
                <span className="font-bold text-emerald-400">INGRESO TOTAL</span>
                <span className="font-black text-2xl text-white">${resultados.ingresosTotales.toLocaleString('es-CL')}</span>
              </div>
            </section>
            {/* ========================================== */}
            {/* FIN TAREA 3 */}
            {/* ========================================== */}

            {/* Gastos y Resultados (Sin Modificar Core Financiero) */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-bold text-rose-600 mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2" /> Gastos y Comisiones</h3>
              <div className="space-y-3">
                {['planilla', 'petroleo', 'limpieza', 'mantenciones', 'otros'].map((gasto) => (
                  <div key={gasto} className="flex items-center">
                    <span className="w-1/2 text-sm text-slate-600 capitalize">{gasto}</span>
                    <input type="number" placeholder="$ 0" value={gastos[gasto]} onChange={(e) => setGastos({...gastos, [gasto]: e.target.value})} className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-right focus:ring-2 focus:ring-rose-500 outline-none" />
                  </div>
                ))}
                <div className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
                  <span className="w-1/2 text-sm font-semibold text-blue-800">Comisión Chófer (%)</span>
                  <div className="w-1/2 flex items-center">
                    <input type="number" value={comisionPorcentaje} onChange={(e) => setComisionPorcentaje(Number(e.target.value))} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-center mr-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* Resumen Final */}
            <section className="bg-slate-900 rounded-2xl p-6 shadow-xl text-center">
              <span className="text-slate-400 text-sm font-bold tracking-widest uppercase">Saldo Líquido a Entregar</span>
              <div className="text-6xl font-black text-emerald-400 my-4">${resultados.saldoLiquido.toLocaleString('es-CL')}</div>
              <button onClick={() => setShowSuccessModal(true)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold text-xl py-4 rounded-xl shadow-lg transition flex justify-center items-center">
                <CheckCircle2 className="w-6 h-6 mr-2" /> Guardar y Generar PDF
              </button>
            </section>
          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* TAREA 4: MODAL DE FEEDBACK */}
      {/* ========================================== */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-xl">&times;</button>
            <div className="flex items-center mb-4">
              <MessageSquare className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-bold text-slate-800">Ayúdanos a Mejorar</h2>
            </div>
            
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Comentario</label>
                <select 
                  value={feedbackData.tipo} 
                  onChange={(e) => setFeedbackData({...feedbackData, tipo: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>Sugerencia</option>
                  <option>Problema</option>
                  <option>Nueva función</option>
                  <option>Felicitación</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">¿Cómo calificas la aplicación hoy?</label>
                <div className="flex space-x-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      type="button" 
                      onClick={() => setFeedbackData({...feedbackData, rating: star})}
                    >
                      <Star className={`w-8 h-8 ${star <= feedbackData.rating ? 'text-yellow-400 fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tu Mensaje</label>
                <textarea 
                  rows="4" 
                  required
                  value={feedbackData.mensaje}
                  onChange={(e) => setFeedbackData({...feedbackData, mensaje: e.target.value})}
                  placeholder="Escribe aquí tu idea, problema o comentario..."
                  className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="contact" 
                  checked={feedbackData.contacto}
                  onChange={(e) => setFeedbackData({...feedbackData, contacto: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                />
                <label htmlFor="contact" className="ml-2 block text-sm text-gray-700">Deseo ser contactado</label>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl hover:bg-blue-700 transition">
                Enviar Comentarios
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* FIN TAREA 4 */}
      {/* ========================================== */}

      {/* Modal de Éxito (Mantenido intacto) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Ruta Cuadrada!</h2>
            <p className="text-slate-500 mb-8">La liquidación ha sido procesada y guardada en tu historial.</p>
            <div className="space-y-3">
              <button onClick={resetAndExit} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center items-center">
                Finalizar y Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}