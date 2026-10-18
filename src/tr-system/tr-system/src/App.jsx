import { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import { RDashboard, Cobros } from './pages/Recepcion'
import { Clientes, Venta, Asistencia, Cortes, PorVencer } from './pages/Shared'
import { ADashboard, Empleados, Productos, Bitacora, Sucursales, TiposMembresia, MetodosPago } from './pages/Admin'
import { Confirm, ThemeBtn, ErrorBoundary } from './ui'

const Ctx = createContext(null); export const useAuth = () => useContext(Ctx)

async function cargarPerfil() {
  const { data:{ session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase.from('empleado').select('*, rol(nombre), sucursal(nombre)').eq('auth_user_id', session.user.id).eq('activo', true).maybeSingle()
  return data ? { ...data, esAdmin: data.rol.nombre === 'ADMINISTRADOR' } : null
}

function Guard({ rol }) {
  const { perfil } = useAuth()
  if (!perfil) return <Navigate to="/login" replace />
  if (rol !== (perfil.esAdmin ? 'ADMIN' : 'RECEPCION')) return <Navigate to={perfil.esAdmin ? '/admin' : '/recepcion'} replace />
  return <Shell/>
}

function Shell() {
  const { perfil, salir } = useAuth(); const [conf,setConf]=useState(false), [msg,setMsg]=useState(null)
  const base = perfil.esAdmin ? '/admin' : '/recepcion'
  const comunes = [['clientes','Clientes'],['cobros','Membresías y cobros'],['por-vencer','Membresías por vencer'],['venta','Punto de venta'],['cortes','Corte de caja'],['asistencia','Asistencia']]
  const menu = perfil.esAdmin
    ? [['','Dashboard',true],...comunes,['productos','Productos e inventario'],['tipos','Tipos de membresía'],['metodos','Métodos de pago'],['empleados','Empleados'],['sucursales','Sucursales'],['bitacora','Bitácora']]
    : [['','Dashboard',true],['clientes','Clientes'],['cobros','Membresías y cobros'],['por-vencer','Membresías por vencer'],['venta','Punto de venta'],['cortes','Corte de caja'],['asistencia','Asistencia']]
  // Cerrar sesión: confirmación, luego salida manual de asistencia si había entrada abierta
  const cerrar = async () => { await supabase.rpc('rpc_asistencia_marcar',{p_tipo:'SALIDA'}); salir() }
  return <div className="layout"><nav className="side">
    <div className="brand">TR System<small>Titanium Gym</small></div>
    {menu.map(([to,t,end])=><NavLink key={to} to={`${base}/${to}`.replace(/\/$/,'')} end={end}>{t}</NavLink>)}
    <div className="who"><b style={{color:'var(--txt)'}}>{perfil.nombre_completo}</b><br/>{perfil.rol.nombre}{perfil.turno?` · ${perfil.turno}`:''}<br/>Sucursal: {perfil.sucursal.nombre}
    <div className="row" style={{marginTop:8}}><ThemeBtn/><button className="btn ghost sm" onClick={()=>setConf(true)}>Cerrar sesión</button></div></div></nav>
    <main><ErrorBoundary><Outlet/></ErrorBoundary></main>
    {conf&&<Confirm text="¿Seguro que quieres cerrar sesión?" onNo={()=>setConf(false)} onYes={cerrar}/>}</div>
}

export default function App() {
  const [perfil, setPerfil] = useState(undefined)
  const refrescar = async () => setPerfil(await cargarPerfil())
  useEffect(() => { refrescar(); const { data:s } = supabase.auth.onAuthStateChange((e)=>{ if(e==='SIGNED_OUT') setPerfil(null) }); return () => s.subscription.unsubscribe() }, [])
  const salir = async () => { await supabase.auth.signOut(); setPerfil(null) }
  if (perfil === undefined) return null
  const home = perfil ? (perfil.esAdmin ? '/admin' : '/recepcion') : '/login'
  const comunes = <><Route path="clientes" element={<Clientes/>}/><Route path="cobros" element={<Cobros/>}/><Route path="por-vencer" element={<PorVencer/>}/><Route path="venta" element={<Venta/>}/><Route path="cortes" element={<Cortes/>}/><Route path="asistencia" element={<Asistencia/>}/></>
  return <Ctx.Provider value={{ perfil, refrescar, salir }}><Routes>
    <Route path="/login" element={perfil ? <Navigate to={home} replace/> : <Login/>}/>
    <Route path="/admin" element={<Guard rol="ADMIN"/>}><Route index element={<ADashboard/>}/>{comunes}
      <Route path="productos" element={<Productos/>}/><Route path="tipos" element={<TiposMembresia/>}/><Route path="metodos" element={<MetodosPago/>}/>
      <Route path="empleados" element={<Empleados/>}/><Route path="sucursales" element={<Sucursales/>}/><Route path="bitacora" element={<Bitacora/>}/></Route>
    <Route path="/recepcion" element={<Guard rol="RECEPCION"/>}><Route index element={<RDashboard/>}/>{comunes}</Route>
    <Route path="*" element={<Navigate to={home} replace/>}/></Routes></Ctx.Provider>
}
