import { useState } from 'react'
export const Msg = ({m}) => m ? <div className={'msg '+(m.t==='ok'?'ok':'err')}>{m.text}</div> : null
export const Badge = ({ok,children,warn}) => <span className={'badge '+(warn?'b-warn':ok?'b-ok':'b-no')}>{children}</span>
export function Table({cols,rows,per=8,empty='Sin registros'}) {
  const [p,setP]=useState(0); const pages=Math.max(1,Math.ceil(rows.length/per)); const cur=Math.min(p,pages-1)
  return <>
    <table><thead><tr>{cols.map(c=><th key={c.h}>{c.h}</th>)}</tr></thead>
    <tbody>{rows.slice(cur*per,cur*per+per).map((r,i)=><tr key={i}>{cols.map(c=><td key={c.h}>{c.r(r)}</td>)}</tr>)}
    {!rows.length&&<tr><td colSpan={cols.length} style={{color:'#9a9aa3'}}>{empty}</td></tr>}</tbody></table>
    <div className="pager"><button className="btn ghost sm" disabled={cur===0} onClick={()=>setP(cur-1)}>Anterior</button>
    <span>Página {cur+1} de {pages}</span><button className="btn ghost sm" disabled={cur>=pages-1} onClick={()=>setP(cur+1)}>Siguiente</button></div></>
}
export const Modal = ({title,onClose,children}) => <div className="modal"><div className="card"><div className="row" style={{justifyContent:'space-between'}}><h1>{title}</h1><button className="btn ghost sm" onClick={onClose}>Cerrar</button></div>{children}</div></div>
export const F = ({l,children}) => <div><label>{l}</label>{children}</div>
export const Confirm = ({text,onYes,onNo}) => <div className="modal"><div className="card" style={{width:380}}><h1 style={{fontSize:17}}>{text}</h1><div className="row" style={{justifyContent:'flex-end',marginTop:16}}><button className="btn ghost" onClick={onNo}>Cancelar</button><button className="btn" onClick={onYes}>Confirmar</button></div></div></div>
export function useTheme(){
  const [t,setT]=useState(()=>localStorage.getItem('tr-theme')||'dark')
  const set=(v)=>{localStorage.setItem('tr-theme',v);document.documentElement.dataset.theme=v;setT(v)}
  document.documentElement.dataset.theme=t
  return [t,()=>set(t==='dark'?'light':'dark')]
}
export const ThemeBtn = () => { const [t,tog]=useTheme(); return <button className="btn ghost sm" onClick={tog}>{t==='dark'?'Modo blanco':'Modo oscuro'}</button> }
