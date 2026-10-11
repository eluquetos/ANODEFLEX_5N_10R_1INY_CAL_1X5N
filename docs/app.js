const nodes=[1,2,3,4,5];
const ids=["11","12","21","22","31","32","41","42","51","52"];
const state={fixed:null,nominal:null,op:null};
const $=id=>document.getElementById(id);
const n=id=>Number($(id).value);
const fmt=(value,digits=3)=>Number.isFinite(value)?value.toLocaleString("es-EC",{minimumFractionDigits:digits,maximumFractionDigits:digits}):"—";
const powerFmt=value=>Number.isFinite(value)?value.toFixed(2):"—";
const cableInputs=()=>Object.fromEntries(nodes.map(node=>["Rc"+node,n("rc"+node)]));
const cableArgs=cables=>Object.fromEntries(nodes.map(node=>["Rc"+node,cables[node]]));
const fixedInputs=()=>Object.fromEntries(ids.map(id=>[id,n("system-r-"+id)]));
const nodeText=voltages=>nodes.map(node=>`V${node} ${fmt(voltages[node],2)} V`).join(" · ");

function buildBranches(){
  const defaults={"11":1.2,"12":1,"21":.9,"22":.9,"31":.8,"32":.7,"41":.6,"42":.5,"51":.4,"52":.3};
  $("branch-cards").innerHTML=ids.map(id=>`
    <article class="panel branch tone-${id}" data-id="${id}">
      <div class="branch-head"><div><span>NODO ${id[0]}</span><h3>RAMA ${id}</h3></div><div class="amp" id="amp-${id}">— A</div></div>
      <div class="branch-inputs">
        <label><span class="input-title">Corriente</span><input id="target-${id}" type="number" min="0.001" step="0.01" value="${defaults[id]}"><em>A</em></label>
        <label><span class="input-title"><span>Reo${id}</span><strong id="reo-power-${id}">0.00 W</strong></span><input id="reo-${id}" type="number" min="0" max="10000" step="0.01" value="0"><em>Ω</em></label>
      </div>
      <div class="fixed-note"><span>Resistencia del Sistema R${id}</span><label class="fixed-control"><input id="system-r-${id}" aria-label="Resistencia del Sistema R${id}" type="number" min="0.01" step="0.01"><em>Ω</em></label></div>
    </article>`).join("");
}

function validateInputs(values){return values.every(Number.isFinite)}

function computeFixed(){
  const V=n("nom-v"),cables=cableInputs(),currents=Object.fromEntries(ids.map(id=>[id,n("nom-i"+id)]));
  const values=[V,...Object.values(cables),...Object.values(currents)];
  if(!validateInputs(values)||V<=0||Object.values(cables).some(value=>value<0)||Object.values(currents).some(value=>value<=0)){
    showMessage("Revise los datos: el voltaje y las corrientes deben ser mayores que cero; Rc1 a Rc5 no pueden ser negativas.","error");return;
  }
  let result;
  try{result=AnodeflexModel.dimension({V,...cables,currents})}
  catch(error){showMessage(error.message==="voltage-exhausted"?"Las caídas en los cables consumen la tensión disponible. Reduzca corrientes o resistencias de cable, o aumente el voltaje.":"No se pudo obtener un conjunto físico de resistencias.","error");return}
  state.fixed=result.fixed;state.nominal=result;
  ids.forEach(id=>{$("fixed-r"+id).textContent=fmt(result.fixed[id],2)+" Ω";$("system-r-"+id).value=result.fixed[id].toFixed(2);$("target-"+id).value=currents[id];setRheostat(id,0)});
  $("fixed-nodes").textContent=nodeText(result.voltages);$("live-v").value=V;
  localStorage.setItem("anodeflex-5-1iny-fixed",JSON.stringify({fixed:state.fixed,stateNominal:state.nominal}));
  showMessage("Resistencias calculadas y fijadas para los cinco nodos. Ya puede regular el voltaje y los reóstatos.","success");solve();
}

