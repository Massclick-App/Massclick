const C = { navy:"FF102A43", blue:"FF2563EB", orange:"FFF97316", pale:"FFEFF6FF", white:"FFFFFFFF", ink:"FF172033", muted:"FF667085", line:"FFD9E2EC", stripe:"FFF8FAFC", green:"FF16803C" };
const border = { top:{style:"thin",color:{argb:C.line}}, left:{style:"thin",color:{argb:C.line}}, bottom:{style:"thin",color:{argb:C.line}}, right:{style:"thin",color:{argb:C.line}} };
const num = (value) => Number(value || 0);
const rows = (value) => Array.isArray(value) ? value : [];

function reportHeader(sheet, { title, subtitle, days, generated, source, columns, filters = [] }) {
  sheet.mergeCells(1, 1, 1, columns);
  Object.assign(sheet.getCell(1, 1), { value:title, font:{name:"Aptos Display",size:22,bold:true,color:{argb:C.white}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:C.navy}}, alignment:{vertical:"middle",horizontal:"left"} });
  sheet.getRow(1).height = 38;
  sheet.mergeCells(2, 1, 2, columns);
  Object.assign(sheet.getCell(2, 1), { value:subtitle, font:{name:"Aptos",size:10,color:{argb:C.muted}}, alignment:{vertical:"middle",wrapText:true} });
  sheet.getRow(2).height = 26;
  const metadata = columns >= 6
    ? [[1,"REPORTING PERIOD"],[2,`Last ${days} days`],[3,"GENERATED"],[4,generated],[5,"SOURCE"],[6,source]]
    : columns >= 5
      ? [[1,"PERIOD"],[2,`Last ${days} days`],[3,`Generated: ${generated}`],[4,"SOURCE"],[5,source]]
      : [[1,"PERIOD"],[2,`Last ${days} days`],[3,`Generated: ${generated}`]];
  metadata.forEach(([column,value]) => sheet.getCell(3,column).value=value);
  sheet.getRow(3).eachCell((cell,column) => { cell.font={name:"Aptos",size:9,bold:column%2===1,color:{argb:column%2===1?C.blue:C.ink}}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:C.pale}}; cell.alignment={vertical:"middle",horizontal:column%2===1?"center":"left"}; cell.border=border; });
  sheet.getRow(3).height = 24;

  if (filters.length > 0) {
    let col = 1;
    filters.forEach(({ label, value }) => {
      if (col > columns) return;
      sheet.getCell(4, col).value = String(label).toUpperCase();
      sheet.getCell(4, col + 1 <= columns ? col + 1 : col).value = value;
      col += 2;
    });
    sheet.getRow(4).eachCell((cell,column) => { cell.font={name:"Aptos",size:9,bold:column%2===1,color:{argb:column%2===1?C.blue:C.ink}}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:C.stripe}}; cell.alignment={vertical:"middle",horizontal:column%2===1?"center":"left"}; cell.border=border; });
    sheet.getRow(4).height = 22;
  }
}

function styleTable(sheet, headerRow, endRow, numericColumns) {
  sheet.getRow(headerRow).eachCell((cell) => { cell.font={name:"Aptos",size:10,bold:true,color:{argb:C.white}}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:C.blue}}; cell.alignment={vertical:"middle",horizontal:"center",wrapText:true}; cell.border=border; });
  sheet.getRow(headerRow).height=25;
  for(let r=headerRow+1;r<=endRow;r+=1) sheet.getRow(r).eachCell((cell,column)=>{ cell.font={name:"Aptos",size:10,color:{argb:C.ink}}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:r%2===0?C.stripe:C.white}}; cell.alignment={vertical:"middle",horizontal:numericColumns.includes(column)?"right":"left"}; cell.border=border; if(numericColumns.includes(column)) cell.numFmt="#,##0"; });
  sheet.autoFilter={from:{row:headerRow,column:1},to:{row:endRow,column:sheet.getRow(headerRow).cellCount}};
  sheet.views=[{state:"frozen",ySplit:headerRow,showGridLines:false}];
}

