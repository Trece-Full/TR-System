import { useEffect, useState, useCallback } from 'react'
import { supabase, money, fecha } from '../supabase'
import { useAuth } from '../App'
import { Msg, Badge, Table, Modal, F } from '../ui'
const RE_MAIL=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, RE_TEL=/^[0-9]{10}$/
const hoy=()=>new Date().toISOString().slice(0,10)
const mas=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
// Última membresía activa por cliente (vw_membresia_vigencia no tiene FK, se une en el cliente)
const ultimas=(vig)=>{const m={};(vig||[]).filter(v=>v.estado==='ACTIVA').forEach(v=>{if(!m[v.id_cliente]||v.fecha_fin>m[v.id_cliente].fecha_fin)m[v.id_cliente]=v});return m}
const useSuc=()=>{const [s,setS]=useState([]);useEffect(()=>{supabase.from('sucursal').select('*').eq('activo',true).order('id_sucursal').then(r=>setS(r.data||[]))},[]);return s}
const estadoMem=(v)=>!v?<Badge warn>Sin membresía</Badge>:v.fecha_fin>=hoy()?<Badge ok>Vigente</Badge>:<Badge>Vencida</Badge>

/* Interfaz: Clientes | Registro/Actualización/Consulta | Actores: Recepcionista y Administrador | BD: SELECT cliente, vw_membresia_vigencia; RPC rpc_cliente_crear (INSERT), rpc_cliente_actualizar (UPDATE) | Autor: [Nombre del Integrante del Equipo] */
export function Clientes() {
  const [rows,setRows]=useState([]),[vig,setVig]=useState({}),[q,setQ]=useState(''),[ed,setEd]=useState(null),[m,setM]=useState(null)
  const cargar=useCallback(async()=>{const [c,v]=await Promise.all([supabase.from('cliente').select('*').order('id_cliente',{ascending:false}),supabase.from('vw_membresia_vigencia').select('*')]);setRows(c.data||[]);setVig(ultimas(v.data))},[])
  useEffect(()=>{cargar()},[cargar])
  const f=rows.filter(r=>(r.nombre_completo+r.clave_socio+r.correo).toLowerCase().includes(q.toLowerCase()))
  const guardar=async(e)=>{e.preventDefault();const d=ed
    if(!RE_MAIL.test(d.correo)) return setM({t:'err',text:'Correo electrónico inválido'})
    if(!RE_TEL.test(d.telefono)) return setM({t:'err',text:'El teléfono debe tener 10 dígitos'})
    if(!d.fecha_nacimiento||new Date(d.fecha_nacimiento)>=new Date()) return setM({t:'err',text:'Fecha de nacimiento inválida'})
    const r=d.id_cliente
      ?await supabase.rpc('rpc_cliente_actualizar',{p_id:d.id_cliente,p_nombre:d.nombre_completo,p_telefono:d.telefono,p_correo:d.correo,p_nacimiento:d.fecha_nacimiento,p_activo:d.activo})
      :await supabase.rpc('rpc_cliente_crear',{p_nombre:d.nombre_completo,p_telefono:d.telefono,p_correo:d.correo,p_nacimiento:d.fecha_nacimiento})
    if(r.error) return setM({t:'err',text:r.error.message}); setM({t:'ok',text:d.id_cliente?'Cliente actualizado':`Cliente registrado. Clave de socio: ${r.data}`});setEd(null);cargar()}
  return <><h1>Clientes</h1><div className="sub">Registro, edición y vigencia de membresía</div><Msg m={m}/>
    <div className="card"><div className="row" style={{justifyContent:'space-between'}}><input style={{maxWidth:320}} placeholder="Buscar por nombre, clave o correo" value={q} onChange={e=>setQ(e.target.value)}/>
    <button className="btn" onClick={()=>{setM(null);setEd({nombre_completo:'',telefono:'',correo:'',fecha_nacimiento:'',activo:true})}}>Registrar cliente</button></div>
    <Table rows={f} cols={[{h:'Clave',r:r=>r.clave_socio},{h:'Nombre',r:r=>r.nombre_completo},{h:'Teléfono',r:r=>r.telefono},
      {h:'Inicio membresía',r:r=>vig[r.id_cliente]?.fecha_inicio||'—'},{h:'Fin membresía',r:r=>vig[r.id_cliente]?.fecha_fin||'—'},{h:'Estado',r:r=>r.activo?<Badge ok>Activo</Badge>:<Badge>Inactivo</Badge>},{h:'Membresía',r:r=>r.activo?estadoMem(vig[r.id_cliente]):'—'},
      {h:'',r:r=><button className="btn ghost sm" onClick={()=>{setM(null);setEd(r)}}>Editar</button>}]}/></div>
    {ed&&<Modal title={ed.id_cliente?'Editar cliente':'Registrar cliente'} onClose={()=>setEd(null)}>
      {ed.id_cliente&&<div className="sub">Clave {ed.clave_socio} · Membresía: {vig[ed.id_cliente]?`${vig[ed.id_cliente].fecha_inicio} al ${vig[ed.id_cliente].fecha_fin}`:'sin membresía activa'}</div>}
      <form onSubmit={guardar} className="form">
      <F l="Nombre completo"><input required value={ed.nombre_completo} onChange={e=>setEd({...ed,nombre_completo:e.target.value})}/></F>
      <F l="Teléfono (10 dígitos)"><input required maxLength={10} value={ed.telefono} onChange={e=>setEd({...ed,telefono:e.target.value.replace(/\D/g,'')})}/></F>
      <F l="Correo electrónico"><input required type="email" value={ed.correo} onChange={e=>setEd({...ed,correo:e.target.value})}/></F>
      <F l="Fecha de nacimiento"><input required type="date" max={hoy()} value={ed.fecha_nacimiento} onChange={e=>setEd({...ed,fecha_nacimiento:e.target.value})}/></F>
      {ed.id_cliente&&<F l="Estado"><select value={ed.activo?'1':'0'} onChange={e=>setEd({...ed,activo:e.target.value==='1'})}><option value="1">Activo</option><option value="0">Inactivo</option></select></F>}
      <button className="btn">Guardar</button></form></Modal>}</>
}