function solve(){
  if(!state.fixed)return;
  const fixed=fixedInputs();
  if(ids.some(id=>!Number.isFinite(fixed[id])||fixed[id]<=0)){showMessage("Las resistencias del sistema deben ser mayores que cero.","error");return}
  state.fixed=fixed;
  const V=n("live-v"),rheostats=Object.fromEntries(ids.map(id=>[id,Math.max(0,n("reo-"+id)||0)]));
  try{state.op=AnodeflexModel.simulate({V,...cableArgs(state.nominal.cables),fixed:state.fixed,rheostats});render()}
  catch{showMessage("La simulación contiene un valor no válido.","error")}
  localStorage.setItem("anodeflex-5-1iny-fixed",JSON.stringify({fixed:state.fixed,stateNominal:state.nominal}));
}

function render(){
  const o=state.op,tolerance=Math.max(.01,n("tolerance")||2);let allWithin=true;
  $("live-v-out").textContent=fmt(o.V,2)+" V";$("head-current").textContent=fmt(o.It)+" A";$("health-dot").className="health-dot ok";
  ids.forEach(id=>{const target=n("target-"+id),delta=o.currents[id]-target,pct=target>0?100*delta/target:NaN,within=Number.isFinite(pct)&&Math.abs(pct)<=tolerance;allWithin&&=within;$("amp-"+id).textContent=fmt(o.currents[id])+" A";$("reo-power-"+id).textContent=powerFmt(o.currents[id]**2*o.rheostats[id])+" W"});
  $("health-label").textContent=allWithin?"Objetivos cumplidos":"Simulación válida";
  $("res-it").textContent=fmt(o.It)+" A";
  nodes.slice(1).forEach(node=>{$("res-i"+node).textContent=fmt(o.trunks[node])+" A"});
  nodes.forEach(node=>{$("res-dv"+node).textContent=fmt(o.trunks[node]*o.cables[node],3)+" V"});
  $("res-ps").textContent=fmt(o.pSource,2)+" W";$("res-pe").textContent=fmt(o.pError,6)+" W";
  $("results-body").innerHTML=ids.map(id=>{const target=n("target-"+id),pct=target>0?100*(o.currents[id]-target)/target:NaN,power=o.currents[id]**2*o.branch[id];return `<tr><td>I${id}</td><td>${fmt(o.currents[id])} A</td><td>${fmt(target)} A</td><td class="${Math.abs(pct)<=tolerance?"status-ok":"status-warn"}">${Number.isFinite(pct)?fmt(pct,2)+" %":"—"}</td><td>${fmt(state.fixed[id],2)} Ω</td><td>${fmt(o.rheostats[id])} Ω</td><td>${fmt(power,2)} W</td></tr>`}).join("");
  const errors={};
  nodes.forEach(node=>{
    errors["KCL nodo "+node]=o.trunks[node]-o.currents[node+"1"]-o.currents[node+"2"]-(node<nodes.length?o.trunks[node+1]:0);
    errors[node===1?"KVL fuente–nodo 1":"KVL nodo "+(node-1)+"–nodo "+node]=node===1?o.V-o.voltages[1]-o.trunks[1]*o.cables[1]:o.voltages[node-1]-o.voltages[node]-o.trunks[node]*o.cables[node];
  });
  errors["Balance de potencia"]=o.pError;
  $("checks").innerHTML=Object.entries(errors).map(([label,value])=>`<p><span>${label}</span><b>${fmt(value,8)}</b></p>`).join("");
}

function setRheostat(id,value){$("reo-"+id).value=Math.round(Math.max(0,value)*1000)/1000}

function assistedAdjustment(){
  if(!state.fixed){showMessage("Calibre primero las resistencias del sistema.","error");return}
  const targets=Object.fromEntries(ids.map(id=>[id,n("target-"+id)])),maxReo=n("reo-max");
  if(!Object.values(targets).every(value=>Number.isFinite(value)&&value>0)||!Number.isFinite(maxReo)||maxReo<=0){showMessage("Las diez corrientes objetivo y el reóstato máximo deben ser mayores que cero.","error");return}
  let result;
  try{result=AnodeflexModel.adjust({...cableArgs(state.nominal.cables),fixed:state.fixed,targets,maxReo})}
  catch{showMessage("No se pudo calcular el ajuste con los datos ingresados.","error");return}
  if(!result.feasible){const parts=[];if(result.negative.length)parts.push("Ramas "+result.negative.join(", ")+": requieren reducir la resistencia del sistema o aumentar la tensión");if(result.over.length)parts.push("Ramas "+result.over.join(", ")+": superan el máximo de "+fmt(maxReo,2)+" Ω");showMessage("Ajuste no alcanzable. "+parts.join(". ")+".","error");return}
  $("live-v").value=result.V;ids.forEach(id=>setRheostat(id,result.rheostats[id]));solve();showMessage("Ajuste calculado con la tensión mínima de "+fmt(result.V,2)+" V. Reóstato en 0 Ω: "+result.zero.join(", ")+".","success");
}

