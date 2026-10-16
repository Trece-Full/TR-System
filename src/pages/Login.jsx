import { useState } from 'react'
import { supabase, emailDe } from '../supabase'
import { useAuth } from '../App'
import { Msg, F } from '../ui'
export default function Login() {
  const { refrescar } = useAuth(); const [u,setU]=useState(''); const [p,setP]=useState(''); const [m,setM]=useState(null); const [b,setB]=useState(false)
  const entrar = async (e) => { e.preventDefault(); setB(true); setM(null)
    const { error } = await supabase.auth.signInWithPassword({ email: emailDe(u), password: p })
    if (error) { setM({t:'err',text:'Usuario o contraseña incorrectos'}); setB(false); return }
    await refrescar() }
  return <div className="login"><form className="card" onSubmit={entrar}>
    <h1>TR System</h1><div className="sub">Titanium Gym · Inicio de sesión</div><Msg m={m}/>
    <F l="Usuario"><input value={u} onChange={e=>setU(e.target.value)} autoComplete="username" required/></F><div style={{height:10}}/>
    <F l="Contraseña"><input type="password" value={p} onChange={e=>setP(e.target.value)} autoComplete="current-password" required/></F><div style={{height:16}}/>
    <button className="btn" style={{width:'100%'}} disabled={b}>{b?'Entrando…':'Iniciar sesión'}</button></form></div>
}
