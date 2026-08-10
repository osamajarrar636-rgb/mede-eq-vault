export const cn = (...classes: Array<string|false|null|undefined>) => classes.filter(Boolean).join(' ');
export const formatDate = (value?: string|null) => value ? new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(value)) : 'Not specified';
export const statusLabel = (s:string) => s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