function detail(workbook, config) {
  const sheet=workbook.addWorksheet(config.name,{properties:{tabColor:{argb:config.color||C.blue}}});
  reportHeader(sheet,{...config,columns:config.headers.length});
  sheet.getRow(5).values=config.headers;
  const content=rows(config.data);
  content.forEach((item,index)=>sheet.getRow(6+index).values=config.map(item,index));
  if(!content.length){ sheet.mergeCells(6,1,6,config.headers.length); sheet.getCell(6,1).value="No data was available for the selected reporting period."; sheet.getCell(6,1).font={italic:true,color:{argb:C.muted}}; sheet.getCell(6,1).alignment={horizontal:"center"}; }
  styleTable(sheet,5,5+Math.max(content.length,1),config.numeric);
  config.widths.forEach((width,index)=>sheet.getColumn(index+1).width=width);
  sheet.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.25,right:.25,top:.5,bottom:.5,header:.2,footer:.2}};
  sheet.headerFooter.oddFooter=`&LMassClick Analytics&CPage &P of &N&R${config.source}`;
  return sheet;
}

function summary(workbook,{data,days,generated,errors,filters=[]}){
  const sheet=workbook.addWorksheet("Executive Summary",{properties:{tabColor:{argb:C.orange}}});
  reportHeader(sheet,{title:"MassClick Analytics — Executive Summary",subtitle:"Consolidated customer authentication, on-site demand, website engagement, and organic search performance.",days,generated,source:"Customer DB · GA4 · GSC",columns:6,filters});
  const t=data.internal?.totals||{}, ga=data.ga4?.current||{}, gsc=data.gsc?.current||{};
  const content=[
    ["CUSTOMER & AUTHENTICATION","VALUE","INTERPRETATION"],["Registered OTP customers",num(t.otpCustomers),"Verified phone-number customer accounts"],[`New OTP customers — ${days} days`,num(t.otpCustomersRegisteredInPeriod),"Customers registered during the selected period"],[`Unique OTP customers logged in — ${days} days`,num(t.otpCustomersLoggedInInPeriod),"Customers with a successful OTP login during the period"],["Completed profiles",num(t.otpProfilesCompleted),"Customer profiles marked as complete"],["","",""] ,
    ["WEBSITE ENGAGEMENT — GA4","VALUE","INTERPRETATION"],["Active users",num(ga.activeUsers),"Unique engaged website visitors"],["Total users",num(ga.totalUsers),"All website users in the period"],["Sessions",num(ga.sessions),"Website visits"],["Page views",num(ga.pageViews),"Pages viewed across all sessions"],["Engagement rate",num(ga.engagementRate)/100,"Share of sessions classified as engaged"],["","",""] ,
    ["ORGANIC SEARCH — GSC","VALUE","INTERPRETATION"],["Google clicks",num(gsc.clicks),"Visits received from Google Search"],["Google impressions",num(gsc.impressions),"Times MassClick appeared in results"],["Click-through rate",num(gsc.ctr)/100,"Clicks divided by impressions"],["Average position",num(gsc.position),"Average result position; lower is better"],["","",""] ,
    ["ON-SITE DEMAND","VALUE","INTERPRETATION"],["Captured searches",num(t.searches),"Search records currently retained by the application"],["Searches in last 7 days",num(t.searchesLast7Days),"Recent customer demand"]
  ];
  
  content.forEach((values,index)=>sheet.getRow(5+index).values=values);
  const sections=[5,11,18,24];
  content.forEach((values,index)=>{const r=5+index,row=sheet.getRow(r);if(sections.includes(r)){row.height=26;row.eachCell(cell=>{cell.font={name:"Aptos",size:10,bold:true,color:{argb:C.white}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:r===5?C.orange:C.blue}};cell.alignment={vertical:"middle"};cell.border=border;});return;}if(values.every(v=>v===""))return;row.height=23;row.eachCell((cell,column)=>{cell.font={name:"Aptos",size:10,bold:column===2,color:{argb:C.ink}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:r%2?C.white:C.stripe}};cell.alignment={vertical:"middle",horizontal:column===2?"right":"left",wrapText:true};cell.border=border;});row.getCell(2).numFmt=[16,21].includes(r)?"0.00%":"#,##0.##";});
  sheet.getColumn(1).width=43;sheet.getColumn(2).width=18;sheet.getColumn(3).width=64;sheet.views=[{state:"frozen",ySplit:4,showGridLines:false}];sheet.pageSetup={orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:1};sheet.headerFooter.oddFooter="&LMassClick Analytics&CConfidential · Page &P of &N&RExecutive Summary";
  if(errors.length){const r=28;sheet.mergeCells(r,1,r,3);sheet.getCell(r,1).value=`Data availability note: ${errors.join(" | ")}`;sheet.getCell(r,1).font={name:"Aptos",size:9,italic:true,color:{argb:C.muted}};sheet.getCell(r,1).alignment={wrapText:true};}
}

