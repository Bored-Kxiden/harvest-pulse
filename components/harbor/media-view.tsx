'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { getMedia } from '@/lib/harbor/media'
export function LocalMedia({id,kind}:{id:string;kind:string}) {
 const {data,error}=useSWR(['harbor-media',id],()=>getMedia(id));const [url,setUrl]=useState<string>()
 useEffect(()=>{if(!data)return;const url=URL.createObjectURL(data);setUrl(url);return()=>URL.revokeObjectURL(url)},[data])
 if(error)return <p className="small-copy">This attachment could not be opened. Your note is still here.</p>
 if(!url)return <p className="small-copy">Opening your local attachment…</p>
 return kind==='audio'?<audio controls src={url} className="w-full"/>:<img src={url} alt="A little moment captured in this demo" className="w-full max-h-72 rounded-xl object-cover"/>
}
