const locateBtn = document.getElementById('locateBtn')
const locationStatus = document.getElementById('locationStatus')
const searchInput = document.getElementById('searchInput')
const tagRow = document.getElementById('tagRow')
const resultsCount = document.getElementById('resultsCount')
const sortStatus = document.getElementById('sortStatus')
const resultsList = document.getElementById('resultsList')
const overlay = document.getElementById('detailOverlay')
const overlayContent = document.getElementById('overlayContent')
const overlayClose = document.getElementById('overlayClose')
let userLocation = null
let trucks = []
let filtered = []
let map = null
let userMarker = null
let markersLayer = null
let detailMap = null
const markerById = new Map()
const liById = new Map()
function fetchData(){
 return fetch('data/trucks.json').then(r=>r.json()).then(d=>{trucks=d;render()})
}
function getLocation(){
 if(!navigator.geolocation){locationStatus.textContent='Location not supported';return}
 locationStatus.textContent='Locating…'
 locateBtn.disabled=true
 navigator.geolocation.getCurrentPosition(p=>{userLocation={lat:p.coords.latitude,lng:p.coords.longitude};locationStatus.textContent='Location enabled';locateBtn.disabled=false;render()},e=>{locationStatus.textContent='Location denied';locateBtn.disabled=false})
}
function toMiles(m){
 return m*0.621371
}
function haversine(a,b,c,d){
 const R=6371
 const toRad=x=>x*Math.PI/180
 const dLat=toRad(c-a)
 const dLon=toRad(d-b)
 const A=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2
 const C=2*Math.atan2(Math.sqrt(A),Math.sqrt(1-A))
 return R*C
}
function walkingMinutes(mi){
 return Math.round(mi/3*60)
}
function timeSince(iso){
 const t=new Date(iso).getTime()
 const now=Date.now()
 const diff=Math.max(0,now-t)
 const m=Math.floor(diff/60000)
 if(m<60) return m+'m'
 const h=Math.floor(m/60)
 return h+'h'
}
function minutesSince(iso){
 const t=new Date(iso).getTime()
 const now=Date.now()
 return Math.floor(Math.max(0,now-t)/60000)
}
function filterByCuisine(q){
 if(!q) return trucks
 const s=q.trim().toLowerCase()
 return trucks.filter(t=>(t.cuisines||[]).some(tag=>tag.toLowerCase().includes(s))||t.name.toLowerCase().includes(s))
}
function render(){
const q=searchInput.value
filtered=filterByCuisine(q)
let withDistance=filtered.map(t=>{
let dist=null
if(userLocation){
dist=toMiles(haversine(userLocation.lat,userLocation.lng,t.location.lat,t.location.lng))
}
return {...t,distance:dist}
})
withDistance.sort((a,b)=>{
const ad=a.distance??Infinity
const bd=b.distance??Infinity
return ad-bd
})
resultsCount.textContent=withDistance.length+' result'+(withDistance.length===1?'':'s')
sortStatus.textContent=userLocation?'Sorted by nearest distance':'Enable location to sort by distance'
resultsList.innerHTML=''
 if(withDistance.length===0){
 const li=document.createElement('li')
 li.className='empty'
 const q=searchInput.value.trim()
 li.textContent=q?('No trucks match “'+q+'”. Try a tag.'):('No trucks available. Enable location or try a tag.')
 resultsList.appendChild(li)
 } else {
 withDistance.forEach(t=>{
 const li=document.createElement('li')
 li.className='result-item'
const top=document.createElement('div')
top.className='result-top'
const name=document.createElement('div')
name.className='result-name'
name.textContent=t.name
const meta=document.createElement('div')
meta.className='result-meta'
const dist=document.createElement('span')
dist.className='pill'
dist.textContent=t.distance!=null?toFixed2(t.distance)+' mi · '+walkingMinutes(t.distance)+' min':'—'
const updated=document.createElement('span')
updated.className='pill'
updated.textContent='updated '+timeSince(t.last_updated)+' ago'
top.appendChild(name)
top.appendChild(meta)
const cuisines=document.createElement('div')
cuisines.className='result-cuisines'
cuisines.textContent=(t.cuisines||[]).join(', ')
meta.appendChild(dist)
meta.appendChild(updated)
li.appendChild(top)
li.appendChild(cuisines)
 li.addEventListener('click',()=>{focusTruck(t);openDetail(t)})
 resultsList.appendChild(li)
 liById.set(t.id,li)
 })
 }
 updateMap(withDistance)
}
function toFixed2(n){
 return Math.round(n*100)/100
}
function openDetail(t){
const img=t.image?'<img src="'+t.image+'" alt="'+t.name+'" style="width:100%;border-radius:12px;margin:8px 0">':''
const price=t.price?'<div class="pill">'+t.price+'</div>':''
const items=(t.menu||[]).map(i=>'<li>'+i+'</li>').join('')
 const dir=directionsUrl(t.location.lat,t.location.lng)
 const distLabel=t.distance!=null?(toFixed2(t.distance)+' mi · '+walkingMinutes(t.distance)+' min'):'—'
 const freshnessMin=minutesSince(t.last_updated)
 const freshnessClass=freshnessMin<=30?'status-fresh':(freshnessMin<=90?'status-ok':'status-stale')
 overlayContent.innerHTML='<h3>'+t.name+'</h3>'+img+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0"><div class="pill">'+(t.cuisines||[]).join(', ')+'</div>'+price+'<div class="pill">'+distLabel+'</div><div class="pill '+freshnessClass+'">updated '+timeSince(t.last_updated)+' ago</div></div><div class="btn-group"><a class="link-btn" href="'+dir+'" target="_blank" rel="noopener">Directions</a><button id="shareBtn" class="btn ghost-btn">Share</button><button id="copyBtn" class="btn ghost-btn">Copy location</button></div><div id="overlayMap" class="map small-map"></div><ul>'+items+'</ul>'
overlay.classList.remove('hidden')
setupDetailMap(t)
 const shareBtn=document.getElementById('shareBtn')
 const copyBtn=document.getElementById('copyBtn')
 const url=directionsUrl(t.location.lat,t.location.lng)
 shareBtn.addEventListener('click',()=>{
  const data={title:t.name,text:(t.cuisines||[]).join(', ')+ ' · '+distLabel,url}
  if(navigator.share){navigator.share(data).catch(()=>{})}
  else {navigator.clipboard?.writeText(data.title+' — '+data.text+'\n'+data.url)}
 })
 copyBtn.addEventListener('click',()=>{navigator.clipboard?.writeText(url)})
}
overlayClose.addEventListener('click',()=>{overlay.classList.add('hidden'); if(detailMap){detailMap.remove(); detailMap=null}})
locateBtn.addEventListener('click',getLocation)
tagRow.addEventListener('click',e=>{if(e.target.classList.contains('tag')){searchInput.value=e.target.textContent;render()}})
tagRow.addEventListener('click',e=>{if(e.target.classList.contains('tag')){Array.from(tagRow.querySelectorAll('.tag')).forEach(b=>b.classList.remove('active')); e.target.classList.add('active')}})
searchInput.addEventListener('input',render)
fetchData()

