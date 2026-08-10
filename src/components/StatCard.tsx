import type { LucideIcon } from 'lucide-react';
export function StatCard({label,value,icon:Icon,accent}:{label:string;value:number|string;icon:LucideIcon;accent?:string}){return <div className="stat-card"><div className={`stat-icon ${accent||''}`}><Icon size={20}/></div><div><p className="muted text-sm">{label}</p><p className="stat-value">{value}</p></div></div>}
