import { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import { RDashboard, Clientes, Cobros, Venta, Asistencia } from './pages/Recepcion'
import { ADashboard, Empleados, Cortes, Productos, Bitacora, Sucursales } from './pages/Admin'

const Ctx = createContext(null); export const useAuth = () => useContext(Ctx)

// Perfil = fila de empleado (con rol y sucursal) ligada al usuario autenticado
async function cargarPerfil() {
  const { data:{ session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase.from('empleado').select('*, rol(nombre), sucursal(nombre)').eq('auth_user_id', session.user.id).eq('activo', true).maybeSingle()
  return data ? { ...data, esAdmin: data.rol.nombre === 'ADMINISTRADOR' } : null
}

// Guardia de rutas: si el rol no coincide redirige al dashboard propio
function Guard({ rol }) {
  const { perfil } = useAuth()
  if (!perfil) return <Navigate to="/login" replace />
  const mio = perfil.esAdmin ? 'ADMIN' : 'RECEPCION'
  if (rol !== mio) return <Navigate to={perfil.esAdmin ? '/admin' : '/recepcion'} replace />
  return <Shell/>
}

function Shell() {
  const { perfil, salir } = useAuth()
  const menu = perfil.esAdmin
    ? [['/admin','Dashboard',true],['/admin/empleados','Empleados'],['/admin/sucursales','Sucursales'],['/admin/productos','Productos e inventario'],['/admin/cortes','Corte de caja'],['/admin/bitacora','Bitácora']]
    : [['/recepcion','Dashboard',true],['/recepcion/clientes','Clientes'],['/recepcion/cobros','Membresías y cobros'],['/recepcion/venta','Punto de venta'],['/recepcion/asistencia','Asistencia']]
  return <div className="layout"><nav className="side">
    <div className="brand">TR System<small>Titanium Gym</small></div>
    {menu.map(([to,t,end])=><NavLink key={to} to={to} end={end}>{t}</NavLink>)}
    <div className="who"><b style={{color:'#e7e7ea'}}>{perfil.nombre_completo}</b><br/>{perfil.rol.nombre}<br/>Sucursal: {perfil.sucursal.nombre}<br/>
    <button className="btn ghost sm" style={{marginTop:8}} onClick={salir}>Cerrar sesión</button></div></nav>
    <main><Outlet/></main></div>
}

export default function App() {
  const [perfil, setPerfil] = useState(undefined)
  const refrescar = async () => setPerfil(await cargarPerfil())
  useEffect(() => { refrescar(); const { data:s } = supabase.auth.onAuthStateChange((e)=>{ if(e==='SIGNED_OUT') setPerfil(null) }); return () => s.subscription.unsubscribe() }, [])
  const salir = async () => { await supabase.auth.signOut(); setPerfil(null) }
  if (perfil === undefined) return null
  const home = perfil ? (perfil.esAdmin ? '/admin' : '/recepcion') : '/login'
  return <Ctx.Provider value={{ perfil, refrescar, salir }}><Routes>
    <Route path="/login" element={perfil ? <Navigate to={home} replace/> : <Login/>}/>
    <Route path="/admin" element={<Guard rol="ADMIN"/>}>
      <Route index element={<ADashboard/>}/><Route path="empleados" element={<Empleados/>}/><Route path="sucursales" element={<Sucursales/>}/>
      <Route path="productos" element={<Productos/>}/><Route path="cortes" element={<Cortes/>}/><Route path="bitacora" element={<Bitacora/>}/></Route>
    <Route path="/recepcion" element={<Guard rol="RECEPCION"/>}>
      <Route index element={<RDashboard/>}/><Route path="clientes" element={<Clientes/>}/><Route path="cobros" element={<Cobros/>}/>
      <Route path="venta" element={<Venta/>}/><Route path="asistencia" element={<Asistencia/>}/></Route>
    <Route path="*" element={<Navigate to={home} replace/>}/></Routes></Ctx.Provider>
}
