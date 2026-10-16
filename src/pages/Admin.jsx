import { useEffect, useState, useCallback } from 'react'
import { supabase, money, fecha } from '../supabase'
import { useAuth } from '../App'
import { Msg, Badge, Table, Modal, F } from '../ui'
const RE_MAIL=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, RE_TEL=/^[0-9]{10}$/
const CATS=['Proteínas','Barras Energéticas','Agua','Pre-entreno','Creatina','Bebidas Energéticas']
const useSuc=()=>{const [s,setS]=useState([]);useEffect(()=>{supabase.from('sucursal').select('*').order('id_sucursal').then(r=>setS(r.data||[]))},[]);return s}

/* Interfaz: Dashboard general | Consulta | Actor: Administrador | BD: SELECT sucursal, cliente, pago, vw_venta_total, inventario | Autor: [Nombre del Integrante del Equipo] */
export function ADashboard() {
  const [d,setD]=useState([]),[bajo,setBajo]=useState(0)
  useEffect(() => {

  const obtenerDatos = async () => {
    setBajo((i.data || []).filter(x => x.stock_actual <= x.stock_minimo).length);
  };

  obtenerDatos();
}, []);
  const t=(k)=>d.reduce((a,x)=>a+x[k],0)
  return <><h1>Dashboard general</h1><div className="sub">Métricas globales y por sucursal</div>
    <div className="grid"><div className="card kpi">Sucursales activas<b>{d.length}</b></div><div className="card kpi">Clientes activos<b>{t('clientes')}</b></div>
    <div className="card kpi">Ingresos por membresías<b>{money(t('pagos'))}</b></div><div className="card kpi">Ventas de productos<b>{money(t('ventas'))}</b></div>
    <div className="card kpi">Productos en stock mínimo<b>{bajo}</b></div></div>
    <div className="card"><Table rows={d} cols={[{h:'Sucursal',r:r=>r.nombre},{h:'Clientes',r:r=>r.clientes},{h:'Membresías',r:r=>money(r.pagos)},{h:'Ventas',r:r=>money(r.ventas)}]}/></div></>
}

