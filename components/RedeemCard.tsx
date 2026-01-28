 "use client";
 import { useState } from "react";
 import Image from "next/image";
 import RedeemModal from "./RedeemModal";

 export default function RedeemCard({ provider, value, pointsRequired }: { provider: string; value: number; pointsRequired: number }) {
   const [loading, setLoading] = useState(false);
   const [open, setOpen] = useState(false);

   function handleRedeem() {
     setOpen(true);
   }

   const logoPath = `/images/${provider?.toLowerCase()}.png`;

   return (
     <div className="shop-card" role="group" aria-label={`${provider} - ${value.toLocaleString()}₫`} tabIndex={0}>
       <div className="shop-card-inside">
         <div className="card-media" aria-hidden>
           <Image src={logoPath} alt={provider} width={80} height={56} style={{ objectFit: "contain" }} onError={(e:any)=>{ (e.currentTarget as HTMLImageElement).src = "/images/logo.svg"; }} />
         </div>
         <div className="card-body">
           <div className="provider-name">{provider}</div>
           <div className="provider-value">{value.toLocaleString()}₫</div>
           <div className="points-row">
             <div className="points-badge">{pointsRequired} điểm</div>
           </div>
         </div>
         <div className="card-actions">
           <button onClick={handleRedeem} className="btn btn-ghost-cta" disabled={loading} aria-disabled={loading} aria-label={`Quy đổi ${value.toLocaleString()}₫ - ${pointsRequired} điểm`}>
             {loading ? "Đang..." : (
               <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                   <path d="M6 6h15l-1.5 9h-12z" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                   <circle cx="10" cy="19" r="1" fill="#fff" />
                   <circle cx="18" cy="19" r="1" fill="#fff" />
                 </svg>
                 Quy đổi
               </span>
             )}
           </button>
         </div>
       </div>

       <RedeemModal open={open} onClose={() => setOpen(false)} card={{ provider, value, pointsRequired }} />
     </div>
   );
 }