function caseData(){return {format:"anodeflex-5-nodes-case",version:1,createdAt:new Date().toISOString(),calibration:{V:state.nominal.V,cables:state.nominal.cables,currents:state.nominal.currents,fixed:state.fixed},operation:{V:n("live-v"),targets:Object.fromEntries(ids.map(id=>[id,n("target-"+id)])),rheostats:Object.fromEntries(ids.map(id=>[id,n("reo-"+id)])),rheostatMax:n("reo-max"),tolerancePercent:n("tolerance")},results:state.op}}
function saveCase(){if(!state.op)return;const blob=new Blob([JSON.stringify(caseData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="anodeflex-5-nodos-1iny-"+new Date().toISOString().slice(0,10)+".json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

function loadCase(file){
  const reader=new FileReader();
  reader.onload=()=>{try{
    const data=JSON.parse(reader.result);
    if(data.format!=="anodeflex-5-nodes-case"||!data.calibration?.fixed||!data.calibration?.cables||!data.operation)throw new Error();
    const calibration=AnodeflexModel.dimension({V:data.calibration.V,...cableArgs(data.calibration.cables),currents:data.calibration.currents});
    state.fixed=data.calibration.fixed;state.nominal=calibration;
    $("nom-v").value=calibration.V;
    nodes.forEach(node=>{$("rc"+node).value=calibration.cables[node]});
    ids.forEach(id=>{$("nom-i"+id).value=calibration.currents[id];$("fixed-r"+id).textContent=fmt(state.fixed[id],2)+" Ω";$("system-r-"+id).value=Number(state.fixed[id]).toFixed(2);$("target-"+id).value=data.operation.targets[id];setRheostat(id,data.operation.rheostats[id])});
    $("fixed-nodes").textContent=nodeText(calibration.voltages);$("live-v").value=data.operation.V;$("reo-max").value=data.operation.rheostatMax||100;$("tolerance").value=data.operation.tolerancePercent||2;
    localStorage.setItem("anodeflex-5-1iny-fixed",JSON.stringify({fixed:state.fixed,stateNominal:state.nominal}));
    solve();showMessage("Caso de cinco nodos importado y recalculado correctamente.","success");
  }catch{showMessage("El archivo no corresponde a un caso ANODEFLEX de cinco nodos válido.","error")}};
  reader.readAsText(file);
}

function showMessage(text,type){const element=$("message");element.textContent=text;element.className="message show "+type}
function wireEvents(){
  $("calculate-fixed").addEventListener("click",computeFixed);$("live-v").addEventListener("input",solve);
  ids.forEach(id=>{$("reo-"+id).addEventListener("input",solve);$("target-"+id).addEventListener("input",solve);$("system-r-"+id).addEventListener("input",solve)});
  $("reset-rheostats").addEventListener("click",()=>{ids.forEach(id=>setRheostat(id,0));solve()});$("assist").addEventListener("click",assistedAdjustment);$("tolerance").addEventListener("input",solve);$("save-case").addEventListener("click",saveCase);$("load-case").addEventListener("click",()=>$("case-file").click());$("case-file").addEventListener("change",event=>{if(event.target.files[0])loadCase(event.target.files[0]);event.target.value=""});$("print-report").addEventListener("click",()=>window.print());
}
function restore(){try{const saved=JSON.parse(localStorage.getItem("anodeflex-5-1iny-fixed"));if(saved?.fixed&&saved?.stateNominal){state.fixed=saved.fixed;state.nominal=saved.stateNominal;ids.forEach(id=>{$("fixed-r"+id).textContent=fmt(state.fixed[id],2)+" Ω";$("system-r-"+id).value=Number(state.fixed[id]).toFixed(2)});$("fixed-nodes").textContent=nodeText(state.nominal.voltages);solve();return}}catch{}computeFixed()}

let installPrompt=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event;$("install-app").hidden=false});
$("install-app").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("install-app").hidden=true});
buildBranches();wireEvents();restore();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