export async function exportAnalyticsWorkbook({data,days,filters=[],sections=["categories","visitorLocations","customerLocations","queries"],errors=[]}){
  const {Workbook}=await import("exceljs");
  const workbook=new Workbook();
  Object.assign(workbook,{creator:"MassClick Analytics",company:"MassClick",subject:`Unified analytics — last ${days} days`,title:"MassClick Unified Analytics",created:new Date(),modified:new Date()});
  workbook.calcProperties.fullCalcOnLoad=true;
  const generated=new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}), shared={days,generated};
  summary(workbook,{data,days,generated,errors,filters});

  const hasSection = (key) => sections.includes(key);
  if (hasSection("categories")) {
    detail(workbook,{...shared,name:"Category Demand",title:"Most Searched Categories",subtitle:"Category searches made by signed-in phone/OTP customers.",source:"MassClick Customer DB",headers:["Rank","Category","Searches"],data:data.filteredCategories || data.internal?.otpTopSearchCategories,map:(r,i)=>[i+1,r.name||"General",num(r.count)],numeric:[1,3],widths:[10,42,18],color:C.orange});
  }

  if (hasSection("visitorLocations")) {
    detail(workbook,{...shared,name:"Visitor Locations",title:"Website Visitor Locations",subtitle:"Top cities by GA4 sessions for the selected period.",source:"Google Analytics 4",headers:["Rank","City","Country","Sessions","Active Users"],data:data.filteredVisitorLocations || data.cities,map:(r,i)=>[i+1,r.city||"Unknown",r.country||"Unknown",num(r.sessions),num(r.activeUsers)],numeric:[1,4,5],widths:[10,30,24,18,18]});
  }

  if (hasSection("customerLocations")) {
    detail(workbook,{...shared,name:"Customer Locations",title:"Customer Search Locations",subtitle:"Locations selected by signed-in customers while searching.",source:"MassClick Customer DB",headers:["Rank","Location","Searches"],data:data.filteredCustomerSearchLocations || data.internal?.otpTopSearchLocations,map:(r,i)=>[i+1,r.name||"Global",num(r.count)],numeric:[1,3],widths:[10,42,18],color:C.green});
  }

  if (hasSection("queries")) {
    detail(workbook,{...shared,name:"Google Queries",title:"Google Search Queries",subtitle:"Organic queries that generated visibility and traffic.",source:"Google Search Console",headers:["Rank","Search Query","Clicks","Impressions","CTR","Avg. Position"],data:data.filteredGoogleQueries || data.queries,map:(r,i)=>[i+1,r.query||"Unknown",num(r.clicks),num(r.impressions),num(r.ctr)/100,num(r.position)],numeric:[1,3,4,5,6],widths:[10,48,14,18,14,16]});
    const querySheet=workbook.getWorksheet("Google Queries");
    if (querySheet) {
      for(let r=6;r<=5+rows(data.filteredGoogleQueries || data.queries).length;r+=1) querySheet.getCell(r,5).numFmt="0.00%";
    }
  }

  const buffer=await workbook.xlsx.writeBuffer();
  const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=`MassClick_Analytics_${String(days).padStart(2,"0")}days_${new Date().toISOString().slice(0,10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
