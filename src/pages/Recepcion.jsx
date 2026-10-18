import { useEffect, useState, useCallback } from 'react'
import { supabase, money, fecha } from '../supabase'
import { useAuth } from '../App'
import { Msg, Badge, Table, Modal, F } from '../ui'

const hoy0 = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString() }
const RE_MAIL=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, RE_TEL=/^[0-9]{10}$/

/* Interfaz: Dashboard de recepción | Actor: Recepcionista | BD: SELECT cliente, pago, venta, vw_venta_total, asistencia | Autor: [Nombre del Integrante del Equipo] */
export function RDashboard() {
  const { perfil } = useAuth(); const [k,setK]=useState({})
  useEffect(()=>{ (async()=>{
    const [c,p,v,a] = await Promise.all([
      supabase.from('cliente').select('id_cliente',{count:'exact',head:true}).eq('activo',true),
      supabase.from('pago').select('monto').gte('fecha_hora',hoy0()),
      supabase.from('vw_venta_total').select('total').gte('fecha_hora',hoy0()),
      supabase.from('asistencia').select('*').eq('id_empleado',perfil.id_empleado).is('salida',null).maybeSingle()])
    setK({ clientes:c.count, pagos:(p.data||[]).reduce((s,x)=>s+Number(x.monto),0), ventas:(v.data||[]).reduce((s,x)=>s+Number(x.total),0), turno:!!a.data })
  })() },[perfil])
  return <><h1>Dashboard</h1><div className="sub">Sucursal {perfil.sucursal.nombre} · Empleado activo: {perfil.nombre_completo}</div>
    <div className="grid"><div className="card kpi">Clientes activos<b>{k.clientes??'…'}</b></div><div className="card kpi">Cobros de hoy<b>{money(k.pagos)}</b></div>
    <div className="card kpi">Ventas de hoy<b>{money(k.ventas)}</b></div><div className="card kpi">Mi turno<b>{k.turno?'En turno':'Sin entrada'}</b></div></div></>
}

/* Interfaz: Membresías y cobros | Transacción | Actor: Recepcionista | BD: SELECT cliente, tipo_membresia, metodo_pago, vw_membresia_vigencia, pago; RPC rpc_membresia_cobrar (INSERT membresia/pago, UPDATE estado PENDIENTE→ACTIVA) | Autor: [Nombre del Integrante del Equipo] */
export function Cobros() {
  const [cl,setCl]=useState([]),[tm,setTm]=useState([]),[mp,setMp]=useState([]),[pg,setPg]=useState([]),[m,setM]=useState(null)
  const [f,setF]=useState({c:'',t:'',p:'',i:new Date().toISOString().slice(0,10)})
  const cargar = useCallback(async()=>{
    const [a,b,c,d]=await Promise.all([supabase.from('cliente').select('id_cliente,nombre_completo,clave_socio').eq('activo',true).order('nombre_completo'),
      supabase.from('tipo_membresia').select('*').eq('activo',true),supabase.from('metodo_pago').select('*').eq('activo',true),
      supabase.from('pago').select('folio,fecha_hora,concepto,monto,metodo_pago(nombre),membresia(cliente(nombre_completo),estado)').order('fecha_hora',{ascending:false}).limit(50)])
    setCl(a.data||[]);setTm(b.data||[]);setMp(c.data||[]);setPg(d.data||[]) },[])
  useEffect(()=>{cargar()},[cargar])
  const cobrar = async(e)=>{ e.preventDefault()
    const {data,error}=await supabase.rpc('rpc_membresia_cobrar',{p_id_cliente:+f.c,p_id_tipo:+f.t,p_id_metodo:+f.p,p_inicio:f.i})
    if(error) return setM({t:'err',text:error.message}); setM({t:'ok',text:`Pago registrado. Folio: ${data}. Membresía ACTIVA.`}); cargar() }
  const tipo = tm.find(x=>x.id_tipo_membresia===+f.t)
  return <><h1>Membresías y cobros</h1><div className="sub">La membresía nace PENDIENTE y pasa a ACTIVA al registrar el pago</div><Msg m={m}/>
    <form className="card form" onSubmit={cobrar}>
      <F l="Cliente"><select required value={f.c} onChange={e=>setF({...f,c:e.target.value})}><option value="">Seleccionar</option>{cl.map(c=><option key={c.id_cliente} value={c.id_cliente}>{c.clave_socio} · {c.nombre_completo}</option>)}</select></F>
      <F l="Tipo de membresía"><select required value={f.t} onChange={e=>setF({...f,t:e.target.value})}><option value="">Seleccionar</option>{tm.map(t=><option key={t.id_tipo_membresia} value={t.id_tipo_membresia}>{t.nombre} · {money(t.costo)}</option>)}</select></F>
      <F l="Método de pago"><select required value={f.p} onChange={e=>setF({...f,p:e.target.value})}><option value="">Seleccionar</option>{mp.map(t=><option key={t.id_metodo_pago} value={t.id_metodo_pago}>{t.nombre}</option>)}</select></F>
      <F l="Fecha de inicio"><input type="date" required value={f.i} onChange={e=>setF({...f,i:e.target.value})}/></F>
      <button className="btn">Cobrar {tipo?money(tipo.costo):''}</button></form>
    <div className="card"><h1 style={{fontSize:16}}>Últimos cobros</h1><Table rows={pg} cols={[{h:'Folio',r:r=>r.folio},{h:'Fecha',r:r=>fecha(r.fecha_hora)},{h:'Cliente',r:r=>r.membresia?.cliente?.nombre_completo},
      {h:'Concepto',r:r=>r.concepto},{h:'Método',r:r=>r.metodo_pago?.nombre},{h:'Monto',r:r=>money(r.monto)},{h:'Estado',r:r=>r.membresia?.estado==='ACTIVA'?<Badge ok>Activa</Badge>:<Badge warn>{r.membresia?.estado}</Badge>}]}/></div></>
}

