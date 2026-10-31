(function () {
  'use strict';
  var CATEGORIES = ['Food', 'Transport', 'Fun'];
  var MIN_AMOUNT = 0.01;
  var MAX_AMOUNT = 999999999.99;
  var MAX_ITEM_NAME_LENGTH = 100;
  var STORAGE_KEY = 'expense-visualizer:transactions';
  var transactions = [];
  var chartInstance = null;

  function isEmptyOrWhitespace(str){ if(str===null||str===undefined) return true; return String(str).trim().length===0; }
  function isValidAmount(amountStr){ if(isEmptyOrWhitespace(amountStr)) return false; var num=Number(String(amountStr).trim()); if(!isFinite(num)||isNaN(num)) return false; return num>=MIN_AMOUNT && num<=MAX_AMOUNT; }
  function generateId(){ if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function') return crypto.randomUUID(); return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2); }
  function round2(v){ return Math.round(v*100)/100; }
  function formatRp(n){ return 'Rp '+Number(n).toLocaleString('id-ID'); }

  function validateTransaction(input){
    var errors=[]; var itemNameRaw=(input&&input.itemName!=null)?String(input.itemName):''; var amountRaw=(input&&input.amount!=null)?String(input.amount):''; var categoryRaw=(input&&input.category!=null)?String(input.category):'';
    var itemName=itemNameRaw.trim(); var amountStr=amountRaw.trim(); var category=categoryRaw.trim();
    if(isEmptyOrWhitespace(itemNameRaw)) errors.push('Item Name is required.');
    if(isEmptyOrWhitespace(amountRaw)) errors.push('Amount is required.');
    if(isEmptyOrWhitespace(categoryRaw)) errors.push('Category is required.');
    if(errors.length>0) return {valid:false,errors:errors};
    if(itemName.length>MAX_ITEM_NAME_LENGTH) errors.push('Item Name must be 100 characters or fewer.');
    if(!isValidAmount(amountStr)) errors.push('Amount must be a numeric value between 0.01 and 999,999,999.99.');
    if(CATEGORIES.indexOf(category)===-1) errors.push('Category must be Food, Transport, or Fun.');
    if(errors.length>0) return {valid:false,errors:errors};
    return {valid:true,errors:[],transaction:{id:generateId(),itemName:itemName,amount:Number(amountStr),category:category}};
  }

  function addTransaction(t){ transactions.push(t); }
  function deleteTransaction(id){ for(var i=0;i<transactions.length;i++){ if(transactions[i].id===id){ transactions.splice(i,1); return true; }} return false; }
  function getTransactions(){ return transactions.slice(); }
  function computeTotalBalance(list){ var sum=0; for(var i=0;i<list.length;i++) sum+=list[i].amount; return round2(sum); }
  function getTotalBalance(){ return computeTotalBalance(transactions); }
  function getCategoryTotals(){ var totals={Food:0,Transport:0,Fun:0}; for(var i=0;i<transactions.length;i++){ totals[transactions[i].category]+=transactions[i].amount; } totals.Food=round2(totals.Food); totals.Transport=round2(totals.Transport); totals.Fun=round2(totals.Fun); return totals; }
  function aggregateByCategory(list){ var totals={Food:0,Transport:0,Fun:0}; for(var i=0;i<list.length;i++) totals[list[i].category]+=list[i].amount; totals.Food=round2(totals.Food); totals.Transport=round2(totals.Transport); totals.Fun=round2(totals.Fun); return totals; }
  function serializeTransactions(list){ return JSON.stringify(list); }
  function deserializeTransactions(json){ try{ var arr=JSON.parse(json); return Array.isArray(arr)?arr:[]; }catch(e){ return []; } }
  function save(list){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return {success:true}; }catch(e){ return {success:false, error:e.message}; } }
  function load(){ try{ var data=localStorage.getItem(STORAGE_KEY); if(!data) return []; var parsed=JSON.parse(data); return Array.isArray(parsed)?parsed:[]; }catch(e){ return []; } }

  function renderTransactionList(list){
    var listEl=document.getElementById('transaction-list')||document.getElementById('Transaction_List');
    if(!listEl) return; listEl.innerHTML='';
    if(list.length===0){ var empty=document.createElement('div'); empty.textContent='No transactions recorded.'; empty.id='empty-state'; listEl.appendChild(empty); return; }
    for(var i=0;i<list.length;i++){ var t=list[i]; var row=document.createElement('div'); row.className='transaction-row'; row.style.cssText='display:flex;justify-content:space-between;padding:8px;border-left:4px solid #4f46e5;margin-bottom:6px;background:#f9fafb'; row.innerHTML='<span><strong>'+t.itemName+'</strong> - '+formatRp(t.amount)+' - '+t.category+'</span><button class="delete-btn" data-id="'+t.id+'" style="background:#ef4444;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer">Delete</button>'; listEl.appendChild(row); }
  }
  function renderTotalBalance(amount){ var valEl=document.getElementById('total-balance-value')||document.getElementById('total-balance')||document.getElementById('Total_Balance'); if(valEl) valEl.textContent=formatRp(amount); }
  function showError(msg){ var el=document.getElementById('error-region')||document.getElementById('error'); if(el) el.textContent=msg; }
  function clearError(){ var el=document.getElementById('error-region')||document.getElementById('error'); if(el) el.textContent=''; }
  function clearForm(){ var f=document.getElementById('transaction-form')||document.getElementById('expense-form'); if(f&&f.reset) f.reset(); var item=document.getElementById('item-name')||document.getElementById('itemName'); var amt=document.getElementById('amount'); if(item) item.value=''; if(amt) amt.value=''; }

  function getOrCreateCanvas(){
    var canvas = document.getElementById('pie-chart')||document.getElementById('Pie_Chart')||document.getElementById('spending-chart')||document.getElementById('chart')||document.querySelector('canvas');
    if(canvas) return canvas;
    var headings = document.querySelectorAll('*');
    var target = null;
    for(var h=0;h<headings.length;h++){ if(headings[h].textContent && headings[h].textContent.indexOf('Spending Distribution')!==-1){ target=headings[h]; break; } }
    if(target){
      var newCanvas = document.createElement('canvas');
      newCanvas.id='pie-chart'; newCanvas.width=320; newCanvas.height=320;
      newCanvas.style.display='block'; newCanvas.style.margin='10px auto'; newCanvas.style.maxWidth='100%'; newCanvas.style.background='white'; newCanvas.style.border='1px solid #e5e7eb'; newCanvas.style.borderRadius='12px';
      target.parentNode.insertBefore(newCanvas, target.nextSibling);
      var info=document.createElement('div'); info.id='chart-legend'; info.style.textAlign='center'; info.style.marginTop='8px';
      target.parentNode.insertBefore(info, newCanvas.nextSibling);
      return newCanvas;
    }
    return null;
  }

  function drawManualPie(canvas, totals){
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width=320; canvas.height=320;
    var W=320, H=320;
    ctx.clearRect(0,0,W,H);
    var labels=[], data=[], colors=['#2ecc71','#3498db','#e67e22'];
    if(totals.Food>0){ labels.push('Food'); data.push(totals.Food); }
    if(totals.Transport>0){ labels.push('Transport'); data.push(totals.Transport); }
    if(totals.Fun>0){ labels.push('Fun'); data.push(totals.Fun); }
    if(data.length===0){
      ctx.fillStyle='#9ca3af'; ctx.textAlign='center'; ctx.font='16px sans-serif';
      ctx.fillText('No data - add transaction',W/2,H/2); return;
    }
    var total = data.reduce(function(a,b){return a+b;},0);
    var start = -Math.PI/2;
    for(var i=0;i<data.length;i++){
      var slice = (data[i]/total)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.fillStyle=colors[i]; ctx.arc(W/2,H/2,125,start,start+slice); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='white'; ctx.lineWidth=2; ctx.stroke();
      start+=slice;
    }
    var lx = 60; var ly = H - 18;
    for(var j=0;j<labels.length;j++){
      ctx.fillStyle=colors[j]; ctx.fillRect(lx,ly,14,6);
      ctx.fillStyle='#666'; ctx.font='9px Arial'; ctx.textAlign='left';
      ctx.fillText(labels[j],lx+18,ly+6);
      lx+=70;
    }
  }

  function initChart(){
    var canvas = getOrCreateCanvas();
    if(!canvas) return;
    var totals=getCategoryTotals();
    var no=document.getElementById('chart-no-data'); if(no) no.style.display='none';
    var err=document.getElementById('chart-error'); if(err) err.style.display='none';
    if(typeof Chart!=='undefined'){
      try{
        var labels=[], data=[];
        if(totals.Food>0){ labels.push('Food'); data.push(totals.Food); }
        if(totals.Transport>0){ labels.push('Transport'); data.push(totals.Transport); }
        if(totals.Fun>0){ labels.push('Fun'); data.push(totals.Fun); }
        if(data.length===0){ drawManualPie(canvas,totals); return; }
        if(chartInstance) chartInstance.destroy();
        chartInstance=new Chart(canvas, {type:'pie', data:{labels:labels, datasets:[{data:data, backgroundColor:['#2ecc71','#3498db','#e67e22']}]}, options:{responsive:false}});
        return;
      }catch(e){}
    }
    drawManualPie(canvas, totals);
  }
  function updateChart(){ initChart(); }

  function handleSubmit(e){
    e.preventDefault(); clearError();
    var itemEl=document.getElementById('item-name')||document.getElementById('itemName');
    var amtEl=document.getElementById('amount');
    var catEl=document.getElementById('category');
    var result=validateTransaction({itemName:itemEl?itemEl.value:'', amount:amtEl?amtEl.value:'', category:catEl?catEl.value:''});
    if(!result.valid){ showError(result.errors.join(' ')); return; }
    addTransaction(result.transaction); save(transactions);
    renderTransactionList(transactions); renderTotalBalance(getTotalBalance()); updateChart(); clearForm();
  }
  function handleDelete(id){
    if(!confirm('Delete this transaction?')) return;
    var ok=deleteTransaction(id); if(!ok){ showError('Delete failed'); return; }
    save(transactions); renderTransactionList(transactions); renderTotalBalance(getTotalBalance()); updateChart();
  }
  function init(){
    transactions=load(); renderTransactionList(transactions); renderTotalBalance(getTotalBalance()); initChart();
    var form=document.getElementById('transaction-form')||document.getElementById('expense-form'); if(form) form.addEventListener('submit', handleSubmit);
    var list=document.getElementById('transaction-list'); if(list) list.addEventListener('click', function(e){ if(e.target.classList.contains('delete-btn')){ handleDelete(e.target.getAttribute('data-id')); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  if(typeof window!=='undefined'){ window.ExpenseVisualizer={ validateTransaction:validateTransaction, isValidAmount:isValidAmount, isEmptyOrWhitespace:isEmptyOrWhitespace, addTransaction:addTransaction, deleteTransaction:deleteTransaction, getTransactions:getTransactions, computeTotalBalance:computeTotalBalance, getTotalBalance:getTotalBalance, getCategoryTotals:getCategoryTotals, aggregateByCategory:aggregateByCategory, serializeTransactions:serializeTransactions, deserializeTransactions:deserializeTransactions, CATEGORIES:CATEGORIES, save:save, load:load }; }
})();