/* Interfaz: Membresías por vencer | Consulta | Actores: Recepcionista y Administrador | BD: SELECT vw_membresia_vigencia, cliente, tipo_membresia | Autor: [Nombre del Integrante del Equipo] */
export function PorVencer() {
  const [dias,setDias]=useState(7),[rows,setRows]=useState([])
  useEffect(()=>{(async()=>{const [v,c,t]=await Promise.all([supabase.from('vw_membresia_vigencia').select('*'),supabase.from('cliente').select('id_cliente,clave_socio,nombre_completo,telefono').eq('activo',true),supabase.from('tipo_membresia').select('id_tipo_membresia,nombre')])
    const u=ultimas(v.data);const cl=Object.fromEntries((c.data||[]).map(x=>[x.id_cliente,x]));const tp=Object.fromEntries((t.data||[]).map(x=>[x.id_tipo_membresia,x.nombre]))
    setRows(Object.values(u).filter(x=>cl[x.id_cliente]&&x.fecha_fin<=mas(dias)).map(x=>({...x,c:cl[x.id_cliente],tipo:tp[x.id_tipo_membresia]})).sort((a,b)=>a.fecha_fin.localeCompare(b.fecha_fin)))})()},[dias])
  const d=(f)=>Math.round((new Date(f)-new Date(hoy()))/864e5)
  return <><h1>Membresías por vencer</h1><div className="sub">Incluye las ya vencidas sin renovar</div>
    <div className="card"><div className="row"><label style={{margin:0}}>Vencen en los próximos</label><select style={{width:130}} value={dias} onChange={e=>setDias(+e.target.value)}>{[3,7,15,30].map(n=><option key={n} value={n}>{n} días</option>)}</select></div>
    <Table rows={rows} empty="No hay membresías por vencer en ese periodo" cols={[{h:'Clave',r:r=>r.c.clave_socio},{h:'Cliente',r:r=>r.c.nombre_completo},{h:'Teléfono',r:r=>r.c.telefono},{h:'Plan',r:r=>r.tipo},{h:'Vence',r:r=>r.fecha_fin},
      {h:'Estado',r:r=>d(r.fecha_fin)<0?<Badge>Vencida hace {-d(r.fecha_fin)} d</Badge>:<Badge warn>{d(r.fecha_fin)===0?'Vence hoy':`Faltan ${d(r.fecha_fin)} d`}</Badge>}]}/></div></>
}