/* Interfaz: Gestión de empleados | Registro/Actualización/Baja lógica/Consulta | Actor: Administrador | BD: SELECT empleado, rol, sucursal; RPC rpc_empleado_crear (INSERT empleado + usuario Auth), rpc_empleado_actualizar (UPDATE correo, sucursal, rol, activo) | Autor: [Nombre del Integrante del Equipo] */
export function Empleados() {
  const { perfil } = useAuth(); const suc=useSuc(); const [rows,setRows]=useState([]),[roles,setRoles]=useState([]),[ed,setEd]=useState(null),[m,setM]=useState(null)
  const cargar=useCallback(async()=>{const [a,b]=await Promise.all([supabase.from('empleado').select('*, rol(nombre), sucursal(nombre)').order('id_empleado'),supabase.from('rol').select('*')]);setRows(a.data||[]);setRoles(b.data||[])},[])
  useEffect(()=>{cargar()},[cargar])
  const nuevo=()=>{setM(null);setEd({nuevo:true,usuario:'',password:'',nombre_completo:'',telefono:'',correo:'',puesto:'Recepcionista',turno:'',activo:true,id_sucursal:suc[0]?.id_sucursal||'',id_rol:roles.find(r=>r.nombre==='RECEPCIONISTA')?.id_rol||''})}
  const guardar=async(e)=>{e.preventDefault(); const d=ed
    if(!RE_MAIL.test(d.correo)) return setM({t:'err',text:'Correo electrónico inválido'})
    if(!RE_TEL.test(d.telefono)) return setM({t:'err',text:'El teléfono debe tener 10 dígitos'})
    const r=d.nuevo
      ? await supabase.rpc('rpc_empleado_crear',{p_usuario:d.usuario,p_password:d.password,p_nombre:d.nombre_completo,p_telefono:d.telefono,p_correo:d.correo,p_puesto:d.puesto,p_id_sucursal:+d.id_sucursal,p_id_rol:+d.id_rol,p_turno:d.turno})
      : await supabase.rpc('rpc_empleado_actualizar',{p_id:d.id_empleado,p_nombre:d.nombre_completo,p_telefono:d.telefono,p_correo:d.correo,p_id_sucursal:+d.id_sucursal,p_id_rol:+d.id_rol,p_turno:d.turno||'',p_activo:d.activo,p_password:d.password||null})
    if(r.error) return setM({t:'err',text:r.error.message.includes('empleado_usuario')?'Ese usuario ya existe':r.error.message}); setM({t:'ok',text:d.nuevo?'Empleado registrado':'Empleado actualizado'}); setEd(null); cargar()}
  return <><h1>Empleados</h1><div className="sub">Alta de recepcionistas, corrección de correo, cambio de sucursal y baja lógica</div><Msg m={m}/>
    <div className="card"><div className="row" style={{justifyContent:'flex-end'}}><button className="btn" onClick={nuevo}>Registrar empleado</button></div>
    <Table rows={rows} cols={[{h:'Usuario',r:r=>r.usuario},{h:'Nombre',r:r=>r.nombre_completo},{h:'Rol',r:r=>r.rol.nombre},{h:'Sucursal',r:r=>r.sucursal.nombre},{h:'Correo',r:r=>r.correo},
      {h:'Estado',r:r=>r.activo?<Badge ok>Activo</Badge>:<Badge>Baja</Badge>},{h:'',r:r=><button className="btn ghost sm" onClick={()=>{setM(null);setEd({...r,password:''})}}>Editar</button>}]}/></div>
    {ed&&<Modal title={ed.nuevo?'Registrar empleado':'Editar empleado'} onClose={()=>setEd(null)}><form className="form" onSubmit={guardar}>
      {ed.nuevo&&<F l="Usuario"><input required value={ed.usuario} onChange={e=>setEd({...ed,usuario:e.target.value.replace(/\s/g,'')})}/></F>}
      <F l={ed.nuevo?'Contraseña (mín. 6)':'Nueva contraseña (opcional)'}><input type="password" minLength={ed.nuevo?6:0} required={ed.nuevo} value={ed.password} onChange={e=>setEd({...ed,password:e.target.value})}/></F>
      <F l="Nombre completo"><input required value={ed.nombre_completo} onChange={e=>setEd({...ed,nombre_completo:e.target.value})}/></F>
      <F l="Teléfono (10 dígitos)"><input required maxLength={10} value={ed.telefono} onChange={e=>setEd({...ed,telefono:e.target.value.replace(/\D/g,'')})}/></F>
      <F l="Correo electrónico"><input required type="email" value={ed.correo} onChange={e=>setEd({...ed,correo:e.target.value})}/></F>
      <F l="Rol"><select value={ed.id_rol} onChange={e=>setEd({...ed,id_rol:e.target.value})}>{roles.map(r=><option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}</select></F>
      <F l="Sucursal (obligatoria)"><select required value={ed.id_sucursal} onChange={e=>setEd({...ed,id_sucursal:e.target.value})}>{suc.filter(s=>s.activo).map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}</select></F>
      <F l="Turno"><input value={ed.turno||''} onChange={e=>setEd({...ed,turno:e.target.value})}/></F>
      {!ed.nuevo&&<F l="Estado"><select disabled={ed.id_empleado===perfil.id_empleado} value={ed.activo?'1':'0'} onChange={e=>setEd({...ed,activo:e.target.value==='1'})}><option value="1">Activo</option><option value="0">Dar de baja</option></select></F>}
      <button className="btn">Guardar</button></form></Modal>}</>
}

/* Interfaz: Gestión de sucursales | Registro/Actualización | Actor: Administrador | BD: SELECT/INSERT/UPDATE sucursal | Autor: [Nombre del Integrante del Equipo] */
export function Sucursales() {
  const [rows,setRows]=useState([]),[ed,setEd]=useState(null),[m,setM]=useState(null)
  const cargar=useCallback(async()=>{const {data}=await supabase.from('sucursal').select('*').order('id_sucursal');setRows(data||[])},[])
  useEffect(()=>{cargar()},[cargar])
  const guardar=async(e)=>{e.preventDefault(); const {id_sucursal,...v}=ed; v.nombre=v.nombre.trim();v.direccion=v.direccion.trim()
    if(!RE_TEL.test(v.telefono)) return setM({t:'err',text:'El teléfono debe tener 10 dígitos'})
    const r=id_sucursal?await supabase.from('sucursal').update(v).eq('id_sucursal',id_sucursal):await supabase.from('sucursal').insert(v)
    if(r.error) return setM({t:'err',text:r.error.code==='23505'?'Ya existe una sucursal con ese nombre o dirección':r.error.message}); setM({t:'ok',text:'Sucursal guardada'});setEd(null);cargar()}
  return <><h1>Sucursales</h1><div className="sub">Gestión de sucursales</div><Msg m={m}/>
    <div className="card"><div className="row" style={{justifyContent:'flex-end'}}><button className="btn" onClick={()=>setEd({nombre:'',direccion:'',telefono:'',responsable:'',activo:true})}>Registrar sucursal</button></div>
    <Table rows={rows} cols={[{h:'Nombre',r:r=>r.nombre},{h:'Dirección',r:r=>r.direccion},{h:'Teléfono',r:r=>r.telefono},{h:'Responsable',r:r=>r.responsable},{h:'Estado',r:r=>r.activo?<Badge ok>Activa</Badge>:<Badge>Inactiva</Badge>},
      {h:'',r:r=><button className="btn ghost sm" onClick={()=>setEd(r)}>Editar</button>}]}/></div>
    {ed&&<Modal title={ed.id_sucursal?'Editar sucursal':'Registrar sucursal'} onClose={()=>setEd(null)}><form className="form" onSubmit={guardar}>
      {['nombre','direccion','telefono','responsable'].map(k=><F key={k} l={k[0].toUpperCase()+k.slice(1)}><input required maxLength={k==='telefono'?10:200} value={ed[k]} onChange={e=>setEd({...ed,[k]:k==='telefono'?e.target.value.replace(/\D/g,''):e.target.value})}/></F>)}
      {ed.id_sucursal&&<F l="Estado"><select value={ed.activo?'1':'0'} onChange={e=>setEd({...ed,activo:e.target.value==='1'})}><option value="1">Activa</option><option value="0">Inactiva</option></select></F>}
      <button className="btn">Guardar</button></form></Modal>}</>
}

/* Interfaz: Productos e inventario | Registro/Actualización/Consulta | Actor: Administrador | BD: SELECT producto, inventario; INSERT producto; UPDATE producto.precio_venta, inventario.stock_actual/stock_minimo | Autor: [Nombre del Integrante del Equipo] */
export function Productos() {
  const suc=useSuc(); const [sid,setSid]=useState(''),[rows,setRows]=useState([]),[ed,setEd]=useState(null),[np,setNp]=useState(null),[m,setM]=useState(null)
  useEffect(()=>{if(!sid&&suc.length)setSid(suc[0].id_sucursal)},[suc,sid])
  const cargar=useCallback(async()=>{if(!sid)return;const {data}=await supabase.from('inventario').select('*, producto(*)').eq('id_sucursal',sid);setRows((data||[]).sort((a,b)=>a.producto.categoria.localeCompare(b.producto.categoria)))},[sid])
  useEffect(()=>{cargar()},[cargar])
  const guardar=async(e)=>{e.preventDefault()
    const a=await supabase.from('producto').update({precio_venta:+ed.producto.precio_venta}).eq('id_producto',ed.id_producto)
    const b=await supabase.from('inventario').update({stock_actual:+ed.stock_actual,stock_minimo:+ed.stock_minimo}).eq('id_inventario',ed.id_inventario)
    const er=a.error||b.error; if(er) return setM({t:'err',text:er.message}); setM({t:'ok',text:'Producto actualizado'});setEd(null);cargar()}
  const crear=async(e)=>{e.preventDefault();const r=await supabase.from('producto').insert({...np,uso_previsto:'VENTA',precio_venta:+np.precio_venta})
    if(r.error) return setM({t:'err',text:r.error.code==='23505'?'Ya existe un producto con ese nombre':r.error.message});setM({t:'ok',text:'Producto registrado en todas las sucursales (stock 0)'});setNp(null);cargar()}
  return <><h1>Productos e inventario</h1><div className="sub">Precios globales; stock y mínimo por sucursal</div><Msg m={m}/>
    <div className="card"><div className="row" style={{justifyContent:'space-between'}}><select style={{maxWidth:260}} value={sid} onChange={e=>setSid(e.target.value)}>{suc.map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}</select>
    <button className="btn" onClick={()=>setNp({nombre:'',descripcion:'',categoria:CATS[0],proveedor:'',precio_venta:''})}>Registrar producto</button></div>
    <Table rows={rows} per={10} cols={[{h:'Producto',r:r=>r.producto.nombre},{h:'Categoría',r:r=>r.producto.categoria},{h:'Precio',r:r=>money(r.producto.precio_venta)},{h:'Stock',r:r=>r.stock_actual},{h:'Mínimo',r:r=>r.stock_minimo},
      {h:'Estado',r:r=>r.stock_actual<=r.stock_minimo?<Badge warn>Reabastecer</Badge>:<Badge ok>Normal</Badge>},{h:'',r:r=><button className="btn ghost sm" onClick={()=>setEd(r)}>Editar</button>}]}/></div>
    {ed&&<Modal title={ed.producto.nombre} onClose={()=>setEd(null)}><form className="form" onSubmit={guardar}>
      <F l="Precio de venta"><input required type="number" min="0.01" step="0.01" value={ed.producto.precio_venta} onChange={e=>setEd({...ed,producto:{...ed.producto,precio_venta:e.target.value}})}/></F>
      <F l="Stock actual"><input required type="number" min="0" value={ed.stock_actual} onChange={e=>setEd({...ed,stock_actual:e.target.value})}/></F>
      <F l="Stock mínimo"><input required type="number" min="0" value={ed.stock_minimo} onChange={e=>setEd({...ed,stock_minimo:e.target.value})}/></F><button className="btn">Guardar</button></form></Modal>}
    {np&&<Modal title="Registrar producto" onClose={()=>setNp(null)}><form className="form" onSubmit={crear}>
      <F l="Nombre"><input required value={np.nombre} onChange={e=>setNp({...np,nombre:e.target.value.trim()})}/></F><F l="Descripción"><input required value={np.descripcion} onChange={e=>setNp({...np,descripcion:e.target.value})}/></F>
      <F l="Categoría"><select value={np.categoria} onChange={e=>setNp({...np,categoria:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></F>
      <F l="Precio de venta"><input required type="number" min="0.01" step="0.01" value={np.precio_venta} onChange={e=>setNp({...np,precio_venta:e.target.value})}/></F><button className="btn">Guardar</button></form></Modal>}</>
}

/* Interfaz: Corte y cierre de caja | Transacción/Consulta | Actor: Administrador | BD: SELECT vw_corte_caja_resumen; RPC rpc_corte_crear (INSERT corte_caja) | Autor: [Nombre del Integrante del Equipo] */
export function Cortes() {
  const suc=useSuc(); const [rows,setRows]=useState([]),[m,setM]=useState(null)
  const [f,setF]=useState({s:'',i:'',fin:'',fondo:'0',contado:'',obs:''})
  const cargar=useCallback(async()=>{const {data}=await supabase.from('vw_corte_caja_resumen').select('*').order('fecha_cierre',{ascending:false});setRows(data||[])},[])
  useEffect(()=>{cargar()},[cargar])
  const crear=async(e)=>{e.preventDefault()
    const {data,error}=await supabase.rpc('rpc_corte_crear',{p_id_sucursal:+f.s,p_inicio:new Date(f.i).toISOString(),p_fin:new Date(f.fin).toISOString(),p_fondo:+f.fondo,p_contado:+f.contado,p_obs:f.obs})
    if(error) return setM({t:'err',text:error.message}); setM({t:'ok',text:`Corte registrado: ${data}`}); cargar()}
  const nom=(id)=>suc.find(s=>s.id_sucursal===id)?.nombre
  return <><h1>Corte de caja</h1><div className="sub">Efectivo esperado = fondo + cobros y ventas en efectivo del periodo</div><Msg m={m}/>
    <form className="card form" onSubmit={crear}>
      <F l="Sucursal"><select required value={f.s} onChange={e=>setF({...f,s:e.target.value})}><option value="">Seleccionar</option>{suc.map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}</select></F>
      <F l="Inicio del periodo"><input required type="datetime-local" value={f.i} onChange={e=>setF({...f,i:e.target.value})}/></F><F l="Fin del periodo"><input required type="datetime-local" value={f.fin} onChange={e=>setF({...f,fin:e.target.value})}/></F>
      <F l="Fondo inicial"><input required type="number" min="0" step="0.01" value={f.fondo} onChange={e=>setF({...f,fondo:e.target.value})}/></F>
      <F l="Efectivo contado"><input required type="number" min="0" step="0.01" value={f.contado} onChange={e=>setF({...f,contado:e.target.value})}/></F>
      <F l="Observaciones"><input value={f.obs} onChange={e=>setF({...f,obs:e.target.value})}/></F><button className="btn">Cerrar caja</button></form>
    <div className="card"><Table rows={rows} cols={[{h:'Folio',r:r=>r.folio},{h:'Sucursal',r:r=>nom(r.id_sucursal)},{h:'Periodo',r:r=>`${fecha(r.inicio)} – ${fecha(r.fin)}`},{h:'Ingresos',r:r=>money(r.total_ingresos)},
      {h:'Esperado',r:r=>money(r.efectivo_esperado)},{h:'Contado',r:r=>money(r.efectivo_contado)},{h:'Diferencia',r:r=>Number(r.diferencia)===0?<Badge ok>{money(0)}</Badge>:<Badge>{money(r.diferencia)}</Badge>}]}/></div></>
}

/* Interfaz: Bitácora de auditoría | Consulta | Actor: Administrador | BD: SELECT bitacora, empleado | Autor: [Nombre del Integrante del Equipo] */
export function Bitacora() {
  const [rows,setRows]=useState([]),[q,setQ]=useState('')
  useEffect(()=>{supabase.from('bitacora').select('*, empleado(nombre_completo)').order('fecha_hora',{ascending:false}).limit(500).then(r=>setRows(r.data||[]))},[])
  const f=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
  return <><h1>Bitácora de auditoría</h1><div className="sub">Últimas 500 acciones registradas</div>
    <div className="card"><input style={{maxWidth:320,marginBottom:10}} placeholder="Filtrar" value={q} onChange={e=>setQ(e.target.value)}/>
    <Table rows={f} per={12} cols={[{h:'Fecha',r:r=>fecha(r.fecha_hora)},{h:'Usuario',r:r=>r.empleado?.nombre_completo||'Sistema'},{h:'Acción',r:r=>r.accion},{h:'Entidad',r:r=>r.entidad},{h:'Ref.',r:r=>r.referencia_registro},{h:'Detalle',r:r=>r.detalle}]}/></div></>
}
