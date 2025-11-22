const nameEl=document.getElementById('ownerName')
const cuisinesEl=document.getElementById('ownerCuisines')
const priceEl=document.getElementById('ownerPrice')
const menuEl=document.getElementById('ownerMenu')
const latEl=document.getElementById('ownerLat')
const lngEl=document.getElementById('ownerLng')
const daysEl=document.getElementById('ownerDays')
const startEl=document.getElementById('ownerStart')
const endEl=document.getElementById('ownerEnd')
const imageEl=document.getElementById('ownerImage')
const locateBtn=document.getElementById('ownerLocate')
const statusEl=document.getElementById('ownerLocationStatus')
const previewBtn=document.getElementById('ownerPreview')
const copyBtn=document.getElementById('ownerCopy')
const dlBtn=document.getElementById('ownerDownload')
const outputEl=document.getElementById('ownerOutput')
let ownerMap=null
let ownerMarker=null
function ensureMap(){
 if(ownerMap) return
 ownerMap=L.map('ownerMap',{zoomControl:true})
 const center=[40.7128,-74.006]
 ownerMap.setView(center,12)
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(ownerMap)
}
function updateMarker(){
 ensureMap()
 const lat=parseFloat(latEl.value)
 const lng=parseFloat(lngEl.value)
 if(Number.isFinite(lat)&&Number.isFinite(lng)){
 if(ownerMarker){ownerMarker.remove();ownerMarker=null}
 ownerMarker=L.marker([lat,lng]).addTo(ownerMap)
 ownerMap.setView([lat,lng],16)
 }
}
latEl.addEventListener('input',updateMarker)
lngEl.addEventListener('input',updateMarker)
locateBtn.addEventListener('click',()=>{
 if(!navigator.geolocation){statusEl.textContent='Location not supported';return}
 statusEl.textContent='Locating…'
 locateBtn.disabled=true
 navigator.geolocation.getCurrentPosition(p=>{
 latEl.value=String(p.coords.latitude)
 lngEl.value=String(p.coords.longitude)
 statusEl.textContent='Location captured'
 locateBtn.disabled=false
 updateMarker()
 },e=>{statusEl.textContent='Location denied';locateBtn.disabled=false})
})
function selectedDays(){
 return Array.from(daysEl.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value)
}
function parseMenu(){
 return menuEl.value.split(/\n+/).map(s=>s.trim()).filter(Boolean)
}
function parseCuisines(){
 return cuisinesEl.value.split(',').map(s=>s.trim()).filter(Boolean)
}
function buildTruck(){
 const lat=parseFloat(latEl.value)
 const lng=parseFloat(lngEl.value)
 const days=selectedDays()
 const schedule=days.map(d=>({day:d,start:startEl.value,end:endEl.value}))
 const obj={
  id:'owner-'+Date.now(),
  name:nameEl.value.trim(),
  cuisines:parseCuisines(),
  menu:parseMenu(),
  location:{lat:lat,lng:lng},
  last_updated:new Date().toISOString(),
  price:priceEl.value||undefined,
  image:imageEl.value||undefined,
  schedule:schedule
 }
 return obj
}
function preview(){
 const t=buildTruck()
 outputEl.textContent=JSON.stringify(t,null,2)
 updateMarker()
}
function copyJson(){
 const t=buildTruck()
 const s=JSON.stringify(t,null,2)
 navigator.clipboard?.writeText(s)
}
function downloadJson(){
 const t=buildTruck()
 const s=JSON.stringify(t,null,2)
 const blob=new Blob([s],{type:'application/json'})
 const a=document.createElement('a')
 a.href=URL.createObjectURL(blob)
 a.download='new-truck.json'
 document.body.appendChild(a)
 a.click()
 a.remove()
}
previewBtn.addEventListener('click',preview)
copyBtn.addEventListener('click',copyJson)
dlBtn.addEventListener('click',downloadJson)
ensureMap()