/* Interfaz: Punto de venta e inventario | Transacción | Actores: Recepcionista y Administrador | BD: SELECT inventario, producto, metodo_pago, sucursal; RPC rpc_venta_registrar (INSERT venta/detalle_venta, UPDATE inventario.stock_actual) | Autor: [Nombre del Integrante del Equipo] */
export function Venta() {
  const { perfil } = useAuth(); const suc=useSuc(); const [sid,setSid]=useState(perfil.id_sucursal)
  const [inv,setInv]=useState([]),[mp,setMp]=useState([]),[cart,setCart]=useState({}),[met,setMet]=useState(''),[cat,setCat]=useState(''),[m,setM]=useState(null)
  const cargar=useCallback(async()=>{const [a,b]=await Promise.all([supabase.from('inventario').select('*, producto(*)').eq('id_sucursal',sid),supabase.from('metodo_pago').select('*').eq('activo',true)])
    setInv((a.data||[]).filter(i=>i.producto.uso_previsto==='VENTA'&&i.producto.activo));setMp(b.data||[])},[sid])
  useEffect(()=>{cargar();setCart({})},[cargar])
  const cats=[...new Set(inv.map(i=>i.producto.categoria))]
  const items=inv.filter(i=>cart[i.id_producto]),total=items.reduce((s,i)=>s+cart[i.id_producto]*Number(i.producto.precio_venta),0)
  const add=(i,d)=>{const n=(cart[i.id_producto]||0)+d;if(n>i.stock_actual)return setM({t:'err',text:`Solo hay ${i.stock_actual} en ${i.producto.nombre}`});const c={...cart};n<=0?delete c[i.id_producto]:c[i.id_producto]=n;setCart(c)}
  const vender=async()=>{const {data,error}=await supabase.rpc('rpc_venta_registrar',{p_id_metodo:+met,p_id_sucursal:+sid,p_items:items.map(i=>({id_producto:i.id_producto,cantidad:cart[i.id_producto]}))})
    if(error)return setM({t:'err',text:error.message});setM({t:'ok',text:`Venta registrada. Folio ${data}`});setCart({});cargar()}
  return <><h1>Punto de venta</h1><div className="sub">Inventario por sucursal</div><Msg m={m}/>
    <div className="card"><div className="row">{perfil.esAdmin?<select style={{maxWidth:240}} value={sid} onChange={e=>setSid(+e.target.value)}>{suc.map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}</select>:<b>{perfil.sucursal.nombre}</b>}
      <button className={'btn sm '+(cat?'ghost':'')} onClick={()=>setCat('')}>Todas</button>{cats.map(c=><button key={c} className={'btn sm '+(cat===c?'':'ghost')} onClick={()=>setCat(c)}>{c}</button>)}</div>
    <Table per={7} rows={inv.filter(i=>!cat||i.producto.categoria===cat)} cols={[{h:'Producto',r:i=>i.producto.nombre},{h:'Categoría',r:i=>i.producto.categoria},{h:'Precio',r:i=>money(i.producto.precio_venta)},
      {h:'Stock',r:i=>i.stock_actual<=i.stock_minimo?<Badge warn>{i.stock_actual} · stock mínimo</Badge>:i.stock_actual},
      {h:'',r:i=><div className="row"><button className="btn ghost sm" onClick={()=>add(i,-1)}>−</button>{cart[i.id_producto]||0}<button className="btn sm" disabled={!i.stock_actual} onClick={()=>add(i,1)}>+</button></div>}]}/></div>
    <div className="card"><table><thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>{items.map(i=><tr key={i.id_producto}><td>{i.producto.nombre}</td><td>{cart[i.id_producto]}</td><td>{money(cart[i.id_producto]*i.producto.precio_venta)}</td></tr>)}</tbody></table>
    <div className="row" style={{justifyContent:'space-between',marginTop:12}}><b>Total: {money(total)}</b><div className="row"><select style={{width:180}} value={met} onChange={e=>setMet(e.target.value)}><option value="">Método de pago</option>{mp.map(t=><option key={t.id_metodo_pago} value={t.id_metodo_pago}>{t.nombre}</option>)}</select>
    <button className="btn" disabled={!items.length||!met} onClick={vender}>Registrar venta</button></div></div></div></>
}

