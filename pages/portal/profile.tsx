import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function Profile() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ name:"", businessName:"", address:"", phone:"", website:"", logoUrl:"" });

  // Load existing
  useEffect(() => {
    if (!session) return;
    fetch("/api/contractor/profile", {
      headers: { "Authorization": "Bearer " + session.firebaseToken },
    })
    .then(r=>r.json())
    .then(setForm);
  }, [session]);

  function save() {
    fetch("/api/contractor/profile", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+session.firebaseToken
      },
      body: JSON.stringify(form)
    });
  }

  return (
    <div>
      <h1>Your Business Info</h1>
      <label>Name<input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></label>
      <label>Business Name<input value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))})}/></label>
      {/* address, phone, website, logoUrl similarly */}
      <button onClick={save}>Save</button>
    </div>
  );
}
