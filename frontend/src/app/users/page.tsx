"use client";
import { useState } from "react";
import Users from "@/components/users/Users";
import PositionsWorkspace from "@/components/users/PositionsWorkspace";

export default function UsersPage(){
 const [tab,setTab]=useState<"positions"|"users">("positions");
 return <div className="space-y-3 pl-[18px] pr-2"><div className="flex flex-wrap gap-2"><button onClick={()=>setTab("positions")} className={`rounded-lg border px-4 py-2 text-sm ${tab==="positions"?"border-cyan-500 bg-cyan-500/15 text-cyan-200":"border-slate-700 text-slate-300"}`}>Posiciones</button><button onClick={()=>setTab("users")} className={`rounded-lg border px-4 py-2 text-sm ${tab==="users"?"border-cyan-500 bg-cyan-500/15 text-cyan-200":"border-slate-700 text-slate-300"}`}>Usuarios</button></div>{tab==="positions"?<PositionsWorkspace/>:<Users/>}</div>
}