/* Interfaz: Asistencia | Consulta (el administrador ve a todo el personal, con nombre, rol y sucursal) y salida manual | Actores: Recepcionista y Administrador | BD: SELECT asistencia; RPC rpc_asistencia_marcar (UPDATE salida). La entrada se registra automáticamente al iniciar sesión | Autor: [Nombre del Integrante del Equipo] */
export function Asistencia() {
  const { perfil } = useAuth(); const [rows,setRows]=useState([]),[m,setM]=useState(null)
  const cargar=useCallback(async()=>{let q=supabase.from('asistencia').select('*, empleado(nombre_completo, rol(nombre), sucursal(nombre))').order('entrada',{ascending:false}).limit(200)
    if(!perfil.esAdmin) q=q.eq('id_empleado',perfil.id_empleado) // el administrador ve a todo el personal
    const {data}=await q;setRows(data||[])},[perfil])
  useEffect(()=>{cargar()},[cargar])
  const abierta=rows.some(r=>!r.salida&&r.id_empleado===perfil.id_empleado)
  const salida=async()=>{const {error}=await supabase.rpc('rpc_asistencia_marcar',{p_tipo:'SALIDA'});setM(error?{t:'err',text:error.message}:{t:'ok',text:'Salida registrada'});cargar()}
  return <><h1>Asistencia</h1><div className="sub">{perfil.nombre_completo} · {perfil.sucursal.nombre}. La entrada se registra al iniciar sesión.</div><Msg m={m}/>
    <div className="card row"><button className="btn" disabled={!abierta} onClick={salida}>Marcar salida</button>{abierta?<Badge warn>En turno</Badge>:<Badge ok>Salida registrada</Badge>}</div>
    <div className="card"><Table rows={rows} cols={[{h:'Empleado',r:r=>r.empleado?.nombre_completo},{h:'Rol',r:r=>r.empleado?.rol?.nombre},...(perfil.esAdmin?[{h:'Sucursal',r:r=>r.empleado?.sucursal?.nombre}]:[]),{h:'Entrada',r:r=>fecha(r.entrada)},{h:'Salida',r:r=>r.salida?fecha(r.salida):<Badge warn>Pendiente</Badge>}]}/></div></>
}

