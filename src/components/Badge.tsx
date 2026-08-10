import { cn } from '../lib/ui';
export function Badge({status}:{status:string}){return <span className={cn('badge',status==='APPROVED'&&'badge-green',status==='PENDING'&&'badge-amber',(status==='REJECTED')&&'badge-red',status==='CHANGES_REQUESTED'&&'badge-blue')}>{status.replaceAll('_',' ')}</span>}
