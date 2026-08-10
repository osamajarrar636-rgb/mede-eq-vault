import { Inbox } from 'lucide-react';
export function EmptyState({title='Nothing here yet',description='No records match your current filters.'}:{title?:string;description?:string}){return <div className="empty"><Inbox size={30}/><h3>{title}</h3><p>{description}</p></div>}