/* Interfaz: Corte y cierre de caja | Transacción/Consulta | Actores: Recepcionista (su sucursal) y Administrador (todas) | BD: SELECT pago, vw_venta_total, metodo_pago, vw_corte_caja_resumen; RPC rpc_corte_crear (INSERT corte_caja) | Autor: [Nombre del Integrante del Equipo] */
export function Cortes() {
  const { perfil } = useAuth(); const suc=useSuc(); const [rows,setRows]=useState([]),[m,setM]=useState(null),[pre,setPre]=useState(null)
  const [f,setF]=useState({s:perfil.esAdmin?'':perfil.id_sucursal,i:'',fin:'',fondo:'0',contado:'',obs:''})
  const cargar=useCallback(async()=>{const {data}=await supabase.from('vw_corte_caja_resumen').select('*').order('fecha_cierre',{ascending:false});setRows(data||[])},[])
  useEffect(()=>{cargar()},[cargar])
  // Vista previa del arqueo con los cobros y ventas del periodo elegido
  useEffect(()=>{setPre(null);if(!f.s||!f.i||!f.fin)return;(async()=>{const ini=new Date(f.i).toISOString(),fin=new Date(f.fin).toISOString()
    const [p,v,mp]=await Promise.all([supabase.from('pago').select('monto,id_metodo_pago').eq('id_sucursal',f.s).gte('fecha_hora',ini).lt('fecha_hora',fin),supabase.from('vw_venta_total').select('total,id_metodo_pago').eq('id_sucursal',f.s).gte('fecha_hora',ini).lt('fecha_hora',fin),supabase.from('metodo_pago').select('id_metodo_pago,es_efectivo')])
    const ef=Object.fromEntries((mp.data||[]).map(x=>[x.id_metodo_pago,x.es_efectivo]));let ing=0,efe=0
    ;(p.data||[]).forEach(x=>{ing+=+x.monto;if(ef[x.id_metodo_pago])efe+=+x.monto});(v.data||[]).forEach(x=>{ing+=+x.total;if(ef[x.id_metodo_pago])efe+=+x.total});setPre({ing,efe})})()},[f.s,f.i,f.fin])
  const esperado=pre?+f.fondo+pre.efe:null, dif=pre&&f.contado!==''?+f.contado-esperado:null
  const crear=async(e)=>{e.preventDefault()
    const {data,error}=await supabase.rpc('rpc_corte_crear',{p_id_sucursal:+f.s,p_inicio:new Date(f.i).toISOString(),p_fin:new Date(f.fin).toISOString(),p_fondo:+f.fondo,p_contado:+f.contado,p_obs:f.obs})
    if(error)return setM({t:'err',text:error.message});setM({t:'ok',text:`Corte registrado: ${data}`});cargar()}
  const nom=(id)=>suc.find(s=>s.id_sucursal===id)?.nombre||perfil.sucursal.nombre
  return <><h1>Corte de caja</h1><div className="sub">Monto esperado = fondo inicial + cobros y ventas en efectivo del periodo</div><Msg m={m}/>
    <form className="card form" onSubmit={crear}>
      {perfil.esAdmin?<F l="Sucursal"><select required value={f.s} onChange={e=>setF({...f,s:e.target.value})}><option value="">Seleccionar</option>{suc.map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}</select></F>:<F l="Sucursal"><input disabled value={perfil.sucursal.nombre}/></F>}
      <F l="Inicio del periodo"><input required type="datetime-local" value={f.i} onChange={e=>setF({...f,i:e.target.value})}/></F><F l="Fin del periodo"><input required type="datetime-local" max={new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16)} value={f.fin} onChange={e=>setF({...f,fin:e.target.value})}/></F>
      <F l="Fondo inicial"><input required type="number" min="0" step="0.01" value={f.fondo} onChange={e=>setF({...f,fondo:e.target.value})}/></F>
      <F l="Efectivo contado"><input required type="number" min="0" step="0.01" value={f.contado} onChange={e=>setF({...f,contado:e.target.value})}/></F>
      <F l="Observaciones"><input value={f.obs} onChange={e=>setF({...f,obs:e.target.value})}/></F>
      <div className="grid" style={{gridColumn:'1/-1'}}><div className="card kpi" style={{margin:0}}>Ingresos del periodo<b>{pre?money(pre.ing):'—'}</b></div><div className="card kpi" style={{margin:0}}>Monto esperado<b>{esperado!=null?money(esperado):'—'}</b></div>
        <div className="card kpi" style={{margin:0}}>Efectivo contado<b>{f.contado!==''?money(f.contado):'—'}</b></div><div className="card kpi" style={{margin:0}}>Diferencia (cambio esperado)<b>{dif!=null?money(dif):'—'}</b></div></div>
      <button className="btn">Cerrar caja</button></form>
    <div className="card"><Table rows={rows} cols={[{h:'Folio',r:r=>r.folio},{h:'Sucursal',r:r=>nom(r.id_sucursal)},{h:'Periodo',r:r=>`${fecha(r.inicio)} – ${fecha(r.fin)}`},{h:'Ingresos',r:r=>money(r.total_ingresos)},
      {h:'Monto esperado',r:r=>money(r.efectivo_esperado)},{h:'Contado',r:r=>money(r.efectivo_contado)},{h:'Diferencia',r:r=>Number(r.diferencia)===0?<Badge ok>{money(0)}</Badge>:<Badge>{money(r.diferencia)}</Badge>}]}/></div></>
}
