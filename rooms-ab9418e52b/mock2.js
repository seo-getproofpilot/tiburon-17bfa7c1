/* preview only: fake server for the room page. Any 6-digit PIN works. Nothing is saved or sent. */
(function(){
  try{localStorage.removeItem('tbRoom')}catch(e){}
  var t=new Date(Date.now()-6*3600e3), ymd=function(n){var d=new Date(t);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  var now=Math.floor(Date.now()/1000);
  var mk=function(id,room,rn,n,tt,g,name,email,phone,st,ago){return {id:id,room:room,roomName:rn,date:ymd(n),time:'',timeText:tt,guests:g,total:'$'+g*30+' BZD',name:name,email:email,phone:phone,status:st,mailed:st==='confirmed'?'sent':'',created:now-(ago||600)}};
  var DB=[mk(1,'san-pedro','San Pedro',0,'3:00pm',2,'Maria Lopez','maria@example.com','+1 312 555 0142','confirmed'),
    mk(2,'san-pedro','San Pedro',0,'5:30pm',4,'Jake Thompson','jake@example.com','','pending',900),
    mk(3,'placencia','Placencia Village',1,'11:00am',2,'Ana Reyes','ana@example.com','+501 610 0000','pending',3*3600),
    mk(4,'san-pedro','San Pedro',2,'2:00pm',6,'The Carter family','carter@example.com','+1 404 555 0199','pending',300),
    mk(5,'caye-caulker','Caye Caulker',3,'4:00pm',3,'Liam Chen','liam@example.com','','confirmed'),
    mk(6,'san-pedro','San Pedro',1,'11:30am',2,'Sofia Ruiz','sofia@example.com','','confirmed'),
    mk(7,'san-pedro','San Pedro',5,'6:00pm',8,'Priya Shah','priya@example.com','+44 7700 900123','confirmed')];
  var CLOSED=[{room:'san-pedro',date:ymd(9),reason:'Private event'}];
  var J=function(o,s){return Promise.resolve(new Response(JSON.stringify(o),{status:s||200}))};
  var real=window.fetch;
  window.fetch=function(u,o){o=o||{};u=String(u);var b=o.body?JSON.parse(o.body):{};
    if(u.indexOf('/mock-api/room-login')===0) return (b.pin||'').length===6?J({ok:true,room:'all',key:'k'}):J({ok:false,message:'That PIN isn’t right. Try again.'},403);
    if(u.indexOf('/mock-api/room-bookings')===0){var r=new URLSearchParams(u.split('?')[1]).get('room');return J({ok:true,today:ymd(0),now:Math.floor(Date.now()/1000),bookings:DB.filter(function(x){return r==='all'||x.room===r}),closed:CLOSED.filter(function(c){return r==='all'||c.room===r})});}
    if(u.indexOf('/mock-api/room-status')===0){var x=DB.filter(function(y){return y.id===b.id})[0];x.status=b.status;x.mailed=b.status==='pending'?'':'sent';return J({ok:true,booking:x});}
    if(u.indexOf('/mock-api/room-close')===0){CLOSED=CLOSED.filter(function(c){return !(c.room===b.target&&c.date===b.date)});if(b.closed)CLOSED.push({room:b.target,date:b.date,reason:b.reason||''});CLOSED.sort(function(a,c){return a.date<c.date?-1:1});return J({ok:true});}
    return real(u,o);};
  /* a new booking lands 20 seconds after you sign in, so you can hear the ring */
  setTimeout(function(){DB.push(mk(8,'san-pedro','San Pedro',0,'6:30pm',2,'Noah Williams','noah@example.com','','pending',5));},20000);
})();
