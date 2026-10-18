import { useState } from 'react'
import { supabase, emailDe } from '../supabase'
import { useAuth } from '../App'
import { Msg, F, ThemeBtn } from '../ui'

/* Interfaz: Inicio de sesión | Actores: Empleado (Administrador/Recepcionista) y Cliente (consulta pública) | BD: Auth signIn; RPC rpc_asistencia_marcar (INSERT asistencia al entrar), rpc_solicitar_recuperacion (INSERT bitacora), rpc_consultar_membresia (SELECT vw_membresia_vigencia) | Autor: [Nombre del Integrante del Equipo] */
export default function Login() {
  const { refrescar } = useAuth(); const [tab,setTab]=useState('emp'); const [vista,setVista]=useState('login')
  const [u,setU]=useState(''),[p,setP]=useState(''),[c,setC]=useState(''),[clave,setClave]=useState(''),[res,setRes]=useState(null),[m,setM]=useState(null),[b,setB]=useState(false)
  const entrar = async (e) => { e.preventDefault(); setB(true); setM(null)
    const { error } = await supabase.auth.signInWithPassword({ email: emailDe(u), password: p })
    if (error) { setM({t:'err',text:'Usuario o contraseña incorrectos'}); setB(false); return }
    await supabase.rpc('rpc_asistencia_marcar',{p_tipo:'ENTRADA'}) // entrada automática (si ya hay una abierta se ignora)
    await refrescar() }
  const recuperar = async (e) => { e.preventDefault(); await supabase.rpc('rpc_solicitar_recuperacion',{p_usuario:u,p_correo:c})
    setM({t:'ok',text:'Si los datos coinciden, el administrador recibió tu solicitud y te asignará una contraseña temporal.'}) }
  const consultar = async (e) => { e.preventDefault(); const {data}=await supabase.rpc('rpc_consultar_membresia',{p_clave:clave}); setRes(data) }
  return <div className="split"><div className="theme"><ThemeBtn/></div>
    <section className="hero"><div className="logo">TITANIUM <i>GYM</i></div><h2>Tu mejor versión<br/><span>comienza aquí</span></h2><p>TR System · Training Revolution Platform. Gestión de clientes, membresías, ventas y sucursales.</p></section>
    <section className="pane"><div className="card"><h1>Iniciar sesión</h1><div className="sub" style={{marginBottom:0}}>Selecciona tu perfil</div>
      <div className="tabs"><button className={tab==='cli'?'on':''} onClick={()=>{setTab('cli');setM(null)}}>Cliente</button><button className={tab==='emp'?'on':''} onClick={()=>{setTab('emp');setVista('login');setM(null)}}>Empleado</button></div>
      <Msg m={m}/>
      {tab==='cli' && <form onSubmit={consultar}><F l="No. de socio"><input required value={clave} onChange={e=>setClave(e.target.value)} placeholder="Ej. CLI-4X7B2"/></F><div style={{height:12}}/>
        <button className="btn" style={{width:'100%'}}>Consultar membresía</button>
        {res&&<div className="card" style={{marginTop:14,marginBottom:0}}>{!res.encontrado?'No encontramos ese número de socio.':<>Estatus: <b>{res.estatus}</b>{res.fecha_fin&&<><br/>Inicio: {res.fecha_inicio}<br/>Vence: {res.fecha_fin}</>}</>}</div>}</form>}
      {tab==='emp' && vista==='login' && <form onSubmit={entrar}><F l="Usuario"><input value={u} onChange={e=>setU(e.target.value)} autoComplete="username" required/></F><div style={{height:10}}/>
        <F l="Contraseña"><input type="password" value={p} onChange={e=>setP(e.target.value)} autoComplete="current-password" required/></F>
        <div style={{textAlign:'right',margin:'8px 0 14px'}}><button type="button" className="link" onClick={()=>{setVista('rec');setM(null)}}>¿Has olvidado tu contraseña?</button></div>
        <button className="btn" style={{width:'100%'}} disabled={b}>{b?'Entrando…':'Acceder al sistema'}</button></form>}
      {tab==='emp' && vista==='rec' && <form onSubmit={recuperar}><div className="sub">Captura tu usuario y el correo registrado. El administrador te asignará una contraseña temporal.</div>
        <F l="Usuario"><input value={u} onChange={e=>setU(e.target.value)} required/></F><div style={{height:10}}/><F l="Correo registrado"><input type="email" value={c} onChange={e=>setC(e.target.value)} required/></F><div style={{height:14}}/>
        <button className="btn" style={{width:'100%'}}>Enviar solicitud</button><div style={{textAlign:'center',marginTop:10}}><button type="button" className="link" onClick={()=>{setVista('login');setM(null)}}>Volver al inicio de sesión</button></div></form>}
    </div></section></div>
}
