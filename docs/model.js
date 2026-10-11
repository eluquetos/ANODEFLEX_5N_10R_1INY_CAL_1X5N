(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AnodeflexModel=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const NODES=[1,2,3,4,5];
  const IDS=NODES.flatMap(node=>[node+"1",node+"2"]);
  const sum=values=>values.reduce((a,b)=>a+b,0);
  const parallel=values=>1/sum(values.map(value=>1/value));
  const cableValues=input=>Object.fromEntries(NODES.map(node=>[node,Number(input["Rc"+node])]));
  const trunkCurrents=currents=>Object.fromEntries(NODES.map(node=>[node,sum(IDS.filter(id=>Number(id[0])>=node).map(id=>currents[id]))]));
  const validateNetwork=(V,cables)=>{
    if(!Number.isFinite(V)||V<=0||NODES.some(node=>!Number.isFinite(cables[node])||cables[node]<0))throw new Error("invalid-input");
  };

  function dimension(input){
    const {V,currents}=input,cables=cableValues(input);
    validateNetwork(V,cables);
    if(IDS.some(id=>!Number.isFinite(currents[id])||currents[id]<=0))throw new Error("invalid-input");
    const trunks=trunkCurrents(currents),voltages={};
    let voltage=V;
    for(const node of NODES){
      voltage-=trunks[node]*cables[node];
      voltages[node]=voltage;
      if(voltage<=0)throw new Error("voltage-exhausted");
    }
    const fixed=Object.fromEntries(IDS.map(id=>[id,voltages[Number(id[0])]/currents[id]]));
    return {V,cables,currents:{...currents},trunks,voltages,It:trunks[1],fixed};
  }

  function simulate(input){
    const {V,fixed,rheostats}=input,cables=cableValues(input);
    if(!Number.isFinite(V)||V<0||NODES.some(node=>!Number.isFinite(cables[node])||cables[node]<0))throw new Error("invalid-input");
    const branch=Object.fromEntries(IDS.map(id=>[id,fixed[id]+Math.max(0,rheostats[id]||0)]));
    if(IDS.some(id=>!Number.isFinite(branch[id])||branch[id]<=0))throw new Error("invalid-resistance");

    const equivalents={},downstreamPaths={};
    for(let node=NODES.length;node>=1;node--){
      const paths=[branch[node+"1"],branch[node+"2"]];
      if(node<NODES.length){
        downstreamPaths[node]=cables[node+1]+equivalents[node+1];
        paths.push(downstreamPaths[node]);
      }
      equivalents[node]=parallel(paths);
    }

    const Rt=cables[1]+equivalents[1],It=V/Rt,currents={},voltages={},trunks={1:It};
    let incoming=It,voltage=V-incoming*cables[1];
    for(const node of NODES){
      voltages[node]=voltage;
      currents[node+"1"]=voltage/branch[node+"1"];
      currents[node+"2"]=voltage/branch[node+"2"];
      if(node<NODES.length){
        incoming=voltage/downstreamPaths[node];
        trunks[node+1]=incoming;
        voltage-=incoming*cables[node+1];
      }
    }

    const pCable=sum(NODES.map(node=>trunks[node]**2*cables[node]));
    const pBranches=sum(IDS.map(id=>currents[id]**2*branch[id]));
    const pSource=V*It;
    return {V,cables,rheostats:{...rheostats},branch,equivalents,downstreamPaths,Rt,It,voltages,trunks,currents,pCable,pBranches,pSource,pError:pSource-pCable-pBranches};
  }

  function adjust(input){
    const {V,fixed,targets,maxReo}=input,cables=cableValues(input);
    validateNetwork(V,cables);
    if(!IDS.every(id=>Number.isFinite(targets[id])&&targets[id]>0)||!Number.isFinite(maxReo)||maxReo<=0)throw new Error("invalid-target");
    const trunks=trunkCurrents(targets),voltages={};
    let voltage=V;
    for(const node of NODES){
      voltage-=trunks[node]*cables[node];
      voltages[node]=voltage;
      if(voltage<=0)return {feasible:false,reason:"voltage",voltages,trunks};
    }
    const rheostats=Object.fromEntries(IDS.map(id=>[id,voltages[Number(id[0])]/targets[id]-fixed[id]]));
    const negative=IDS.filter(id=>rheostats[id]<-1e-8),over=IDS.filter(id=>rheostats[id]>maxReo+1e-8);
    return {feasible:negative.length===0&&over.length===0,voltages,trunks,rheostats,negative,over};
  }

  return {NODES,IDS,dimension,simulate,adjust};
});
