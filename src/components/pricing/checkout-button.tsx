"use client";

import {useRouter} from "next/navigation";
import {useRef,useState} from "react";

export function CheckoutButton({packId}:{packId:string}){
  const router=useRouter();
  const busy=useRef(false);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState("");
  async function checkout(){
    if(busy.current)return;
    busy.current=true;
    setPending(true);
    setMessage("");
    try {
      const response=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({packId,requestKey:crypto.randomUUID()}),cache:"no-store"});
      if(response.status===401){router.replace("/login");return;}
      if(response.status===429){setMessage("Too many attempts. Please wait before trying again.");return;}
      const payload=await response.json();
      if(!response.ok || payload.success!==true || typeof payload.data?.checkoutUrl!=="string")throw new Error();
      const url=new URL(payload.data.checkoutUrl);
      if(url.origin!=="https://test.checkout.dodopayments.com" || !url.pathname.startsWith("/session/"))throw new Error();
      window.location.assign(url.href);
    } catch {setMessage("Couldn’t open test checkout. Check purchase history if you already submitted a payment.");}
    finally {setPending(false);busy.current=false;}
  }
  return <>
    <button type="button" className="button button-primary" disabled={pending} onClick={checkout}>{pending?"Opening checkout…":"Continue to test checkout"}</button>
    {message&&<p role="alert">{message}</p>}
  </>;
}
