import { createContext,useContext,useEffect,useMemo,useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextValue { user:any; profile:Profile|null; loading:boolean; signOut:()=>Promise<void>; refreshProfile:()=>Promise<void>; }
const AuthContext=createContext<AuthContextValue>({user:null,profile:null,loading:true,signOut:async()=>{},refreshProfile:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<any>(null); const [profile,setProfile]=useState<Profile|null>(null); const [loading,setLoading]=useState(true);
 const refreshProfile=async()=>{ const {data:{user:u}}=await supabase.auth.getUser(); setUser(u); if(u){const {data}=await supabase.from('profiles').select('*').eq('id',u.id).single(); setProfile(data as Profile|null);} else setProfile(null); };
 useEffect(()=>{refreshProfile().finally(()=>setLoading(false)); const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{refreshProfile();}); return ()=>subscription.unsubscribe();},[]);
 const value=useMemo(()=>({user,profile,loading,signOut:async()=>{await supabase.auth.signOut();setUser(null);setProfile(null);},refreshProfile}),[user,profile,loading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