function ensureMap(){
 if(map) return
 map = L.map('map',{zoomControl:true})
 const center = userLocation? [userLocation.lat,userLocation.lng] : [40.7128,-74.006]
 map.setView(center,userLocation?14:12)
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map)
 markersLayer = L.layerGroup().addTo(map)
 if(userLocation){
 userMarker = L.marker([userLocation.lat,userLocation.lng],{title:'You'}).addTo(map)
 }
}

function updateMap(list){
 ensureMap()
 markersLayer.clearLayers()
 if(userMarker){userMarker.remove();userMarker=null}
 if(userLocation){
 userMarker = L.circleMarker([userLocation.lat,userLocation.lng],{radius:8,color:'#0b5',fillColor:'#0b5',fillOpacity:0.9}).addTo(map)
 map.setView([userLocation.lat,userLocation.lng],14)
 }
 const top=list.filter(x=>x.distance!=null).slice(0,5)
 top.forEach(t=>{
 const m=L.marker([t.location.lat,t.location.lng])
 m.bindPopup('<b>'+t.name+'</b><br>'+((t.cuisines||[]).join(', '))+'<br>'+ (t.distance!=null?toFixed2(t.distance)+' mi · '+walkingMinutes(t.distance)+' min':'') )
 m.on('click',()=>{openDetail(t);highlightListItem(t.id)})
 markersLayer.addLayer(m)
 markerById.set(t.id,m)
 })
}

function focusTruck(t){
 ensureMap()
 map.setView([t.location.lat,t.location.lng],16)
 const m=markerById.get(t.id)
 if(m) m.openPopup()
 highlightListItem(t.id)
}

function highlightListItem(id){
 resultsList.querySelectorAll('.result-item.active').forEach(el=>el.classList.remove('active'))
 const li=liById.get(id)
 if(li){li.classList.add('active');li.scrollIntoView({block:'nearest',behavior:'smooth'})}
}

function directionsUrl(lat,lng){
 const ua=navigator.userAgent||''
 if(/iPhone|iPad|Macintosh/.test(ua)) return 'http://maps.apple.com/?daddr='+lat+','+lng
 return 'https://www.google.com/maps/dir/?api=1&destination='+lat+','+lng
}

const clearBtn=document.getElementById('clearBtn')
clearBtn.addEventListener('click',()=>{searchInput.value='';Array.from(tagRow.querySelectorAll('.tag')).forEach(b=>b.classList.remove('active'));render()})

function setupDetailMap(t){
 const container=document.getElementById('overlayMap')
 if(!container) return
 if(detailMap){detailMap.remove(); detailMap=null}
 detailMap = L.map(container,{zoomControl:true})
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(detailMap)
 const truck=[t.location.lat,t.location.lng]
 L.marker(truck).addTo(detailMap)
 let bounds=L.latLngBounds([truck])
 if(userLocation){
 L.circleMarker([userLocation.lat,userLocation.lng],{radius:6,color:'#0b5',fillColor:'#0b5',fillOpacity:0.9}).addTo(detailMap)
 bounds.extend([userLocation.lat,userLocation.lng])
 }
 if(bounds.isValid()) detailMap.fitBounds(bounds.pad(0.25)); else detailMap.setView(truck,16)
}