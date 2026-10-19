/** Find real portrait cells before cutting a generated atlas. A nominal 8x8 crop
 * cannot prove64 portraits; row and column gutters may also drift between rows. */
export function portraitGrid(data,info){
  function boundaries(axis,{top=2,bottom=info.height-2}={}){
    const length=axis==='x'?info.width:info.height,step=length/8,edges=[0],lines=[];
    for(let n=1;n<8;n++){
      const ideal=n*step,start=Math.max(1,Math.floor(ideal-step*.45)),end=Math.min(length-2,Math.ceil(ideal+step*.45));
      let best=null;
      for(let p=start;p<=end;p++){
        let sum=0,sum2=0,count=0,dark=0;
        const from=axis==='x'?top:2,to=axis==='x'?bottom:info.width-2;
        for(let q=from;q<to;q+=2){const x=axis==='x'?p:q,y=axis==='x'?q:p,i=(y*info.width+x)*4,v=(data[i]+data[i+1]+data[i+2])/3;sum+=v;sum2+=v*v;count++;if(v<25)dark++;}
        const mean=sum/count,variance=Math.max(0,sum2/count-mean*mean),score=mean+Math.sqrt(variance)*.3+Math.abs(p-ideal)*.25;
        if(!best||score<best.score)best={position:p,mean,darkFraction:dark/count,score};
      }
      if(best.mean>18||best.darkFraction<.9)throw new Error(`Missing real ${axis==='x'?'column':'row'} gutter ${n}/7: mean ${best.mean.toFixed(1)}, dark ${(best.darkFraction*100).toFixed(1)}%. The sheet does not contain eight clean portrait cells in this direction.`);
      edges.push(best.position);lines.push({position:best.position,mean:Number(best.mean.toFixed(2)),darkFraction:Number(best.darkFraction.toFixed(4))});
    }
    edges.push(length);
    for(let index=1;index<edges.length;index++)if(edges[index]-edges[index-1]<step*.6||edges[index]-edges[index-1]>step*1.4)throw new Error('Real portrait gutters do not form eight complete cells. Regenerate the sheet.');
    return {edges,lines};
  }
  const rows=boundaries('y'),xRows=[],columnGuttersByRow=[];
  for(let row=0;row<8;row++){
    const columns=boundaries('x',{top:rows.edges[row]+2,bottom:rows.edges[row+1]-2});
    xRows.push(columns.edges);columnGuttersByRow.push(columns.lines);
  }
  return {ys:rows.edges,xRows,diagnostics:{rowGutters:rows.lines,columnGuttersByRow}};
}
