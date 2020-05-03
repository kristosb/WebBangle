var yPlacementOffset = 50;
var data = [[],[],[]];
var buf = "";
var elements = {
  heading : TD.label({x:10,y:10+yPlacementOffset,width:200,height:50,label:"My Dashboard"}),
  t:TD.toggle({x:10,y:65+yPlacementOffset,width:200,height:60,label:"Connect",value:0,name:"toggle",id:"connectmydeviceTD"}),
  adcop:TD.toggle({x:10,y:130+yPlacementOffset,width:200,height:60,label:"ADC on/off",value:0,name:"adcop",id:"startadc",onchange:adcControl}),
  accgr:TD.graph({x:215,y:10+yPlacementOffset,width:400,height:180,label:"ACC data",data:data})
}
var conn = undefined;

// shift the data in the buffer
function twodDataReplace(d,index,value){
  d[index].pop();
  d[index].unshift(value);
}
// Called when we get a line of data - updates the light color
function onLine(line) {
  try {
    var j = JSON.parse(line);
    console.log("RdData JSON: ",j.acc.x);
    twodDataReplace(data,0,j.acc.x);
    twodDataReplace(data,1,j.acc.y);
    twodDataReplace(data,2,j.acc.z);
    elements.accgr.setData(data);
  } catch(e) {
    console.log("RdData: ",line);
  }
}
function mydatafunct(d) {
  buf += d;
  var i = buf.indexOf("\n");
  while (i>=0) {
    onLine(buf.substr(0,i));
    buf = buf.substr(i+1);
    i = buf.indexOf("\n");
  }
}
function parseData(){
  console.log("a");
  if (!conn) return;
  console.log("b");
  conn.on("data",mydatafunct);  
}
function isConnected() {
   var conStatus = false;
   try{
    conStatus = conn.isOpen;
   }
   catch{
     conStatus = false;
   }
  return conStatus;
}
watchConnectionChange = cb => {
  var connected = isConnected();
  //TODO Switch to an event listener when Puck will support it
  var interval = setInterval(() => {
    if (connected === isConnected()) return;
    connected = isConnected();
    console.log(isConnected());
    cb(connected);
    console.log("connection changed to "+connected);
  }, 1000);
  //stop watching
  return () => {
    clearInterval(interval);
  };
}

function handleConnectionChange(connected) {
  if ( !connected && elements.t.pressed ) 
    disconnect(); //if connection dropped close running handles
  connectMyDeviceBtn.setValue(connected);
}


function disconnect(){
  console.log("closing connection");
  conn.off('data');
  Puck.close();
  conn = undefined;
}
function connect(){
  console.log("connecting...");
  Puck.connect(function(c) {
    if (!c) throw "Error!";      
    conn = c;    
    buf="";
    parseData();
    initBangleCode();
    console.log(conn.isOpen);
    //conn.on('close', function (){console.log("conclose"); conn = undefined;})
  });
}
function ConnectionControl(enable){
  if ( conn ) {  
    disconnect();
  } else {
    connect();  
  }
}

function PlotInit(){
  for (var i=0;i<100;i++) data[0].push(0.0);
  for (var i=0;i<100;i++) data[1].push(0.0);
  for (var i=0;i<100;i++) data[2].push(0.0);
  elements.accgr.setData(data);
}
function initBangleCode(){
  if (!conn) return;
  console.log("Initializing bangle code");
  conn.write("var banglePublisher;\
                    NRF.on('disconnect', function() {reset()});\n",
  function() { console.log("Bangle code init"); });
}
function adcControl(){
  if (!conn) return;
  if (elements.adcop.pressed){
    console.log("Starting aquisition");
    conn.write("if (!banglePublisher) banglePublisher = setInterval(\
                      function(){ var accel = Bangle.getAccel();\
                        Bluetooth.println(\
                          JSON.stringify(\
                            {acc:accel}));}\
                            ,100);\n",
                    function() { console.log("Bangle acc running..."); });
  }
  else{
    console.log("Stopping aquisition");
    conn.write("if (banglePublisher) clearInterval(banglePublisher);\
                      banglePublisher=null;\n",
                    function() { console.log("Bangle acc stopped"); });
  }
}

for (var i in elements)
  document.body.appendChild(elements[i]);
PlotInit();
var connectMyDeviceBtn = document.getElementById("connectmydeviceTD");
connectMyDeviceBtn.addEventListener("click", ConnectionControl);
watchConnectionChange(handleConnectionChange);