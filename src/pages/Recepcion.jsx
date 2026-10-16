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

/* Interfaz: Clientes | Registro/Actualización/Consulta | Actor: Recepcionista | BD: SELECT cliente; RPC rpc_cliente_crear (INSERT), rpc_cliente_actualizar (UPDATE) | Autor: [Nombre del Integrante del Equipo] */
export function Clientes() {
  const [rows,setRows]=useState([]); const [q,setQ]=useState(''); const [ed,setEd]=useState(null); const [m,setM]=useState(null)
  const cargar = useCallback(async()=>{ const {data}=await supabase.from('cliente').select('*').order('id_cliente',{ascending:false}); setRows(data||[]) },[])
  useEffect(()=>{cargar()},[cargar])
  const f = rows.filter(r=>(r.nombre_completo+r.clave_socio+r.correo).toLowerCase().includes(q.toLowerCase()))
  const guardar = async (e) => { e.preventDefault(); const d=ed
    if(!RE_MAIL.test(d.correo)) return setM({t:'err',text:'Correo electrónico inválido'})
    if(!RE_TEL.test(d.telefono)) return setM({t:'err',text:'El teléfono debe tener 10 dígitos'})
    if(!d.fecha_nacimiento || new Date(d.fecha_nacimiento)>=new Date()) return setM({t:'err',text:'Fecha de nacimiento inválida'})
    const r = d.id_cliente
      ? await supabase.rpc('rpc_cliente_actualizar',{p_id:d.id_cliente,p_nombre:d.nombre_completo,p_telefono:d.telefono,p_correo:d.correo,p_nacimiento:d.fecha_nacimiento,p_activo:d.activo})
      : await supabase.rpc('rpc_cliente_crear',{p_nombre:d.nombre_completo,p_telefono:d.telefono,p_correo:d.correo,p_nacimiento:d.fecha_nacimiento})
    if(r.error) return setM({t:'err',text:r.error.message})
    setM({t:'ok',text:d.id_cliente?'Cliente actualizado':`Cliente registrado. Clave de socio: ${r.data}`}); setEd(null); cargar() }
  return <><h1>Clientes</h1><div className="sub">Registro y edición de socios</div><Msg m={m}/>
    <div className="card"><div className="row" style={{justifyContent:'space-between'}}><input style={{maxWidth:320}} placeholder="Buscar por nombre, clave o correo" value={q} onChange={e=>setQ(e.target.value)}/>
    <button className="btn" onClick={()=>{setM(null);setEd({nombre_completo:'',telefono:'',correo:'',fecha_nacimiento:'',activo:true})}}>Registrar cliente</button></div>
    <Table rows={f} cols={[{h:'Clave',r:r=>r.clave_socio},{h:'Nombre',r:r=>r.nombre_completo},{h:'Teléfono',r:r=>r.telefono},{h:'Correo',r:r=>r.correo},
      {h:'Estado',r:r=>r.activo?<Badge ok>Activo</Badge>:<Badge>Inactivo</Badge>},{h:'',r:r=><button className="btn ghost sm" onClick={()=>{setM(null);setEd(r)}}>Editar</button>}]}/></div>
    {ed&&<Modal title={ed.id_cliente?'Editar cliente':'Registrar cliente'} onClose={()=>setEd(null)}><form onSubmit={guardar} className="form">
      <F l="Nombre completo"><input required value={ed.nombre_completo} onChange={e=>setEd({...ed,nombre_completo:e.target.value})}/></F>
      <F l="Teléfono (10 dígitos)"><input required maxLength={10} value={ed.telefono} onChange={e=>setEd({...ed,telefono:e.target.value.replace(/\D/g,'')})}/></F>
      <F l="Correo electrónico"><input required type="email" value={ed.correo} onChange={e=>setEd({...ed,correo:e.target.value})}/></F>
      <F l="Fecha de nacimiento"><input required type="date" max={new Date().toISOString().slice(0,10)} value={ed.fecha_nacimiento} onChange={e=>setEd({...ed,fecha_nacimiento:e.target.value})}/></F>
      {ed.id_cliente&&<F l="Estado"><select value={ed.activo?'1':'0'} onChange={e=>setEd({...ed,activo:e.target.value==='1'})}><option value="1">Activo</option><option value="0">Inactivo</option></select></F>}
      <button className="btn">Guardar</button></form></Modal>}</>
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

/* Interfaz: Punto de venta | Transacción | Actor: Recepcionista | BD: SELECT inventario, producto, metodo_pago; RPC rpc_venta_registrar (INSERT venta/detalle_venta, UPDATE inventario.stock_actual) | Autor: [Nombre del Integrante del Equipo] */
export function Venta() {
  const { perfil } = useAuth(); const [inv,setInv]=useState([]),[mp,setMp]=useState([]),[cart,setCart]=useState({}),[met,setMet]=useState(''),[cat,setCat]=useState(''),[m,setM]=useState(null)
  const cargar = useCallback(async()=>{ const [a,b]=await Promise.all([
    supabase.from('inventario').select('*, producto(*)').eq('id_sucursal',perfil.id_sucursal),supabase.from('metodo_pago').select('*').eq('activo',true)])
    setInv((a.data||[]).filter(i=>i.producto.uso_previsto==='VENTA'));setMp(b.data||[]) },[perfil])
  useEffect(()=>{cargar()},[cargar])
  const cats=[...new Set(inv.map(i=>i.producto.categoria))]
  const items=inv.filter(i=>cart[i.id_producto]), total=items.reduce((s,i)=>s+cart[i.id_producto]*Number(i.producto.precio_venta),0)
  const add=(i,d)=>{ const n=(cart[i.id_producto]||0)+d; if(n>i.stock_actual) return setM({t:'err',text:`Solo hay ${i.stock_actual} en ${i.producto.nombre}`})
    const c={...cart}; n<=0?delete c[i.id_producto]:c[i.id_producto]=n; setCart(c) }
  const vender=async()=>{ const {data,error}=await supabase.rpc('rpc_venta_registrar',{p_id_metodo:+met,p_items:items.map(i=>({id_producto:i.id_producto,cantidad:cart[i.id_producto]}))})
    if(error) return setM({t:'err',text:error.message}); setM({t:'ok',text:`Venta registrada. Folio ${data}`}); setCart({}); cargar() }
  return <><h1>Punto de venta</h1><div className="sub">Inventario de {perfil.sucursal.nombre}</div><Msg m={m}/>
    <div className="card"><div className="row"><button className={'btn sm '+(cat?'ghost':'')} onClick={()=>setCat('')}>Todas</button>{cats.map(c=><button key={c} className={'btn sm '+(cat===c?'':'ghost')} onClick={()=>setCat(c)}>{c}</button>)}</div>
    <Table per={7} rows={inv.filter(i=>!cat||i.producto.categoria===cat)} cols={[{h:'Producto',r:i=>i.producto.nombre},{h:'Categoría',r:i=>i.producto.categoria},{h:'Precio',r:i=>money(i.producto.precio_venta)},
      {h:'Stock',r:i=>i.stock_actual<=i.stock_minimo?<Badge warn>{i.stock_actual} · stock mínimo</Badge>:i.stock_actual},
      {h:'',r:i=><div className="row"><button className="btn ghost sm" onClick={()=>add(i,-1)}>−</button>{cart[i.id_producto]||0}<button className="btn sm" disabled={!i.stock_actual} onClick={()=>add(i,1)}>+</button></div>}]}/></div>
    <div className="card"><table><thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>{items.map(i=><tr key={i.id_producto}><td>{i.producto.nombre}</td><td>{cart[i.id_producto]}</td><td>{money(cart[i.id_producto]*i.producto.precio_venta)}</td></tr>)}</tbody></table>
    <div className="row" style={{justifyContent:'space-between',marginTop:12}}><b>Total: {money(total)}</b><div className="row"><select style={{width:180}} value={met} onChange={e=>setMet(e.target.value)}><option value="">Método de pago</option>{mp.map(t=><option key={t.id_metodo_pago} value={t.id_metodo_pago}>{t.nombre}</option>)}</select>
    <button className="btn" disabled={!items.length||!met} onClick={vender}>Registrar venta</button></div></div></div></>
}

/* Interfaz: Asistencia | Registro | Actor: Recepcionista | BD: SELECT asistencia; RPC rpc_asistencia_marcar (INSERT entrada / UPDATE salida) | Autor: [Nombre del Integrante del Equipo] */
export function Asistencia() {
  const { perfil } = useAuth(); const [rows,setRows]=useState([]),[m,setM]=useState(null)
  const cargar=useCallback(async()=>{const {data}=await supabase.from('asistencia').select('*').eq('id_empleado',perfil.id_empleado).order('entrada',{ascending:false}).limit(60);setRows(data||[])},[perfil])
  useEffect(()=>{cargar()},[cargar])
  const abierta=rows.some(r=>!r.salida)
  const marcar=async(t)=>{const {error}=await supabase.rpc('rpc_asistencia_marcar',{p_tipo:t}); setM(error?{t:'err',text:error.message}:{t:'ok',text:t==='ENTRADA'?'Entrada registrada':'Salida registrada'}); cargar()}
  return <><h1>Asistencia</h1><div className="sub">{perfil.nombre_completo} · {perfil.sucursal.nombre}</div><Msg m={m}/>
    <div className="card row"><button className="btn" disabled={abierta} onClick={()=>marcar('ENTRADA')}>Marcar entrada</button><button className="btn ghost" disabled={!abierta} onClick={()=>marcar('SALIDA')}>Marcar salida</button></div>
    <div className="card"><Table rows={rows} cols={[{h:'Entrada',r:r=>fecha(r.entrada)},{h:'Salida',r:r=>r.salida?fecha(r.salida):<Badge warn>En turno</Badge>}]}/></div></>
}
